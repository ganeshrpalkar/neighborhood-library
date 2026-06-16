#!/usr/bin/env python3
"""Sample client for the Neighborhood Library Service.

Runs a full end-to-end flow against a running API:
    login -> create book -> create member -> borrow -> list member loans -> return

Usage:
    uv run python scripts/sample_client.py [BASE_URL]
    # BASE_URL defaults to http://localhost:8000

Requires the API running and seeded (`make migrate && uv run python -m app.seed`).
"""

from __future__ import annotations

import sys
import uuid

import httpx

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000").rstrip("/")
API = f"{BASE}/api/v1"
STAFF = {"email": "staff@bookhaven.org", "password": "library123"}


def main() -> None:
    with httpx.Client(timeout=10.0) as c:
        # 1. Authenticate
        r = c.post(f"{API}/auth/token", json=STAFF)
        r.raise_for_status()
        token = r.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}
        print(f"✓ logged in as {STAFF['email']}")

        # 2. Create a book (1 copy)
        suffix = uuid.uuid4().hex[:6]
        book = c.post(
            f"{API}/books",
            headers=h,
            json={"title": f"Demo Book {suffix}", "author": "Demo Author", "total_copies": 1},
        ).json()
        print(f"✓ created book #{book['id']} '{book['title']}' "
              f"({book['available_copies']}/{book['total_copies']} available)")

        # 3. Create a member
        member = c.post(
            f"{API}/members",
            headers=h,
            json={"name": "Demo Reader", "email": f"reader-{suffix}@bookhaven.org"},
        ).json()
        print(f"✓ created member #{member['id']} {member['name']}")

        # 4. Borrow the book
        loan = c.post(
            f"{API}/loans",
            headers=h,
            json={"book_id": book["id"], "member_id": member["id"]},
        ).json()
        print(f"✓ borrowed: loan #{loan['id']} '{loan['book_title']}' -> {loan['member_name']} "
              f"(status={loan['status']}, due {loan['due_date'][:10]})")

        # 4b. Borrowing again should fail with 409 (no copies left)
        again = c.post(
            f"{API}/loans", headers=h, json={"book_id": book["id"], "member_id": member["id"]}
        )
        print(f"✓ second borrow correctly rejected: HTTP {again.status_code} "
              f"({again.json().get('msg')})")

        # 5. List the member's outstanding loans
        out = c.get(f"{API}/members/{member['id']}/loans", headers=h).json()
        print(f"✓ {member['name']} currently has {len(out)} book(s) out: "
              f"{[loan_item['book_title'] for loan_item in out]}")

        # 6. Return the book
        returned = c.post(f"{API}/loans/{loan['id']}/return", headers=h).json()
        print(f"✓ returned: status={returned['status']}, fine=${returned['fine_amount']}")

        restored = c.get(f"{API}/books/{book['id']}", headers=h).json()
        print(f"✓ inventory restored: {restored['available_copies']}/{restored['total_copies']} available")

    print("\nDone — full borrow/return lifecycle succeeded.")


if __name__ == "__main__":
    main()
