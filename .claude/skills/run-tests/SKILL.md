---
name: run-tests
description: Use when running or debugging tests in this repo. Gives the exact command per test tier and which tiers need a live database, so you don't guess flags or run the wrong scope.
---

# Run Tests

Prefer `make` targets — they encode the correct scope and flags.

## No database required (fast — default loop)
```bash
make test            # unit + property + smoke
make test-unit       # tests/unit/ only
make test-property   # Hypothesis tests
make test-smoke      # startup import check
```

## Database required (PostgreSQL + Redis)
```bash
docker compose up postgres redis -d  # start dependencies first
make migrate                         # alembic upgrade head (apply schema)
make test-contract                   # tests/contract/ (@pytest.mark.contract)
make test-all                        # everything
```

## Coverage
```bash
make coverage        # HTML report in htmlcov/
```

## Markers
- `@pytest.mark.contract` — needs live Postgres + Redis
- `@pytest.mark.mutation` — writes/deletes data; exclude with `-m "contract and not mutation"`
- `@pytest.mark.property` — Hypothesis

## Targeting a single test (debugging)
```bash
uv run pytest tests/unit/test_x.py::test_name -v
uv run pytest tests/contract/ -m "contract and not mutation" -q
```

## Fixtures
- `seeded_user` (contract) → `{ "user_id", "email", "headers": {Authorization: Bearer ...} }`
- Use `headers=seeded_user["headers"]` for authenticated requests.

## If contract tests fail to connect
Check services are up: `docker compose ps`. Test env vars live in `tests/conftest.py` / `tests/contract/conftest.py`.
