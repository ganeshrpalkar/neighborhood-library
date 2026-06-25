# Neighborhood Library Service

## Project Overview

A REST API + minimal web frontend for a small neighborhood library to manage its
**members**, **books**, and **lending operations** (borrow / return). Built on a
production-ready FastAPI stack: PostgreSQL + Redis + Celery + HS256 JWT, deployed to
AWS (ECS Fargate + RDS + ElastiCache + S3/CloudFront) via GitHub Actions + Terraform.

### Core capabilities (functional requirements)
- Create / update records for **books** and **members**.
- Record when a member **borrows** a book.
- Record when a borrowed book is **returned**.
- Query / list borrowed books (e.g. all books a given member currently has out, all
  overdue loans).
- Extras: due dates, overdue detection, and fine tracking.

The `app/api/v1/books/` module is the canonical reference CRUD implementation — copy its
structure (it has `schemas.py`, `models.py`, `services.py`, `router.py`) to build the other
library domain modules (`members`, `loans`). See `docs/ADDING_AN_API.md` for the full recipe.

## Stack

| Layer | Technology |
|-------|-----------|
| API | FastAPI 0.115+ + Uvicorn + Gunicorn (**REST**, no gRPC) |
| Database | **PostgreSQL 16** via SQLAlchemy 2.0 (sync ORM) + Alembic migrations |
| Cache | Redis — two pools (decoded strings + binary) |
| Auth | HS256 JWT (`python-jose`) + `bcrypt` |
| Tasks | Celery with Redis broker (overdue-reminder / fine-recalc jobs) |
| Packages | `uv` — `pyproject.toml` + committed `uv.lock` |
| Testing | pytest: unit / property (Hypothesis) / contract tiers |
| CI/CD | GitHub Actions → ECR → ECS Fargate (AWS OIDC, no static keys) |
| IaC | Terraform (AWS: VPC · ECS Fargate · RDS · ElastiCache · S3+CloudFront) |
| Frontend | Next.js (React) static export → S3 + CloudFront; staff UI in `frontend/` |

## Data Model (PostgreSQL schema)

Three core tables, fully normalized, joined by foreign keys:

```
members                books                     loans
───────                ─────                     ─────
id            PK       id              PK        id            PK
name                   title                     book_id       FK → books.id
email   UNIQUE         author                    member_id     FK → members.id
phone                  isbn      UNIQUE          borrowed_at
address                publisher                 due_date
membership_date        published_year            returned_at   NULL until returned
is_active              genre                     status        active|returned|overdue
created_at             total_copies              fine_amount
updated_at             available_copies          created_at
                       created_at                updated_at
                       updated_at
```

Relationships:
- `members` 1 ─── N `loans` (a member can have many loans)
- `books`   1 ─── N `loans` (a book title can be lent many times across copies)

Inventory rule: each book tracks `total_copies` and `available_copies`.
Borrowing decrements `available_copies`; returning increments it.

Business rules (enforced in services, surfaced as typed exceptions):
- Borrow a book with `available_copies == 0` → `ConflictError` (409).
- Borrow/return referencing a missing book or member → `NotFoundError` (404).
- Return a loan that is already returned → `ConflictError` (409).
- `due_date` defaults to `borrowed_at + 14 days`.
- A loan is **overdue** when `returned_at is NULL and due_date < now()`; fine accrues per
  overdue day (configurable rate).

## Project Layout

```
app/
├── main.py                 # App factory, lifespan context, middleware stack
├── api/v1/
│   ├── router.py           # Register all domain routers here (include_router)
│   ├── books/              # Reference CRUD module — copy this to add new ones
│   │   ├── schemas.py      # Pydantic models — API shape only, no logic
│   │   ├── models.py       # SQLAlchemy ORM models — table definitions
│   │   ├── services.py     # Business logic — takes a Session, no HTTP objects
│   │   └── router.py       # Route handlers — call services, no business logic
│   ├── members/            # Member CRUD
│   └── loans/              # Borrow / return / list-outstanding
└── core/
    ├── config.py           # Pydantic BaseSettings, all env vars
    ├── exceptions.py       # AppError → NotFoundError / AccessDeniedError / ConflictError
    ├── security/
    │   ├── jwt.py          # UserContext, create_access_token, get_current_user
    │   └── permissions.py  # require_admin(), require_roles() Depends factories
    ├── database/
    │   ├── postgres.py     # engine, SessionLocal, Base, get_session() dependency
    │   ├── repository.py   # Generic SQLAlchemy CRUD repository (optional base)
    │   └── redis.py        # Two Redis pools + cache_key() helper
    ├── cache/
    │   └── redis_cache.py  # @redis_cache_response decorator with compression
    ├── middleware/
    │   ├── cors_reflect.py       # Fixes preflight header mismatch
    │   └── logging_middleware.py # Structured request/response logging, SENSITIVE_KEYS masking
    └── observability/
        └── context.py      # correlation_id, user contextvars

alembic/                    # Migration environment + versions
frontend/                   # Next.js staff UI (members, books, loans pages)
tests/
├── unit/        # No DB, pure logic
├── properties/  # Hypothesis generative
└── contract/    # Requires live PostgreSQL + Redis (docker compose up postgres redis -d)
```

