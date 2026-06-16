"""Pydantic schemas for the loans domain."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class LoanCreate(BaseModel):
    book_id: int = Field(..., ge=1)
    member_id: int = Field(..., ge=1)
    due_date: datetime | None = Field(None, description="Defaults to borrow date + loan period")


class LoanResponse(BaseModel):
    id: int
    book_id: int
    member_id: int
    book_title: str | None = None
    member_name: str | None = None
    borrowed_at: datetime | None = None
    due_date: datetime | None = None
    returned_at: datetime | None = None
    status: str
    fine_amount: float
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PaginatedLoans(BaseModel):
    items: list[LoanResponse]
    total: int
    page: int
    page_size: int
