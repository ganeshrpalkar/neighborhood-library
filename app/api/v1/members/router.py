"""HTTP routes for the members domain."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.api.v1.loans import services as loan_services
from app.api.v1.loans.schemas import LoanResponse
from app.api.v1.members import services
from app.api.v1.members.schemas import (
    MemberCreate,
    MemberResponse,
    MemberSuggestion,
    MemberUpdate,
    PaginatedMembers,
)
from app.core.database.postgres import get_session
from app.core.security.jwt import UserContext, get_current_user

router = APIRouter()


@router.get("", response_model=PaginatedMembers)
def list_members(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    search: str | None = Query(None, description="Search name or email"),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> PaginatedMembers:
    members, total = services.list_members(db, page=page, page_size=page_size, search=search)
    return PaginatedMembers(
        items=[MemberResponse.model_validate(m) for m in members],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
def create_member(
    body: MemberCreate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> MemberResponse:
    member = services.create_member(db, body.model_dump())
    return MemberResponse.model_validate(member)


@router.get("/autocomplete", response_model=list[MemberSuggestion])
def autocomplete_members(
    q: str = Query("", description="Partial name or email"),
    limit: int = Query(8, ge=1, le=20),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> list[MemberSuggestion]:
    rows = services.autocomplete_members(db, q, limit)
    return [MemberSuggestion.model_validate(m) for m in rows]


@router.get("/{member_id}", response_model=MemberResponse)
def get_member(
    member_id: int = Path(..., ge=1),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> MemberResponse:
    return MemberResponse.model_validate(services.get_member(db, member_id))


@router.patch("/{member_id}", response_model=MemberResponse)
def update_member(
    body: MemberUpdate,
    member_id: int = Path(..., ge=1),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> MemberResponse:
    member = services.update_member(db, member_id, body.model_dump(exclude_unset=True))
    return MemberResponse.model_validate(member)


@router.delete("/{member_id}")
def delete_member(
    member_id: int = Path(..., ge=1),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    return services.delete_member(db, member_id)


@router.get("/{member_id}/loans", response_model=list[LoanResponse])
def member_loans(
    member_id: int = Path(..., ge=1),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> list[LoanResponse]:
    """All books this member has borrowed (open loans first)."""
    loans = loan_services.list_member_loans(db, member_id)
    return [LoanResponse.model_validate(loan_services.serialize_loan(loan)) for loan in loans]
