"""Pydantic schemas for the books domain."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BookCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    author: str = Field(..., min_length=1, max_length=200)
    isbn: str | None = Field(None, max_length=20)
    publisher: str | None = Field(None, max_length=200)
    published_year: int | None = Field(None, ge=0, le=2100)
    genre: str | None = Field(None, max_length=100)
    total_copies: int = Field(1, ge=1, le=10000)


class BookUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=300)
    author: str | None = Field(None, min_length=1, max_length=200)
    isbn: str | None = Field(None, max_length=20)
    publisher: str | None = Field(None, max_length=200)
    published_year: int | None = Field(None, ge=0, le=2100)
    genre: str | None = Field(None, max_length=100)
    total_copies: int | None = Field(None, ge=1, le=10000)


class BookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    author: str
    isbn: str | None = None
    publisher: str | None = None
    published_year: int | None = None
    genre: str | None = None
    total_copies: int
    available_copies: int
    has_cover: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PaginatedBooks(BaseModel):
    items: list[BookResponse]
    total: int
    page: int
    page_size: int


class BookSuggestion(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    author: str
    available_copies: int
    has_cover: bool = False
