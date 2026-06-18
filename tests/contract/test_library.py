"""Contract tests for the library lending flows — requires live PostgreSQL + Redis."""

from __future__ import annotations

import uuid

import pytest

pytestmark = pytest.mark.contract


def _unique(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def test_book_and_member_crud(contract_client, seeded_user):
    h = seeded_user["headers"]

    # Create a book
    r = contract_client.post(
        "/api/v1/books",
        headers=h,
        json={"title": _unique("Test Book"), "author": "Tester", "total_copies": 2},
    )
    assert r.status_code == 201, r.text
    book = r.json()
    assert book["available_copies"] == 2

    # Create a member
    r = contract_client.post(
        "/api/v1/members",
        headers=h,
        json={"name": "Reader", "email": f"{_unique('reader')}@bookhaven.org"},
    )
    assert r.status_code == 201, r.text

    # List is paginated
    r = contract_client.get("/api/v1/books?page_size=5", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert {"items", "total", "page", "page_size"} <= body.keys()


def test_borrow_return_lifecycle(contract_client, seeded_user):
    h = seeded_user["headers"]

    book = contract_client.post(
        "/api/v1/books",
        headers=h,
        json={"title": _unique("Lend Me"), "author": "A", "total_copies": 1},
    ).json()
    member = contract_client.post(
        "/api/v1/members",
        headers=h,
        json={"name": "Borrower", "email": f"{_unique('borrower')}@bookhaven.org"},
    ).json()

    # Borrow → 201, copy decremented
    r = contract_client.post("/api/v1/loans", headers=h, json={"book_id": book["id"], "member_id": member["id"]})
    assert r.status_code == 201, r.text
    loan = r.json()
    assert loan["status"] == "active"
    assert loan["book_title"] == book["title"]

    assert contract_client.get(f"/api/v1/books/{book['id']}", headers=h).json()["available_copies"] == 0

    # Borrowing again with no copies → 409
    r = contract_client.post("/api/v1/loans", headers=h, json={"book_id": book["id"], "member_id": member["id"]})
    assert r.status_code == 409

    # Member's outstanding loans includes it
    r = contract_client.get(f"/api/v1/members/{member['id']}/loans", headers=h)
    assert r.status_code == 200
    assert any(loan_item["id"] == loan["id"] for loan_item in r.json())

    # Return → copy restored
    r = contract_client.post(f"/api/v1/loans/{loan['id']}/return", headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "returned"
    assert contract_client.get(f"/api/v1/books/{book['id']}", headers=h).json()["available_copies"] == 1

    # Returning again → 409
    assert contract_client.post(f"/api/v1/loans/{loan['id']}/return", headers=h).status_code == 409


def test_borrow_missing_book_404(contract_client, seeded_user):
    h = seeded_user["headers"]
    member = contract_client.post(
        "/api/v1/members",
        headers=h,
        json={"name": "Ghost", "email": f"{_unique('ghost')}@bookhaven.org"},
    ).json()
    r = contract_client.post("/api/v1/loans", headers=h, json={"book_id": 99999999, "member_id": member["id"]})
    assert r.status_code == 404


def test_requires_auth(contract_client):
    assert contract_client.get("/api/v1/books").status_code == 401