## API Surface (REST)

```
# Auth
POST   /api/v1/auth/register          → 201 UserResponse
POST   /api/v1/auth/token             → TokenResponse

# Books
GET    /api/v1/books                  → list / search books (paginated)
POST   /api/v1/books                  → 201 create book
GET    /api/v1/books/{book_id}        → book detail
PATCH  /api/v1/books/{book_id}        → update book

# Members
GET    /api/v1/members                → list members (paginated)
POST   /api/v1/members                → 201 create member
GET    /api/v1/members/{member_id}    → member detail
PATCH  /api/v1/members/{member_id}    → update member

# Loans (lending operations)
POST   /api/v1/loans                  → 201 borrow a book   {book_id, member_id}
POST   /api/v1/loans/{loan_id}/return → record a return
GET    /api/v1/loans                  → list loans; filter ?member_id= ?status=active|overdue
GET    /api/v1/members/{member_id}/loans → books a member currently has out
```

## AI Tooling (skills + MCP)

This repo ships Claude Code **skills** (`.claude/skills/`), **subagents**
(`.claude/agents/`), and **MCP servers** (`.mcp.json`). See `docs/AI_TOOLING.md`.
- Start tasks with the `efficient-context` skill — it minimizes token usage (consult docs
  first, locate before reading, delegate fan-out to the Explore subagent).
- Skills: `efficient-context`, `add-api-module`, `run-tests`, `pre-pr-checks`.
- Subagents: `backend-developer`, `postgres-expert`, `test-writer`, `devops-helper`,
  `security-reviewer`.
- MCP: `postgres` (read-only), `context7` (library docs), `fetch`, `github`. Set
  `POSTGRES_MCP_URL` (plain libpq URL) to point the Postgres MCP server at your dev database.

## Common Commands

```bash
uv sync                              # Install all dependencies (reads uv.lock)
make dev                             # uvicorn --reload on :8000
make test                            # Unit + property tests (no DB)
docker compose up postgres redis -d  # Start DBs for contract tests
make migrate                         # alembic upgrade head
make test-contract                   # Contract tests against live DB
make test-all                        # All tiers
make lint                            # ruff check + mypy
make format                          # ruff format
docker compose up -d                 # Full local stack (api + worker + postgres + redis)
make coverage                        # Run tests with HTML coverage report
```

## Key Patterns

### Adding a new domain module
Copy `app/api/v1/books/` as the template (it has `schemas.py`, `models.py`, `services.py`,
`router.py`) and enforce this contract:
- `schemas.py` — Pydantic models only, no business logic, no DB imports
- `models.py` — SQLAlchemy ORM models (table + columns + relationships)
- `services.py` — accepts a SQLAlchemy `Session`; returns ORM objects or dicts;
  **never** raises `HTTPException`; **never** imports from `fastapi`
- `router.py` — HTTP concerns only; calls services; formats responses
- Register the router in `app/api/v1/router.py`
- Add an Alembic migration for the new table(s): `uv run alembic revision --autogenerate -m "add books"`

### Auth
```python
from app.core.security.jwt import get_current_user, get_optional_user, UserContext

@router.get("/protected")
def protected(current_user: UserContext = Depends(get_current_user)):
    return {"user_id": current_user.user_id, "is_admin": current_user.is_admin}

# UserContext fields: user_id (str), email (str), roles (list[str]), is_authenticated (bool)
# current_user.is_admin → "admin" in roles
```

Auth endpoints: `POST /api/v1/auth/register` → 201 UserResponse,
`POST /api/v1/auth/token` → TokenResponse. Library staff use these to obtain a JWT.

### Caching
```python
@router.get("/")
@redis_cache_response(ttl=120, cache_key_prefix="book_list")
def list_books(request: Request, ...):  # request MUST be the first positional arg
    ...
# Cache key is scoped to the authenticated user automatically
# Payloads >4 KB are zlib-compressed automatically
# TTL has random jitter (±10%) to prevent cache stampede
```

To build a key manually, use `cache_key(prefix, *parts)` from `app.core.database.redis` —
parts are **positional**, not keyword args:
```python
from app.core.database.redis import cache_key
key = cache_key("book_list", user_id, str(page))   # → "app:book_list:{user_id}:{page}"
```

### Database access (SQLAlchemy 2.0)
Services receive a `Session` via the `get_session` dependency and use the SQLAlchemy 2.0
`select()` API. Single-row lookups use `session.get(Model, pk)`; lists use `scalars()`.

```python
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.api.v1.books.models import Book

# Single row by primary key — returns the ORM object or None
book = db.get(Book, book_id)
if book is None:
    raise NotFoundError(f"book {book_id} not found")

# Paginated list + total count
stmt = select(Book).order_by(Book.created_at.desc()).offset(skip).limit(limit)
books = db.scalars(stmt).all()
total = db.scalar(select(func.count()).select_from(Book))

# Insert
book = Book(title=data["title"], author=data["author"], total_copies=n, available_copies=n)
db.add(book)
db.commit()
db.refresh(book)

# Update
book.title = new_title
db.commit()

# Delete
db.delete(book)
db.commit()
```

