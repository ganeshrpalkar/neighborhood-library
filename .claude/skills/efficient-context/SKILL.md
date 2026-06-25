---
name: efficient-context
description: Use at the START of any task in this repo to navigate the codebase with minimal token usage. Invoke when exploring code, locating a symbol, or before reading files — it gives the cheapest path to the answer instead of reading whole files or re-discovering structure.
---

# Efficient Context (Token-Saving Navigation)

Goal: answer questions and make changes while reading as few tokens as possible. Follow this order.

## 1. Consult structured knowledge first (free, already loaded)
Before any file read, use what's already known:
- `CLAUDE.md` — stack, layout, SQLAlchemy Session/JWT/cache APIs, hard rules
- `docs/ARCHITECTURE.md`, `docs/ADDING_AN_API.md`, `docs/TESTING.md`
- `.cursor/rules/*.mdc` — concrete patterns per area

If the answer is in there, **don't read source files at all.**

## 2. Locate before you read
- Use **Grep** with a tight pattern + `output_mode: "files_with_matches"` to find *where*, then read only the matching span.
- Use **Glob** for filenames (e.g. `app/api/v1/*/router.py`).
- Read with `offset`/`limit` to pull only the relevant lines — never read a whole large file to see one function.
- The reference domain module is `app/api/v1/books/` — its files (`schemas.py`, `models.py`, `services.py`, `router.py`, `__init__.py`) are small and are the canonical template. Read those, not a sweep of every module.

## 3. Delegate fan-out searches to a subagent
If answering needs scanning many files/dirs (e.g. "where is X used across the app?"), launch the **Explore** subagent. It reads excerpts and returns only the conclusion, keeping large file dumps out of the main context.

## 4. Use MCP servers instead of reading/guessing
- **context7** — fetch exact, current docs for FastAPI / SQLAlchemy / Alembic / Celery / Pydantic instead of reading vendored source or guessing an API.
- **postgres** (read-only) — inspect tables/indexes/sample rows directly rather than reading code to infer the schema.
- **fetch** — pull a specific URL when needed.

## 5. Don't re-read or re-derive
- After an Edit, trust it succeeded (the tool errors if it didn't) — don't Read the file back to "verify".
- Don't re-run a search you already ran; reuse the result.
- Prefer `make` targets (see the `run-tests` skill) over re-deriving commands.

## Anti-patterns (these waste tokens)
- Reading `app/core/database/postgres.py` in full to learn the API → it's summarized in `CLAUDE.md`.
- Cat-ing entire files via Bash → use Read with a line range, or Grep.
- Re-exploring directory structure each turn → it's in `CLAUDE.md` "Project Layout".
