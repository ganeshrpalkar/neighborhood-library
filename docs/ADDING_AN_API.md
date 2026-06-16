# Adding a New API Module

Follow this recipe to add a new domain module (e.g. `members`, `loans`).
The canonical reference template is `app/api/v1/books/` — copy its structure
(`schemas.py`, `models.py`, `services.py`, `router.py`). The example below walks
through the `books` module itself.

## Step 1: Create the module directory

```bash
mkdir -p app/api/v1/books
touch app/api/v1/books/__init__.py
```

## Step 2: Define the ORM model

Create `app/api/v1/books/models.py`:

```python
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database.postgres import Base


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    author: Mapped[str] = mapped_column(String, nullable=False)
    isbn: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    publisher: Mapped[str | None] = mapped_column(String)
    published_year: Mapped[int | None] = mapped_column(Integer)
    genre: Mapped[str | None] = mapped_column(String)
    total_copies: Mapped[int] = mapped_column(Integer, default=1)
    available_copies: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
```

## Step 3: Define Pydantic schemas

Create `app/api/v1/books/schemas.py` (Pydantic v2 only):

```python
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class BookCreate(BaseModel):
    title: str
    author: str
    isbn: str
    publisher: Optional[str] = None
    published_year: Optional[int] = None
    genre: Optional[str] = None
    total_copies: int = 1


class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    genre: Optional[str] = None
    total_copies: Optional[int] = None


class BookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    author: str
    isbn: str
    publisher: Optional[str] = None
    published_year: Optional[int] = None
    genre: Optional[str] = None
    total_copies: int
    available_copies: int
    created_at: Optional[datetime] = None


class PaginatedBooks(BaseModel):
    books: List[BookResponse]
    total: int
    page: int
    page_size: int
```

## Step 4: Write service functions

Create `app/api/v1/books/services.py` — takes a `Session`, never imports
`fastapi`, raises only from `app.core.exceptions`:

```python
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.v1.books.models import Book
from app.core.exceptions import ConflictError, NotFoundError


def list_books(db: Session, page: int = 1, page_size: int = 10):
    skip = (page - 1) * page_size
    rows = db.scalars(select(Book).offset(skip).limit(page_size)).all()
    total = db.scalar(select(func.count()).select_from(Book))
    return rows, total


def get_book(db: Session, book_id: int) -> Book:
    book = db.get(Book, book_id)
    if book is None:
        raise NotFoundError("book not found")
    return book


def create_book(db: Session, data: dict) -> Book:
    book = Book(**data, available_copies=data.get("total_copies", 1))
    db.add(book)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("isbn already exists") from exc
    db.refresh(book)
    return book
```

## Step 5: Define route handlers

Create `app/api/v1/books/router.py` — HTTP concerns only, `response_model=`,
no business logic:

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.v1.books import services
from app.api.v1.books.schemas import BookCreate, BookResponse, PaginatedBooks
from app.core.database.postgres import get_session
from app.core.security.jwt import UserContext, get_current_user

router = APIRouter()


@router.get("/", response_model=PaginatedBooks)
def list_books(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    rows, total = services.list_books(db, page, page_size)
    return PaginatedBooks(
        books=[BookResponse.model_validate(b) for b in rows],
        total=total, page=page, page_size=page_size,
    )


@router.post("/", response_model=BookResponse, status_code=201)
def create_book(
    body: BookCreate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    book = services.create_book(db, body.model_dump(exclude_none=True))
    return BookResponse.model_validate(book)


@router.get("/{book_id}", response_model=BookResponse)
def get_book(
    book_id: int,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    return BookResponse.model_validate(services.get_book(db, book_id))
```

## Step 6: Register the router

Edit `app/api/v1/router.py`:

```python
from fastapi import APIRouter
from app.api.v1.books.router import router as books_router  # ← add this

api_router = APIRouter()
api_router.include_router(books_router, prefix="/v1/books", tags=["Books"])  # ← add this
```

## Step 7: Generate and apply an Alembic migration

New tables are created by Alembic, not by `Base.metadata.create_all`. Make sure
the new model is imported where Alembic's `target_metadata` is assembled (the
models package / `env.py`), then autogenerate:

```bash
make migration m="add books table"   # alembic revision --autogenerate
# Review the generated file in alembic/versions/ before applying
make migrate                          # alembic upgrade head
```

There is no collection setting to add — table names live on the model
(`__tablename__`), not in `config.py`.

## Step 8: Write tests

Create `tests/unit/test_books.py` for pure logic tests.
Create `tests/contract/test_books.py` for DB tests:

```python
import pytest

pytestmark = pytest.mark.contract

def test_create_book(contract_client, seeded_user):
    resp = contract_client.post(
        "/api/v1/books/",
        json={"title": "Dune", "author": "Herbert", "isbn": "978-0441013593"},
        headers=seeded_user["headers"],
    )
    assert resp.status_code == 201
    assert resp.json()["available_copies"] == 1
```

## Step 9: Add optional caching

Wrap GET endpoints with `@redis_cache_response`:

```python
from app.core.cache.redis_cache import redis_cache_response

# Add the TTL to settings._CACHE_TTL_DEFAULTS in config.py:
# "book_list": 60,

@router.get("/", response_model=PaginatedBooks)
@redis_cache_response(ttl=60, cache_key_prefix="book_list")
def list_books(request: Request, ...):  # request must be first positional arg
    ...
```

## PR checklist

- [ ] ORM model defined in `models.py` (SQLAlchemy 2.0, extends `Base`)
- [ ] Schemas defined in `schemas.py` (Pydantic v2, `ConfigDict(from_attributes=True)`)
- [ ] Business logic in `services.py` (takes `Session`, no `fastapi` imports)
- [ ] Routes in `router.py` (no business logic, integer path IDs, `response_model=`)
- [ ] Router registered in `app/api/v1/router.py`
- [ ] Alembic migration generated, reviewed, and applied (`make migration` → `make migrate`)
- [ ] Unit tests for services
- [ ] Contract tests for endpoints
- [ ] Docs updated if API is public
