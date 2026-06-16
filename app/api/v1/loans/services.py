"""Business logic for lending operations — never imports from fastapi.

Borrow and return are atomic: each mutates the loan row and the book's
available-copy counter, and both writes are flushed in the same transaction
(the get_session dependency commits once, on success).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.v1.books.models import Book
from app.api.v1.loans.models import Loan
from app.api.v1.members.models import Member
from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError


def _now() -> datetime:
    return datetime.now(UTC)


def _effective_status(loan: Loan) -> str:
    if loan.returned_at is not None:
        return "returned"
    if loan.due_date is not None and loan.due_date < _now():
        return "overdue"
    return "active"


def _live_fine(loan: Loan) -> float:
    """Fine already charged once returned; otherwise the amount accruing so far."""
    if loan.returned_at is not None:
        return float(loan.fine_amount or 0)
    if loan.due_date is not None and loan.due_date < _now():
        overdue_days = (_now() - loan.due_date).days
        return round(max(0, overdue_days) * settings.FINE_PER_DAY, 2)
    return 0.0


def serialize_loan(loan: Loan) -> dict:
    """Flatten a Loan (plus its book/member) into an API-safe dict."""
    return {
        "id": loan.id,
        "book_id": loan.book_id,
        "member_id": loan.member_id,
        "book_title": loan.book.title if loan.book else None,
        "member_name": loan.member.name if loan.member else None,
        "borrowed_at": loan.borrowed_at,
        "due_date": loan.due_date,
        "returned_at": loan.returned_at,
        "status": _effective_status(loan),
        "fine_amount": _live_fine(loan),
        "created_at": loan.created_at,
        "updated_at": loan.updated_at,
    }


def get_loan(db: Session, loan_id: int) -> Loan:
    loan = db.get(Loan, loan_id)
    if loan is None:
        raise NotFoundError(f"Loan {loan_id} not found")
    return loan


def borrow_book(db: Session, book_id: int, member_id: int, due_date: datetime | None = None) -> Loan:
    book = db.get(Book, book_id)
    if book is None:
        raise NotFoundError(f"Book {book_id} not found")
    member = db.get(Member, member_id)
    if member is None:
        raise NotFoundError(f"Member {member_id} not found")
    if book.available_copies < 1:
        raise ConflictError(f"'{book.title}' has no available copies")

    book.available_copies -= 1
    loan = Loan(
        book_id=book_id,
        member_id=member_id,
        due_date=due_date or (_now() + timedelta(days=settings.LOAN_PERIOD_DAYS)),
        status="active",
        fine_amount=0,
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return loan


def return_loan(db: Session, loan_id: int) -> Loan:
    loan = get_loan(db, loan_id)
    if loan.returned_at is not None:
        raise ConflictError("This loan has already been returned")

    now = _now()
    overdue_days = (now - loan.due_date).days if loan.due_date else 0
    loan.returned_at = now
    loan.status = "returned"
    loan.fine_amount = round(max(0, overdue_days) * settings.FINE_PER_DAY, 2)

    book = db.get(Book, loan.book_id)
    if book is not None:
        book.available_copies = min(book.total_copies, book.available_copies + 1)

    db.commit()
    db.refresh(loan)
    return loan


def _apply_status_filter(stmt, status: str | None):
    if status == "returned":
        return stmt.where(Loan.returned_at.is_not(None))
    if status == "active":
        return stmt.where(Loan.returned_at.is_(None), Loan.due_date >= _now())
    if status == "overdue":
        return stmt.where(Loan.returned_at.is_(None), Loan.due_date < _now())
    return stmt


def list_loans(
    db: Session,
    page: int = 1,
    page_size: int = 12,
    member_id: int | None = None,
    status: str | None = None,
) -> tuple[list[Loan], int]:
    stmt = select(Loan).options(selectinload(Loan.book), selectinload(Loan.member))
    if member_id is not None:
        stmt = stmt.where(Loan.member_id == member_id)
    stmt = _apply_status_filter(stmt, status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Loan.borrowed_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return list(rows), total


def list_member_loans(db: Session, member_id: int) -> list[Loan]:
    """All loans for one member (open loans first), used by the member detail view."""
    if db.get(Member, member_id) is None:
        raise NotFoundError(f"Member {member_id} not found")
    stmt = (
        select(Loan)
        .options(selectinload(Loan.book), selectinload(Loan.member))
        .where(Loan.member_id == member_id)
        .order_by(Loan.returned_at.is_not(None), Loan.borrowed_at.desc())
    )
    return list(db.scalars(stmt).all())


def count_loans(db: Session, status: str | None = None) -> int:
    stmt = _apply_status_filter(select(Loan), status)
    return db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
