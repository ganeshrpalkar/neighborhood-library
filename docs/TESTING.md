# Testing

## Test pyramid

| Layer | Path | DB Required | Speed | Purpose |
|-------|------|-------------|-------|---------|
| **Unit** | `tests/unit/` | No | Fast | Pure logic (exceptions, JWT, helpers) |
| **Property** | `tests/properties/` | No | Fast | Hypothesis generative tests |
| **Smoke** | `tests/test_startup_smoke.py` | No | Fast | App import and config load |
| **Health** | `tests/test_health.py` | No | Fast | `/api/health` endpoint |
| **Contract** | `tests/contract/` | Yes | Slow | Full CRUD against live DB |

## Running tests

```bash
# All fast tests (no DB)
make test

# Individual tiers
make test-unit
make test-property
make test-smoke

# Contract tests (requires PostgreSQL + Redis)
# Start services first: docker compose up postgres redis -d
# Apply migrations against the test DB: make migrate
make test-contract

# All tests
make test-all

# Coverage report
make coverage
```

## Test markers

```python
@pytest.mark.contract   # requires live PostgreSQL + Redis
@pytest.mark.mutation   # creates or deletes data (excluded from read-only CI runs)
@pytest.mark.property   # Hypothesis property tests
```

Run/exclude markers:
```bash
# Exclude mutation tests
pytest tests/contract/ -m "contract and not mutation"

# Only mutation tests
pytest tests/contract/ -m "mutation"
```

## Contract test fixtures

Contract tests use a `seeded_user` fixture that:
1. Creates a staff user in PostgreSQL
2. Returns a JWT token for that user
3. Cleans up after the test session

Prefer a **transactional-rollback fixture per test**: open a `Session` inside a
transaction, hand it to the test, and roll back at teardown so each test starts
from a clean database without re-seeding. This keeps tests isolated and fast.
The `seeded_user` fixture itself is session-scoped — the staff user + JWT are
created once and shared across the session.

## CI environment

The GitHub Actions `ci.yml` spins up PostgreSQL 16 and Redis 7.2 as service containers:

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: library
      POSTGRES_PASSWORD: library
      POSTGRES_DB: library
  redis:
    image: redis:7.2-alpine
```

Migrations are applied (`make migrate`) before contract tests run. Contract
tests run against these services with:
```
DATABASE_URL=postgresql+psycopg://library:library@localhost:5432/library
REDIS_URL=redis://localhost:6379/15
JWT_SECRET_KEY=ci-test-secret-key
```

## Writing tests

### Unit test example

```python
# tests/unit/test_something.py
def test_my_logic():
    from app.core.exceptions import NotFoundError
    err = NotFoundError("book not found")
    assert err.http_status == 404
```

### Contract test example

```python
# tests/contract/test_something.py
import pytest

pytestmark = pytest.mark.contract

def test_create_and_fetch(contract_client, seeded_user):
    resp = contract_client.post(
        "/api/v1/books/",
        json={"title": "Dune", "author": "Herbert", "isbn": "978-0441013593"},
        headers=seeded_user["headers"],
    )
    assert resp.status_code == 201
    book_id = resp.json()["id"]

    fetch = contract_client.get(f"/api/v1/books/{book_id}", headers=seeded_user["headers"])
    assert fetch.status_code == 200
```

### Property test example

```python
# tests/properties/test_something.py
from hypothesis import given, strategies as st

@given(st.text(min_size=1, max_size=200))
def test_book_title_always_stored(title: str):
    # Test invariants about your domain
    assert len(title) >= 1
```
