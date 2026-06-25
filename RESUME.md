# Resume / Progress Handoff

Snapshot of where the **Neighborhood Library** project stands, so work can be picked up later.
_Last updated: 2026-06-14._

## TL;DR
A full-stack neighborhood-library app is **built, running, and tested end-to-end**:
- **Backend:** FastAPI (REST) + PostgreSQL (SQLAlchemy 2.0 + Alembic) + Redis + Celery + JWT.
- **Frontend:** Next.js 14 (App Router) + TS + Tailwind + framer-motion + react-three-fiber.
- 35/35 backend tests pass; frontend `tsc --noEmit` clean.

## How to run (after a machine restart)
```bash
cd /home/akshada/projects/neighborhood-library

# 1. Databases (dockerized Postgres + Redis)
docker compose up postgres redis -d
make migrate                      # alembic upgrade head  (head = 82feaf47d39c)
uv run python -m app.seed         # 18 books (+covers in DB), 6 members, 3 loans

# 2. Backend API  — NOTE: port 8000 is taken by another project's container
#    (regulatory-intelligence-platform-api-1), so we run on 8010.
ENABLE_DOCS=true DEBUG=true uv run uvicorn app.main:app --port 8010 --log-level warning
# (optional) Celery worker for the overdue-loans job:
make worker

# 3. Frontend  (frontend/.env.local already points NEXT_PUBLIC_API_URL at :8010)
cd frontend && npm install && npm run dev      # http://localhost:3000
```
**Login:** `staff@bookhaven.org` / `library123` (roles: staff, admin). Self-register at `/register`.

> If you free port 8000, run the API there instead and set `frontend/.env.local`
> `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`.

## What's implemented
**Backend** (`app/api/v1/{auth,books,members,loans}/`)
- Auth: register / token (JWT, bcrypt) / me.
- Books: CRUD, inventory (total/available copies), **cover image stored in DB** (BYTEA, deferred) — `GET /books/{id}/cover` (public) + `PUT /books/{id}/cover` (upload).
- Members: CRUD + `GET /members/{id}/loans`.
- Loans: atomic borrow/return, overdue detection, fines ($0.50/day, 14-day period).
- **Search + autocomplete:** `pg_trgm` GIN indexes; typo-tolerant `word_similarity`. Endpoints `GET /books/autocomplete?q=` and `GET /members/autocomplete?q=`; list `?search=` is also fuzzy.
- Celery task `loans.flag_overdue_loans` (+ daily beat schedule).

**Frontend** (`frontend/src/`)
- Pages: login (animated 3D **open-book**, right-aligned, EB Garamond serif, pointer-interactive 3D books with printed spines/backs), register, dashboard (3D hero + animated stat counters + recent loans), books (grid w/ DB covers, typeahead, CRUD, lend), members (typeahead, CRUD, loans drawer), loans (status tabs, borrow/return, covers in rows).
- **Loaders / lazy-loading:** `AppBoot` global first-load splash (`src/components/loading/`), per-route `loading.tsx`, post-login "Preparing your library…" loader, heavy modals + `HeroScene` code-split via `next/dynamic`.

## Migrations (Alembic, head = `82feaf47d39c`)
1. `3de5600584c7` initial schema (users, books, members, loans)
2. `ec19854a2035` add book cover columns (cover_image BYTEA, cover_content_type)
3. `82feaf47d39c` add pg_trgm extension + trigram GIN indexes

## Tests
```bash
make test            # unit + property + smoke (no DB)
make test-contract   # contract tests (needs Postgres + Redis)
make test-all        # everything   (currently 35 passing)
```

## Known notes
- **Port 8000** is used by a different project (Docker `regulatory-intelligence-platform-api-1`) — we use **8010**. Don't kill that container.
- Book cover thumbnails come from the public Open Library covers API and are stored in the DB for catalog display.
- 3D book spines/backs are realistic reconstructions (real title/author/ISBN on a generated binding), not exact published-edition scans (those aren't available from the cover API).
- Two pre-existing ruff style warnings remain in boilerplate `app/core/middleware/logging_middleware.py` and `logging_setup.py` (not from this work).

## Suggested next steps (open / offered, not yet done)
- Run a production `npm run build` to confirm the bundle is actually code-split.
- Lazy-load the dashboard's stat widgets.
- Contract tests for the autocomplete endpoints.
- Fuzzy search on the loans view (search by book/member via join).
- Clean up the harmless `forwardRef`/lint items if desired.

## Useful paths
- Backend modules: `app/api/v1/<module>/{schemas,models,services,router}.py`
- DB engine/session: `app/core/database/postgres.py` ; seed: `app/seed.py` ; cover assets: `app/seed_assets/covers/`
- Frontend loaders: `frontend/src/components/loading/` ; API client: `frontend/src/lib/api.ts`
- Sample API client script: `scripts/sample_client.py`
- Architecture/docs: `CLAUDE.md`, `README.md`, `docs/`
