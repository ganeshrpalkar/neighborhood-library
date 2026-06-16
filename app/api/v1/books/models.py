"""SQLAlchemy ORM model for books."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Index, Integer, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database.postgres import Base, TimestampMixin

if TYPE_CHECKING:
    from app.api.v1.loans.models import Loan


class Book(Base, TimestampMixin):
    __tablename__ = "books"
    __table_args__ = (
        CheckConstraint("total_copies >= 0", name="ck_books_total_copies_nonneg"),
        CheckConstraint("available_copies >= 0", name="ck_books_available_nonneg"),
        CheckConstraint("available_copies <= total_copies", name="ck_books_available_lte_total"),
        Index("ix_books_title_trgm", "title", postgresql_using="gin", postgresql_ops={"title": "gin_trgm_ops"}),
        Index("ix_books_author_trgm", "author", postgresql_using="gin", postgresql_ops={"author": "gin_trgm_ops"}),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(300), index=True)
    author: Mapped[str] = mapped_column(String(200), index=True)
    isbn: Mapped[str | None] = mapped_column(String(20), unique=True)
    publisher: Mapped[str | None] = mapped_column(String(200))
    published_year: Mapped[int | None] = mapped_column(Integer)
    genre: Mapped[str | None] = mapped_column(String(100))
    total_copies: Mapped[int] = mapped_column(Integer, default=1)
    available_copies: Mapped[int] = mapped_column(Integer, default=1)

    # Cover image stored directly in the database. The blob is deferred so list
    # queries don't drag every image over the wire; cover_content_type is light
    # and tells us whether a cover exists without loading the bytes.
    cover_image: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True, deferred=True)
    cover_content_type: Mapped[str | None] = mapped_column(String(100), nullable=True)

    loans: Mapped[list[Loan]] = relationship(back_populates="book")

    @property
    def has_cover(self) -> bool:
        return self.cover_content_type is not None
