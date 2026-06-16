# Configuration Reference

All settings are in `app/core/config.py` using Pydantic BaseSettings. Values are loaded from:
1. Environment variables (highest priority)
2. `.env` file in project root
3. `app/.env` file
4. Defaults defined in `Settings` class

## Core

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ENVIRONMENT` | str | `local` | `local` \| `staging` \| `production` |
| `SECRET_KEY` | str | None | Required in non-local envs. `openssl rand -hex 32` |
| `DEBUG` | bool | `false` | Enables verbose logging, localhost CORS, docs |
| `ENABLE_DOCS` | bool | `false` | Enables `/docs`, `/redoc`, `/openapi.json` |
| `ALLOWED_HOSTS` | str | `["*"]` | JSON array or comma-separated list of allowed hosts |

## JWT Authentication

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `JWT_SECRET_KEY` | str | `change-me-in-production` | HS256 signing key |
| `JWT_ALGORITHM` | str | `HS256` | JWT algorithm (do not change) |
| `JWT_EXPIRY_MINUTES` | int | `30` | Token expiry in minutes |

## PostgreSQL

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DATABASE_URL` | str | None | SQLAlchemy connection URL, e.g. `postgresql+psycopg://library:library@localhost:5432/library` |
| `DB_POOL_SIZE` | int | `5` | SQLAlchemy connection pool size (optional) |
| `DB_MAX_OVERFLOW` | int | `10` | Extra connections allowed beyond the pool (optional) |
| `DB_ECHO` | bool | `false` | Log all SQL statements (optional, debugging) |

## Redis

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `REDIS_URL` | str | `redis://localhost:6379/1` | Redis connection URL |
| `REDIS_KEY_PREFIX` | str | `app` | Prefix for all Redis keys |
| `REDIS_SOCKET_CONNECT_TIMEOUT` | int | `2` | Connection timeout (seconds) |
| `REDIS_SOCKET_TIMEOUT` | int | `2` | Socket timeout (seconds) |

## CORS

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CORS_ALLOWED_ORIGINS` | str | None | Comma-separated or JSON list of allowed origins |
| `CORS_EXTRA_ALLOW_HEADERS` | str | `""` | Additional allowed request headers |

When `DEBUG=true` and no origins are set, localhost origins are auto-added.  
Setting `CORS_ALLOWED_ORIGINS=*` allows all origins (sets `CORS_ALLOW_ALL_ORIGINS=true`).

## Celery

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CELERY_BROKER_URL` | str | `redis://localhost:6379/0` | Celery broker |
| `CELERY_RESULT_BACKEND` | str | `redis://localhost:6379/0` | Task result backend |
| `CELERYD_TASK_SOFT_TIME_LIMIT` | int | `1000` | Soft time limit (seconds) |

## Logging

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `LOG_FILE` | str | `/tmp/app_fastapi.log` | Main log file |
| `DEBUG_LOGFILE` | str | `/tmp/app_fastapi_debug.log` | Debug log file |
| `CELERY_LOGFILE` | str | `/tmp/app_celery.log` | Celery worker log file |
| `LOGFILE_SIZE` | int | `5242880` | Max log file size (bytes) |
| `LOGFILE_COUNT` | int | `5` | Number of rotating backup files |
| `SERVICE_NAME` | str | `fastapi-app` | Service name in log records |
| `SERVICE_VERSION` | str | `1.0.0` | Service version in log records |
| `ENABLE_REQUEST_BODY_LOGGING` | bool | `true` | Log request bodies |
| `ENABLE_RESPONSE_BODY_LOGGING` | bool | `true` | Log response bodies (non-GET) |

## Runtime tuning

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `THREADPOOL_MAX_THREADS` | int | `40` | AnyIO thread pool size (for sync routes) |
| `GUNICORN_WORKERS` | int | `2` | Number of gunicorn workers (set in container ENV) |
| `CELERY_CONCURRENCY` | int | `2` | Celery worker concurrency (set in container ENV) |
| `RATE_LIMIT_ENABLED` | bool | `false` | Enable SlowAPI rate limiting |
| `RATE_LIMIT_DEFAULT` | str | `100/minute` | Default rate limit |
| `PROMETHEUS_METRICS_ENABLED` | bool | `false` | Enable `/metrics` endpoint |

## Cache TTL

Cache TTLs are defined as class-level defaults in `Settings._CACHE_TTL_DEFAULTS`.
To customize, edit the dict in `config.py` or add your own prefix.

Default TTLs:
- `book_list`: 120 seconds
- `book_detail`: 60 seconds
