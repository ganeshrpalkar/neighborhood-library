"""Unit tests for loan status / fine helpers (pure logic, no DB)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

from app.api.v1.loans.services import _effective_status, _live_fine


def _loan(*, due_offset_days: int, returned: bool = False, fine: float = 0.0):
    now = datetime.now(UTC)
    return SimpleNamespace(
        due_date=now + timedelta(days=due_offset_days),
        returned_at=now if returned else None,
        fine_amount=fine,
    )


def test_active_when_not_due_and_not_returned():
    assert _effective_status(_loan(due_offset_days=7)) == "active"


def test_overdue_when_past_due_and_not_returned():
    assert _effective_status(_loan(due_offset_days=-3)) == "overdue"


def test_returned_status_takes_priority():
    assert _effective_status(_loan(due_offset_days=-10, returned=True)) == "returned"


def test_no_fine_while_within_due_date():
    assert _live_fine(_loan(due_offset_days=5)) == 0.0


def test_fine_accrues_per_overdue_day():
    # 10 days overdue * default 0.50/day = 5.00
    assert _live_fine(_loan(due_offset_days=-10)) == 5.0


def test_returned_loan_reports_settled_fine():
    assert _live_fine(_loan(due_offset_days=-10, returned=True, fine=3.5)) == 3.5
