# Getting Started

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (recommended) or pip
- PostgreSQL 16+ (local or managed)
- Redis 7.2+ (local or cloud)
- Docker + Docker Compose (for containerized local dev)

## Option A: Docker Compose (simplest)

Starts PostgreSQL and Redis automatically alongside the API. The dockerized
`postgres` service runs Postgres 16 with user / password / database all set to
`library` on port 5432:

```bash
# 1. Clone and configure
cp .env.template .env
# Edit .env — at minimum set JWT_SECRET_KEY and SECRET_KEY

# 2. Start everything
docker compose up -d

# 3. Apply database migrations
make migrate

# 4. Check health
curl http://localhost:8000/api/health
```

The API runs on `http://localhost:8000`.

## Option B: Run locally with uv

Assumes PostgreSQL and Redis are running locally:

```bash
# 1. Install dependencies
uv sync

# 2. Start the database (dockerized Postgres 16)
docker compose up postgres redis -d

# 3. Configure environment
cp .env.template .env
# Edit .env:
#   DATABASE_URL=postgresql+psycopg://library:library@localhost:5432/library
#   REDIS_URL=redis://localhost:6379/1
#   JWT_SECRET_KEY=any-secret-key-for-local
#   DEBUG=true
#   ENABLE_DOCS=true

# 4. Apply database migrations
make migrate

# 5. Start the development server
make dev   # uvicorn app.main:app --reload --port 8000
```

## Start Redis locally

```bash
# macOS (Homebrew)
brew install redis && brew services start redis

# Docker
docker run -d -p 6379:6379 redis:7.2-alpine

# Linux
sudo apt install redis-server && sudo systemctl start redis
```

## Database migrations

Schema is managed by Alembic, not by auto-creating tables on startup:

```bash
make migrate                       # alembic upgrade head — apply pending migrations
make migration m="add books table" # alembic revision --autogenerate — create a new migration
```

Always run `make migrate` after pulling new code or adding a model.

## First API call

Register a user:
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "me@example.com", "password": "SecurePass123"}'
```

Get a token:
```bash
curl -X POST http://localhost:8000/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email": "me@example.com", "password": "SecurePass123"}'
```

Use the token to list books:
```bash
TOKEN="paste-your-token-here"
curl http://localhost:8000/api/v1/books \
  -H "Authorization: Bearer $TOKEN"
```

## OpenAPI docs

Set `ENABLE_DOCS=true` and `DEBUG=true` in `.env`, then visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Running Celery worker

```bash
# In a separate terminal
uv run celery -A app.core.celery_app worker --loglevel=INFO --concurrency=2 -Q default
```

Or via docker compose:
```bash
docker compose up worker -d
```

## Running tests

```bash
# Fast tests (no DB)
make test

# Contract tests (needs PostgreSQL + Redis running, migrations applied)
docker compose up postgres redis -d && make migrate
make test-contract

# All tests
make test-all

# Coverage
make coverage
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `could not connect to server` / connection refused | Check `DATABASE_URL` in `.env` — is PostgreSQL running? |
| `relation "books" does not exist` | Run `make migrate` to apply Alembic migrations |
| `Redis client is not initialized` | Check `REDIS_URL` in `.env` — is Redis running? |
| `401 Unauthorized` | Token expired or wrong `JWT_SECRET_KEY` |
| `422 Unprocessable Entity` | Request body doesn't match schema — check `/docs` |
| Import errors on startup | Run `uv sync` to ensure all deps are installed |
| Port 8000 already in use | Change `--port` flag or stop conflicting process |
