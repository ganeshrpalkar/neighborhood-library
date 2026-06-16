"""Celery tasks for the loans domain."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select

# Import sibling models so SQLAlchemy can resolve Loan's relationships ("Book",
# "Member") when this module is loaded standalone (e.g. in a Celery worker).
from app.api.v1.books.models import Book  # noqa: F401
from app.api.v1.loans.models import Loan
from app.api.v1.members.models import Member  # noqa: F401
from app.core.celery_app import celery_app
from app.core.config import settings
from app.core.database.postgres import get_sessionmaker


@celery_app.task(name="loans.flag_overdue_loans")
def flag_overdue_loans() -> dict:
    """Mark unreturned loans past their due date as overdue and (re)compute fines.

    Idempotent — safe to run on a schedule (e.g. daily). Returns a summary dict.
    """
    now = datetime.now(UTC)
    session_factory = get_sessionmaker()
    flagged = 0
    total_fines = 0.0

    with session_factory() as db:
        stmt = select(Loan).where(Loan.returned_at.is_(None), Loan.due_date < now)
        for loan in db.scalars(stmt):
            overdue_days = (now - loan.due_date).days
            loan.status = "overdue"
            loan.fine_amount = round(max(0, overdue_days) * settings.FINE_PER_DAY, 2)
            flagged += 1
            total_fines += float(loan.fine_amount)
        db.commit()

    return {"flagged": flagged, "total_fines": round(total_fines, 2)}
