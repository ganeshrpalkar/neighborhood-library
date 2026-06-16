# Architecture

## Application structure

```
app/
├── main.py                    # App factory, lifespan, exception handlers
├── api/
│   ├── deps.py                # Shared FastAPI dependencies
│   └── v1/
│       ├── router.py          # Aggregates all module routers
│       ├── books/             # Reference template module (copy this) — Books domain
│       │   ├── router.py      # Route definitions + auth endpoints
│       │   ├── services.py    # Business logic
│       │   ├── models.py      # SQLAlchemy 2.0 ORM models
│       │   └── schemas.py     # Pydantic request/response models
│       ├── members/           # Members domain module
│       └── loans/             # Loans (borrow/return) domain module
├── core/
│   ├── config.py              # Pydantic BaseSettings — all env vars
│   ├── exceptions.py          # AppError hierarchy
│   ├── logging_setup.py       # JSON logging + LoggingContext
│   ├── limiter.py             # SlowAPI rate limiter
│   ├── celery_app.py          # Celery bootstrap
│   ├── database/
│   │   ├── postgres.py        # engine, SessionLocal, Base, get_session()
│   │   ├── redis.py           # Redis pools, startup/shutdown
│   │   └── repository.py      # Optional generic CRUD base
│   ├── cache/
│   │   └── redis_cache.py     # @redis_cache_response decorator
│   ├── security/
│   │   ├── jwt.py             # HS256 JWT auth, UserContext, dependencies
│   │   └── permissions.py     # Role-based access factories
│   ├── middleware/
│   │   ├── cors_reflect.py    # Reflect preflight headers
│   │   └── logging_middleware.py # Request/response structured logging
│   └── utils/
│       └── retry.py           # Exponential backoff retry decorator
└── services/
    └── email_service.py       # Email stub
```

## Three-tier module layout

Each domain module (`books/`, `members/`, `loans/`) follows a strict three-tier
contract, with `app/api/v1/books/` serving as the canonical reference module:

| Tier | File | Responsibility | Hard rule |
|------|------|----------------|-----------|
| **Router** | `router.py` | HTTP only — path/query params, `response_model=`, dependency wiring | No business logic |
| **Service** | `services.py` | Business logic, takes `db: Session`, returns ORM objects/dicts | Never imports `fastapi`; raises only `app.core.exceptions` |
| **Model** | `models.py` | SQLAlchemy 2.0 ORM tables (`Base` subclasses) | Schema changes go through Alembic |
| **Schema** | `schemas.py` | Pydantic v2 models, `ConfigDict(from_attributes=True)` | Shape only, no logic |

## Request flow

```
Client Request
     │
     ▼
CORSMiddleware          → validates Origin, adds Access-Control headers
     │
     ▼
CorsReflectHeadersMiddleware  → reflects Access-Control-Request-Headers on preflight
     │
     ▼
LoggingMiddleware       → assigns correlation ID, logs request/response
     │
     ▼
Rate Limiter (SlowAPI)  → optional, checks per-IP request rate
     │
     ▼
Route Handler           → resolves JWT → UserContext via Depends(get_current_user)
     │                     opens a Session via Depends(get_session)
     ▼
@redis_cache_response   → GET routes: check Redis → serve cached or execute
     │
     ▼
services.py             → business logic using the SQLAlchemy Session
     │
     ▼
get_session()           → commit on success / rollback + close on error
     │
     ▼
PostgreSQL              → relational tables via SQLAlchemy 2.0 ORM
```

## Lifespan sequence (startup)

```python
setup_logging()          # configure JSON log handlers
startup_postgres()       # init engine + SessionLocal, verify connectivity
startup_redis()          # init UTF-8 + binary Redis pools
# (cache warming can be enabled here)
```

## Data stores

| Store | Role | Connection |
|-------|------|------------|
| PostgreSQL | Primary relational data (members, books, loans) | SQLAlchemy `engine` + `SessionLocal`, one `Session` per request |
| Redis | Response cache + Celery broker + auth tokens | Two pools: decoded + binary |

## PostgreSQL layer

`app/core/database/postgres.py` is the single data access surface. It exposes:

