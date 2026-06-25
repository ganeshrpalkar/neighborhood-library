# Neighborhood Library Service — Agent Instructions

This file is read by OpenAI Codex CLI, OpenCode, and compatible AI coding agents.

## Project

A FastAPI REST API + Next.js frontend for a small neighborhood library to manage
members, books, and lending (borrow/return). Backed by PostgreSQL. Deploy target:
AWS (ECS Fargate + RDS + ElastiCache + S3/CloudFront) via GitHub Actions + Terraform.

- Package manager: **`uv`** (never use `pip` directly)
- Python: 3.12+
- Lock file: `uv.lock` — committed, always kept in sync

## Stack

FastAPI + Uvicorn/Gunicorn · PostgreSQL 16 (SQLAlchemy 2.0 **sync** ORM + Alembic) ·
Redis (cache + Celery broker) · HS256 JWT (`python-jose`) + `bcrypt` ·
Celery · Next.js frontend.

## Data Model (PostgreSQL, normalized, integer PKs)

- `members(id, name, email UNIQUE, phone, address, is_active, created_at, updated_at)`
- `books(id, title, author, isbn UNIQUE, publisher, published_year, genre, total_copies, available_copies, created_at, updated_at)`
- `loans(id, book_id FK→books, member_id FK→members, borrowed_at, due_date, returned_at NULL, status[active|returned|overdue], fine_amount, created_at, updated_at)`

`members` 1—N `loans`; `books` 1—N `loans`. `due_date = borrowed_at + 14 days`.
Overdue when `returned_at IS NULL AND due_date < now`.

**Business rules:** borrow when `available_copies == 0` → `ConflictError(409)`; missing
book/member → `NotFoundError(404)`; returning an already-returned loan → `ConflictError(409)`;
duplicate email/ISBN → `ConflictError`. Borrow decrements `available_copies`, return
increments — both must be **atomic**.

## Running Commands

```bash
uv run pytest tests/unit/ -q           # Unit tests (no DB)
uv run pytest tests/contract/ -q       # Contract tests (needs Postgres + Redis running)
uv run ruff check app/ tests/          # Lint
uv run ruff format app/ tests/         # Format
uv run mypy app/                       # Type check
docker compose up postgres redis -d    # Start databases
make migrate                           # Apply Alembic migrations
make migration m="add loans table"     # Autogenerate a migration
```

## Code Standards

### Module structure (enforce strictly) — `app/api/v1/<module>/`
- `schemas.py` — Pydantic v2 models only (`ConfigDict(from_attributes=True)`); no logic, no `fastapi` imports
- `models.py` — SQLAlchemy 2.0 ORM (`Mapped` / `mapped_column` + relationships)
- `services.py` — Business logic; accepts `db: Session`; **never** imports from `fastapi`; raises only `app.core.exceptions`
- `router.py` — HTTP layer only; calls services; declares `response_model=`; never contains business logic

Register the router in `app/api/v1/router.py` and add an Alembic migration for any schema change.
Canonical reference template module: `app/api/v1/books/` (it has `schemas.py`, `models.py`,
`services.py`, `router.py`). Other domain modules: `members/`, `loans/`.

### Type hints
All function signatures must have complete type hints:
```python
def borrow_book(db: Session, book_id: int, member_id: int) -> Loan:
```

### Error handling
Always raise from the exception hierarchy, never bare `HTTPException`:
```python
from app.core.exceptions import NotFoundError, AccessDeniedError, ConflictError
raise NotFoundError("book not found")        # → 404
raise ConflictError("no copies available")   # → 409
```

### Environment variables
All settings go in `app/core/config.py` as `Settings` class fields. Never read `os.environ` directly.

## Authentication

HS256 JWT via `app.core.security.jwt`:
- `get_current_user` — requires valid Bearer token, returns `UserContext`
- `get_optional_user` — returns `None` if no/invalid token
- `require_admin()` — `Depends` factory for admin-only routes
- `UserContext`: `user_id`, `email`, `roles`, `is_authenticated`, `is_admin`

## Database Access

`app/core/database/postgres.py` provides `engine`, `SessionLocal`, `Base`, and the
`get_session()` dependency (Session per request, commit on success, rollback + close on error).
Services accept `db: Session` and use the SQLAlchemy 2.0 API:

```python
from sqlalchemy import select, func
from sqlalchemy.orm import Session

book = db.get(Book, book_id)                              # int PK → obj | None
books = db.scalars(select(Book).offset(skip).limit(limit)).all()
total = db.scalar(select(func.count()).select_from(Book))
db.add(book); db.commit(); db.refresh(book)               # insert
db.delete(book); db.commit()                              # delete
```

Wire it in routers with `db: Session = Depends(get_session)`. Path IDs are integers.
An optional generic CRUD base lives in `app/core/database/repository.py`.

## Testing Standards

- New routes require at least one contract test
- New service functions require at least one unit test
- Mark contract tests: `@pytest.mark.contract`
- Mutation tests (write/delete): `@pytest.mark.mutation`
- Use `seeded_user` fixture for authenticated contract tests

## Before Submitting

1. `uv run pytest tests/unit/ tests/properties/ -q` — all pass
2. `uv run ruff check app/ tests/` — no errors
3. `uv run mypy app/` — no type errors
4. `uv.lock` updated if `pyproject.toml` changed
5. Alembic migration added for any model/schema change
6. No `.env` file committed — only `.env.template`

## Files to Never Modify

- `uv.lock` (auto-generated by `uv lock`)
- `.env` (local only, not committed)
- `app/core/database/postgres.py` (engine/session internals) unless fixing a bug
