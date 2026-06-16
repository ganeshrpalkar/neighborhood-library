# Neighborhood Library Service

A REST API + animated Next.js frontend for a small neighborhood library to manage
**members**, **books**, and **lending operations** (borrow / return, due dates, overdue
detection, fines).

- **Backend:** Python · FastAPI (REST) · PostgreSQL (SQLAlchemy 2.0 + Alembic) · Redis · JWT
- **Frontend:** Next.js (App Router) · TypeScript · Tailwind · Framer Motion · react-three-fiber (3D)

---

## 1. Database schema

Three normalized tables joined by foreign keys (`members` 1─N `loans` N─1 `books`):

| Table | Key columns |
|-------|-------------|
| `members` | `id` PK · `name` · `email` UNIQUE · `phone` · `address` · `is_active` · timestamps |
| `books`   | `id` PK · `title` · `author` · `isbn` UNIQUE · `publisher` · `published_year` · `genre` · `total_copies` · `available_copies` · timestamps |
| `loans`   | `id` PK · `book_id` FK→books · `member_id` FK→members · `borrowed_at` · `due_date` · `returned_at` · `status` · `fine_amount` · timestamps |

**Inventory rule:** each book tracks `total_copies` / `available_copies`; borrowing decrements
and returning increments the available count (done atomically in one transaction).
**Lending rules:** `due_date = borrowed_at + 14 days`; a loan is *overdue* when unreturned past
its due date; fines accrue at `$0.50`/overdue day. Schema lives in the SQLAlchemy models
(`app/api/v1/*/models.py`) and is versioned with Alembic (`alembic/versions/`).

---

## 2. Setup

Prerequisites: [`uv`](https://docs.astral.sh/uv/), Docker (for Postgres/Redis), Node 18+ (frontend).

```bash
# 1. Install Python dependencies
uv sync

# 2. Start PostgreSQL + Redis (dockerized)
docker compose up postgres redis -d

# 3. (Optional) copy env template — defaults already target the docker DB
cp .env.template .env

# 4. Create the schema, then load sample data
make migrate                 # alembic upgrade head
uv run python -m app.seed    # staff user + 8 books + 4 members + 2 sample loans
```

Default dev connection (no `.env` needed): `postgresql+psycopg://library:library@localhost:5432/library`.

---

## 3. Run the backend

```bash
make dev                     # uvicorn --reload on http://localhost:8000
```

- Interactive API docs (Swagger): set `ENABLE_DOCS=true` and open `http://localhost:8000/docs`.
- Health check: `GET http://localhost:8000/api/health` → `{"status":"ok","postgres":true,"redis":true}`.
- Seeded staff login: **`staff@bookhaven.org` / `library123`**.

> **Port note:** if `8000` is taken, run on another port (`uv run uvicorn app.main:app --port 8010`)
> and point the frontend at it via `NEXT_PUBLIC_API_URL`.

### Background jobs (overdue detection)

A Celery task `loans.flag_overdue_loans` marks unreturned past-due loans as **overdue** and
recomputes fines; it's scheduled daily via Celery beat.

```bash
make worker                                   # Celery worker
# one-off run:
uv run python -c "from app.api.v1.loans.tasks import flag_overdue_loans; print(flag_overdue_loans())"
```

---

## 4. Run the frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev                           # http://localhost:3000
```

Pages: **Login/Register**, **Dashboard** (3D hero + live stats), **Books** (search, CRUD, lend),
**Members** (CRUD + per-member loans drawer), **Loans** (status tabs, borrow/return). See
`frontend/README.md` for details.

---

## 5. API reference

All endpoints except `register` / `token` require `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/auth/register` | Create a staff account |
| POST | `/api/v1/auth/token` | Log in → JWT |
| GET | `/api/v1/auth/me` | Current user |
| GET / POST | `/api/v1/books` | List/search · create |
| GET / PATCH / DELETE | `/api/v1/books/{id}` | Detail · update · delete |
| GET / POST | `/api/v1/members` | List/search · create |
| GET / PATCH / DELETE | `/api/v1/members/{id}` | Detail · update · delete |
| GET | `/api/v1/members/{id}/loans` | Books a member has out |
| GET / POST | `/api/v1/loans` | List (`?member_id=&status=active\|overdue\|returned`) · borrow |
| POST | `/api/v1/loans/{id}/return` | Record a return |
| GET | `/api/v1/loans/{id}` | Loan detail |

Errors return `{"success": false, "msg": "..."}` with `404` (missing), `409` (e.g. no copies
available / already returned / duplicate email-ISBN), `422` (validation), `401` (unauthenticated).

---

## 6. Sample client

A runnable end-to-end demo script (login → create book + member → borrow → list → return):

```bash
uv run python scripts/sample_client.py            # against http://localhost:8000
```

Or with `curl`:

```bash
BASE=http://localhost:8000/api/v1
TOKEN=$(curl -s -X POST $BASE/auth/token -H 'Content-Type: application/json' \
  -d '{"email":"staff@bookhaven.org","password":"library123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s "$BASE/books?search=dune" -H "Authorization: Bearer $TOKEN"
curl -s -X POST $BASE/loans -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"book_id":1,"member_id":1}'
```

---

## 7. Testing

```bash
make test            # unit + property + smoke (no DB)
make test-contract   # contract tests against live Postgres + Redis
make test-all        # everything
make lint            # ruff + mypy
```

| Tier | DB needed | Notes |
|------|-----------|-------|
| unit / property / smoke | no | pure logic, schemas, loan status/fine helpers |
| contract | yes | full borrow/return lifecycle + error cases over HTTP |

---

## 8. Project layout

```
app/
  api/v1/
    auth/      members/      books/      loans/     # each: schemas.py models.py services.py router.py
  core/        config, exceptions, security/jwt, database/{postgres,redis}, cache, middleware
alembic/       migration env + versions
frontend/      Next.js app
tests/         unit · properties · contract
app/seed.py    sample data loader
```

Architecture details: `docs/ARCHITECTURE.md` · adding a module: `docs/ADDING_AN_API.md` ·
deployment: `docs/DEPLOYMENT.md`.
