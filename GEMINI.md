# Neighborhood Library Service — Gemini CLI Configuration

## Project Context

A FastAPI REST API + Next.js frontend for a small library to manage members, books, and
lending (borrow/return). Stack: PostgreSQL 16 (SQLAlchemy 2.0 sync ORM + Alembic) + Redis +
Celery + HS256 JWT. Python 3.12, `uv` package manager.

### Data model (PostgreSQL, integer PKs)
- `members` 1—N `loans`; `books` 1—N `loans`
- Borrow decrements `books.available_copies`; return increments — both **atomic**
- `due_date = borrowed_at + 14 days`; overdue when `returned_at IS NULL AND due_date < now`
- No copies → `ConflictError(409)`; missing book/member → `NotFoundError(404)`

## Language and Style

- Python 3.12+ with strict type hints on all function signatures
- No inline comments explaining what code does — only why (non-obvious constraints)
- Docstrings only when the function contract is not obvious from the signature
- Line length: 120 characters (matches `ruff` config)

## Code Generation Defaults

### Function signatures
```python
def borrow_book(db: Session, book_id: int, member_id: int) -> Loan:
    ...
```

### Pydantic models (v2)
```python
from pydantic import BaseModel, ConfigDict

class BookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    available_copies: int
```

### SQLAlchemy 2.0 ORM models
```python
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database.postgres import Base

class Book(Base):
    __tablename__ = "books"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    available_copies: Mapped[int] = mapped_column(default=1)
```

### FastAPI routes
```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database.postgres import get_session

router = APIRouter()

@router.get("/", response_model=PaginatedBooks)
def list_books(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> PaginatedBooks:
    ...
```

## Architecture Rules

1. Services accept `db: Session`, return ORM objects / dataclasses — never `JSONResponse` or `HTTPException`
2. Services never import from `fastapi`; routers never contain business logic
3. All configuration via `app/core/config.py` (Pydantic BaseSettings)
4. Exceptions: always raise from `app.core.exceptions` hierarchy
5. Schema changes go through Alembic migrations — never alter tables by hand

## Testing Defaults

When generating tests:
- Unit tests go in `tests/unit/` — no DB, no HTTP
- Contract tests go in `tests/contract/` with `@pytest.mark.contract` (needs Postgres + Redis)
- Use `seeded_user` fixture for auth in contract tests
- Test file naming: `test_{module_name}.py`

## Running and Verifying

```bash
uv run pytest tests/unit/ -q         # Verify unit tests
uv run ruff check app/               # Verify lint
uv run mypy app/                     # Verify types
docker compose up postgres redis -d  # Start databases
make migrate                         # Apply Alembic migrations
```

## Dependencies

Add new packages via `pyproject.toml`, then run `uv lock`. Never suggest `pip install`.

## Do Not Generate

- Comments that explain what code does (the code should be self-documenting)
- `try/except Exception` catch-all blocks
- Hardcoded credentials or secrets
- Direct `os.environ` reads outside `config.py`
- Business logic inside router functions
- Raw SQL or hand-edited schema changes that bypass Alembic
