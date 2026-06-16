"""Pydantic schemas for the members domain."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class MemberCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: str | None = Field(None, max_length=40)
    address: str | None = Field(None, max_length=500)


class MemberUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=40)
    address: str | None = Field(None, max_length=500)
    is_active: bool | None = None


class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    phone: str | None = None
    address: str | None = None
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PaginatedMembers(BaseModel):
    items: list[MemberResponse]
    total: int
    page: int
    page_size: int


class MemberSuggestion(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