- `engine` — the SQLAlchemy engine (pool sized by `DB_POOL_SIZE` / `DB_MAX_OVERFLOW`).
- `SessionLocal` — a configured `sessionmaker`.
- `Base` — the declarative base all ORM models extend.
- `get_session()` — a FastAPI dependency yielding a `Session` scoped to the
  request: it **commits on success**, and **rolls back + closes on error**.

Services accept `db: Session` (`sqlalchemy.orm.Session`) and use the
SQLAlchemy 2.0 API:

```python
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.api.v1.books.models import Book
from app.core.exceptions import NotFoundError


def get_book(db: Session, book_id: int) -> Book:
    book = db.get(Book, book_id)          # primary-key lookup → obj | None
    if book is None:
        raise NotFoundError("book not found")
    return book


def list_books(db: Session, skip: int = 0, limit: int = 10):
    rows = db.scalars(select(Book).offset(skip).limit(limit)).all()
    total = db.scalar(select(func.count()).select_from(Book))
    return rows, total


def create_book(db: Session, data: dict) -> Book:
    book = Book(**data)
    db.add(book)
    db.commit()
    db.refresh(book)
    return book
```

Routers wire the session with `db: Session = Depends(get_session)`. Path IDs
are integers (`book_id: int`, `member_id: int`, `loan_id: int`). An optional
generic CRUD base lives in `app/core/database/repository.py`.

### Atomic borrow / return

Borrow and return mutate **two** rows in a single committed transaction — the
`loans` row and the parent `books.available_copies` counter:

```python
def borrow(db: Session, book_id: int, member_id: int) -> Loan:
    book = db.get(Book, book_id)
    if book is None:
        raise NotFoundError("book not found")
    if book.available_copies == 0:
        raise ConflictError("no copies available")
    loan = Loan(book_id=book_id, member_id=member_id,
                due_date=now() + timedelta(days=14), status="active")
    book.available_copies -= 1
    db.add(loan)
    db.commit()                # one transaction: loan insert + counter decrement
    db.refresh(loan)
    return loan
```

## Data model

PostgreSQL, normalized, integer primary keys.

```
members ──1───N── loans ──N───1── books
```

### `members`
| Column | Notes |
|--------|-------|
| `id` | PK |
| `name` | |
| `email` | UNIQUE |
| `phone` | |
| `address` | |
| `is_active` | |
| `created_at`, `updated_at` | timestamps |

### `books`
| Column | Notes |
|--------|-------|
| `id` | PK |
| `title`, `author` | |
| `isbn` | UNIQUE |
| `publisher`, `published_year`, `genre` | |
| `total_copies` | |
| `available_copies` | decremented on borrow, incremented on return |
| `created_at`, `updated_at` | timestamps |

### `loans`
| Column | Notes |
|--------|-------|
| `id` | PK |
| `book_id` | FK → `books.id` |
| `member_id` | FK → `members.id` |
| `borrowed_at` | |
| `due_date` | `borrowed_at + 14 days` |
| `returned_at` | NULL until returned |
| `status` | `active` \| `returned` \| `overdue` |
| `fine_amount` | |
| `created_at`, `updated_at` | timestamps |

Relationships: a member has many loans; a book has many loans. A loan is
**overdue** when `returned_at IS NULL AND due_date < now()`.

## Caching

The `@redis_cache_response` decorator caches GET route responses:

```python
@router.get("/")
@redis_cache_response(ttl=120, cache_key_prefix="book_list")
def list_books(request: Request, current_user: UserContext = Depends(...)):
    ...
```

Cache keys are scoped per user and include query parameters. Payloads > 4KB are zlib-compressed.

## Background tasks (Celery)

Tasks are defined in module `tasks.py` files and auto-discovered:

```python
# app/api/v1/loans/tasks.py
from app.core.celery_app import celery_app

@celery_app.task
def mark_overdue_loans():
    ...
```

In production, the API and worker run as separate containers from `Dockerfile` and `Dockerfile.worker`.

## Exception handling

All domain errors extend `AppError` and are mapped to HTTP status codes in `main.py`:

| Exception | HTTP Status |
|-----------|-------------|
| `NotFoundError` | 404 |
| `AccessDeniedError` | 403 |
| `ConflictError` | 409 |
| `ValidationError` | 422 |
| Unhandled `Exception` | 500 |
