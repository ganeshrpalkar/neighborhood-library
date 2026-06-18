"""Business logic for the books domain — never imports from fastapi."""

from __future__ import annotations

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.v1.books.models import Book
from app.core.exceptions import ConflictError, NotFoundError


def list_books(db: Session, page: int = 1, page_size: int = 12, search: str | None = None) -> tuple[list[Book], int]:
    stmt = select(Book)
    if search:
        q = search.strip()
        like = f"%{q}%"
        conds: list[ColumnElement[bool]] = [Book.title.ilike(like), Book.author.ilike(like), Book.isbn.ilike(like)]
        if len(q) >= 4:  # trigram fuzzy for longer queries (typo tolerance)
            conds += [func.word_similarity(q, Book.title) > 0.45, func.word_similarity(q, Book.author) > 0.45]
        stmt = stmt.where(or_(*conds))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Book.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return list(rows), total


def autocomplete_books(db: Session, q: str, limit: int = 8) -> list[Book]:
    """Trigram-ranked typeahead over title / author (ILIKE filter, similarity order)."""
    q = q.strip()
    if not q:
        return []
    like = f"%{q}%"
    # word_similarity(query, text) compares the query against the closest *word* in the
    # text, so a typo like "tolkein" still matches the author "J.R.R. Tolkien".
    score = func.greatest(func.word_similarity(q, Book.title), func.word_similarity(q, Book.author))
    conds: list[ColumnElement[bool]] = [Book.title.ilike(like), Book.author.ilike(like), Book.isbn.ilike(like)]
    if len(q) >= 4:  # fuzzy only for longer queries — short prefixes use substring match
        conds += [func.word_similarity(q, Book.title) > 0.45, func.word_similarity(q, Book.author) > 0.45]
    stmt = select(Book).where(or_(*conds)).order_by(score.desc(), Book.title.asc()).limit(limit)
    return list(db.scalars(stmt).all())


def get_book(db: Session, book_id: int) -> Book:
    book = db.get(Book, book_id)
    if book is None:
        raise NotFoundError(f"Book {book_id} not found")
    return book


def create_book(db: Session, data: dict) -> Book:
    isbn = data.get("isbn")
    if isbn and db.scalar(select(Book).where(Book.isbn == isbn)) is not None:
        raise ConflictError(f"A book with ISBN '{isbn}' already exists") from None
    total = data.get("total_copies", 1)
    book = Book(
        title=data["title"],
        author=data["author"],
        isbn=isbn,
        publisher=data.get("publisher"),
        published_year=data.get("published_year"),
        genre=data.get("genre"),
        total_copies=total,
        available_copies=total,
    )
    db.add(book)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(f"A book with ISBN '{isbn}' already exists") from None
    db.refresh(book)
    return book


def update_book(db: Session, book_id: int, data: dict) -> Book:
    book = get_book(db, book_id)

    new_isbn = data.get("isbn")
    if (
        new_isbn
        and new_isbn != book.isbn
        and db.scalar(select(Book).where(Book.isbn == new_isbn)) is not None
    ):
        raise ConflictError(f"A book with ISBN '{new_isbn}' already exists") from None

    if "total_copies" in data and data["total_copies"] is not None:
        delta = data["total_copies"] - book.total_copies
        new_available = book.available_copies + delta
        if new_available < 0:
            raise ConflictError("Cannot reduce total copies below the number currently on loan")
        book.available_copies = new_available

    for field in ("title", "author", "isbn", "publisher", "published_year", "genre", "total_copies"):
        if field in data and data[field] is not None:
            setattr(book, field, data[field])

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(f"A book with ISBN '{new_isbn}' already exists") from None
    db.refresh(book)
    return book


def get_cover(db: Session, book_id: int) -> tuple[bytes, str]:
    """Return (image_bytes, content_type) for a book's cover, or raise NotFoundError."""
    book = get_book(db, book_id)
    if book.cover_image is None or book.cover_content_type is None:
        raise NotFoundError(f"Book {book_id} has no cover image")
    return book.cover_image, book.cover_content_type


def set_cover(db: Session, book_id: int, data: bytes, content_type: str) -> Book:
    """Store a cover image (bytes) for a book directly in the database."""
    book = get_book(db, book_id)
    book.cover_image = data
    book.cover_content_type = content_type
    db.commit()
    db.refresh(book)
    return book


def delete_book(db: Session, book_id: int) -> dict:
    book = get_book(db, book_id)
    if book.available_copies != book.total_copies:
        raise ConflictError("Cannot delete a book that has copies currently on loan")
    db.delete(book)
    db.commit()
    return {"success": True, "deleted_id": book_id}
