---
name: pre-pr-checks
description: Use before committing or opening a PR in this repo. Runs the required lint, type, and test gate and lists the must-pass checklist so nothing ships broken.
---

# Pre-PR Checks

Run this gate before any commit/PR. All must pass.

## Commands (in order)
```bash
uv run ruff check app/ tests/        # lint
uv run ruff format --check app/ tests/   # format check (run `make format` to fix)
uv run mypy app/                     # type check
make test                            # unit + property + smoke (no DB)
```

If touching DB/route behavior, also:
```bash
docker compose up postgres redis -d
make migrate
make test-contract
```

## Checklist
- [ ] `ruff check` clean
- [ ] `mypy app/` clean
- [ ] Fast tests pass; contract tests pass if DB-touching code changed
- [ ] New routes have a contract test (happy path + 401 + 404 where relevant)
- [ ] New service functions have a unit test
- [ ] `uv.lock` committed if `pyproject.toml` changed (run `uv lock`)
- [ ] Schema changes have an Alembic migration committed (`make migration m="..."`); `make migrate` applies clean
- [ ] No `.env` staged — only `.env.template` updated
- [ ] No secrets, no `print()` debugging, no bare `HTTPException` in services

## Commit
- Branch off `main` if on it; never commit `.env`.
- Keep the commit message imperative and scoped.
