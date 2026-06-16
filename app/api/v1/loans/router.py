"""HTTP routes for lending operations."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy.orm import Session

from app.api.v1.loans import services
from app.api.v1.loans.schemas import LoanCreate, LoanResponse, PaginatedLoans
from app.core.database.postgres import get_session
from app.core.security.jwt import UserContext, get_current_user

router = APIRouter()


@router.get("", response_model=PaginatedLoans)
def list_loans(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    member_id: int | None = Query(None, ge=1),
    status: str | None = Query(None, pattern="^(active|returned|overdue)$"),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> PaginatedLoans:
    loans, total = services.list_loans(db, page=page, page_size=page_size, member_id=member_id, status=status)
    return PaginatedLoans(
        items=[LoanResponse.model_validate(services.serialize_loan(loan)) for loan in loans],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=LoanResponse, status_code=status.HTTP_201_CREATED)
def borrow_book(
    body: LoanCreate,
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> LoanResponse:
    """Record a member borrowing a book (decrements available copies)."""
    loan = services.borrow_book(db, body.book_id, body.member_id, body.due_date)
    return LoanResponse.model_validate(services.serialize_loan(loan))


@router.post("/{loan_id}/return", response_model=LoanResponse)
def return_loan(
    loan_id: int = Path(..., ge=1),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> LoanResponse:
    """Record the return of a borrowed book (restores a copy, settles any fine)."""
    loan = services.return_loan(db, loan_id)
    return LoanResponse.model_validate(services.serialize_loan(loan))


@router.get("/{loan_id}", response_model=LoanResponse)
def get_loan(
    loan_id: int = Path(..., ge=1),
    current_user: UserContext = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> LoanResponse:
    loan = services.get_loan(db, loan_id)
    return LoanResponse.model_validate(services.serialize_loan(loan))
