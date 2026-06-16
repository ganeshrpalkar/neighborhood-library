"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database.postgres import shutdown_postgres, startup_postgres
from app.core.database.redis import shutdown_redis, startup_redis
from app.core.exceptions import (
    AccessDeniedError,
    AppError,
    ConflictError,
    NotFoundError,
    ValidationError,
)
from app.core.logging_setup import setup_logging
from app.core.middleware.cors_reflect import CorsReflectHeadersMiddleware
from app.core.middleware.logging_middleware import LoggingMiddleware

_logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import anyio

    anyio.to_thread.current_default_thread_limiter().total_tokens = settings.THREADPOOL_MAX_THREADS
    setup_logging()
    startup_postgres()
    startup_redis()
    # To enable startup cache warming, uncomment:
    # from app.core.cache.warming import start_cache_warming
    # start_cache_warming()
    yield
    shutdown_redis()
    shutdown_postgres()


def create_app() -> FastAPI:
    allow_all = settings.CORS_ALLOW_ALL_ORIGINS
    origins = settings.CORS_ALLOWED_ORIGINS_LIST
    allow_credentials = settings.CORS_ALLOW_CREDENTIALS

    app = FastAPI(
        title="Neighborhood Library Service",
        version=settings.SERVICE_VERSION,
        lifespan=lifespan,
        docs_url="/docs" if settings.ENABLE_DOCS else None,
        redoc_url="/redoc" if settings.ENABLE_DOCS else None,
        openapi_url="/openapi.json" if settings.ENABLE_DOCS else None,
    )

    if allow_all:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=allow_credentials,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.add_middleware(CorsReflectHeadersMiddleware)
    app.add_middleware(LoggingMiddleware)

    try:
        from slowapi import _rate_limit_exceeded_handler
        from slowapi.errors import RateLimitExceeded

        from app.core.limiter import limiter

        limiter.enabled = settings.RATE_LIMIT_ENABLED
        app.state.limiter = limiter
        app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    except ImportError:
        pass

    if settings.PROMETHEUS_METRICS_ENABLED:
        try:
            from prometheus_fastapi_instrumentator import Instrumentator

            Instrumentator().instrument(app).expose(
                app,
                endpoint="/metrics",
                include_in_schema=settings.DEBUG,
            )
        except ImportError:
            pass

    app.include_router(api_router, prefix="/api")

    @app.get("/api/health")
    def health_check():
        from app.core.database.postgres import postgres_health_check
        from app.core.database.redis import redis_health_check

        postgres_ok = postgres_health_check()
        redis_status = redis_health_check()
        redis_ok = redis_status.get("status") == "ok"
        both_ok = postgres_ok and redis_ok
        status_code = 200 if both_ok else 503
        return JSONResponse(
            content={
                "status": "ok" if both_ok else "degraded",
                "postgres": postgres_ok,
                "redis": redis_ok,
            },
            status_code=status_code,
        )

    _APP_ERROR_STATUS = {
        NotFoundError: 404,
        AccessDeniedError: 403,
        ConflictError: 409,
        ValidationError: 422,
    }

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        mapped = next(
            (code for cls, code in _APP_ERROR_STATUS.items() if isinstance(exc, cls)),
            None,
        )
        status = mapped if mapped is not None and exc.http_status == mapped else exc.http_status
        return JSONResponse(status_code=status, content=exc.payload)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        _logger.exception(
            "Unhandled exception",
            extra={"path": str(request.url.path)},
        )
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "success": False},
        )

    return app


app = create_app()