The router wires the session in with `db: Session = Depends(get_session)`. The dependency
opens a session per request, commits on success, and rolls back + closes on error.

### Transactional lending (borrow/return)
Borrow and return mutate two rows (the `loan` and the book's `available_copies`) and must
be atomic — do both in one session/transaction and commit once:
```python
def borrow_book(db: Session, book_id: int, member_id: int) -> Loan:
    book = db.get(Book, book_id)
    if book is None:
        raise NotFoundError(f"book {book_id} not found")
    if book.available_copies < 1:
        raise ConflictError(f"'{book.title}' has no available copies")
    if db.get(Member, member_id) is None:
        raise NotFoundError(f"member {member_id} not found")
    book.available_copies -= 1
    loan = Loan(book_id=book_id, member_id=member_id, status="active")
    db.add(loan)
    db.commit()         # both writes commit together
    db.refresh(loan)
    return loan
```

### Exceptions
```python
from app.core.exceptions import NotFoundError, AccessDeniedError, ConflictError, ValidationError

raise NotFoundError("book not found")           # → 404
raise AccessDeniedError("staff only")           # → 403
raise ConflictError("no copies available")      # → 409
raise ValidationError("invalid ISBN")           # → 422
# All handled by exception handlers in main.py — never raise bare HTTPException in services
```

### Celery tasks
```python
# app/api/v1/loans/tasks.py
from app.core.celery_app import celery_app

@celery_app.task
def flag_overdue_loans() -> dict:
    # mark active loans past due_date as overdue, recompute fines
    ...
# Called as: flag_overdue_loans.delay()
```

## Environment Variables

See `.env.template` for all variables. Minimum for local dev:
```
DATABASE_URL=postgresql+psycopg://library:library@localhost:5432/library
JWT_SECRET_KEY=dev-secret-not-for-production
REDIS_URL=redis://localhost:6379/1
```

Required in production: `SECRET_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`.
Generate secrets: `openssl rand -hex 32`

## Testing

| Tier | Command | DB Required | Markers |
|------|---------|-------------|---------|
| Unit | `make test-unit` | No | — |
| Property | `make test-property` | No | `@pytest.mark.property` |
| Smoke | `uv run pytest tests/test_startup_smoke.py` | No | — |
| Contract | `make test-contract` | PostgreSQL + Redis | `@pytest.mark.contract` |

Contract fixtures (`seeded_user`): creates a test staff user + JWT in PostgreSQL, cleaned
up after the session. Use a transactional rollback fixture so each contract test starts
from a clean schema.
Mutation tests (`@pytest.mark.mutation`): excluded from read-only CI runs — they
write/delete data.

## Hard Rules

1. **Services never import from `fastapi`** — no `HTTPException`, no `Request`, no `Depends`
2. **Routers contain no business logic** — call services, format HTTP responses
3. **All env vars go in `app/core/config.py`** — never read `os.environ` directly elsewhere
4. **`uv.lock` is committed** — run `uv lock` after every `pyproject.toml` change
5. **Never commit `.env`** — update `.env.template` instead
6. **Exception hierarchy** — always raise from `app.core.exceptions`, not bare `HTTPException`
7. **Cache keys must use `cache_key()`** from `app.core.database.redis` for prefix consistency
8. **Schema changes go through Alembic** — never hand-edit tables; autogenerate + review the migration
9. **Borrow/return must be atomic** — mutate loan + book inventory in one committed transaction

## Deployment

A complete AWS stack, all defined in Terraform (`terraform/`). No VPS, no SSH, no nginx.

- **Terraform** provisions everything: VPC, ECS Fargate (api + worker), RDS PostgreSQL,
  ElastiCache Redis, ALB, ECR, S3+CloudFront (frontend), Route53/ACM, Secrets Manager,
  and the GitHub OIDC deploy role. See `terraform/README.md` and `docs/TERRAFORM.md`.
- **GitHub Actions** (`deploy.yml`): assumes the AWS role via **OIDC** → builds/pushes
  images to **ECR** → runs Alembic migrations as a one-off ECS task → rolls the ECS
  services → builds the Next.js static export and syncs it to **S3** + invalidates CloudFront.
- **GitHub repo variables** (not SSH secrets) drive CI — set them from `terraform output`:
  `AWS_REGION`, `AWS_DEPLOY_ROLE_ARN`, `ECR_API_REPO`, `ECR_WORKER_REPO`, `ECS_CLUSTER`,
  `ECS_API_SERVICE`, `ECS_WORKER_SERVICE`, `API_TASK_DEF_FAMILY`, `WORKER_TASK_DEF_FAMILY`,
  `ECS_SUBNETS`, `ECS_SECURITY_GROUP`, `FRONTEND_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`,
  `NEXT_PUBLIC_API_URL`.
- **Manual deploy**: re-run the `Deploy` workflow (or `aws ecs update-service … --force-new-deployment`).
- Full guide: `docs/DEPLOYMENT.md`
