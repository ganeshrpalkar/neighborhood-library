"""Sync Redis connection pool."""

from __future__ import annotations

from collections.abc import Generator
from typing import Any

import redis

from app.core.config import settings

_redis_pool: redis.ConnectionPool | None = None
_redis_client: redis.Redis | None = None
_redis_cache_pool: redis.ConnectionPool | None = None
_redis_cache_client: redis.Redis | None = None


def _pool_kwargs(*, decode_responses: bool) -> dict:
    return {
        "socket_connect_timeout": settings.REDIS_SOCKET_CONNECT_TIMEOUT,
        "socket_timeout": settings.REDIS_SOCKET_TIMEOUT,
        "decode_responses": decode_responses,
    }


def startup_redis() -> None:
    """Initialize Redis pools on application startup."""
    global _redis_pool, _redis_client, _redis_cache_pool, _redis_cache_client

    _redis_pool = redis.ConnectionPool.from_url(
        settings.REDIS_URL,
        **_pool_kwargs(decode_responses=True),
    )
    _redis_client = redis.Redis(connection_pool=_redis_pool)

    _redis_cache_pool = redis.ConnectionPool.from_url(
        settings.REDIS_URL,
        **_pool_kwargs(decode_responses=False),
    )
    _redis_cache_client = redis.Redis(connection_pool=_redis_cache_pool)


def shutdown_redis() -> None:
    """Close Redis connection pools on application shutdown."""
    global _redis_pool, _redis_client, _redis_cache_pool, _redis_cache_client

    if _redis_client is not None:
        _redis_client.close()
    if _redis_cache_client is not None:
        _redis_cache_client.close()
    if _redis_pool is not None:
        _redis_pool.disconnect()
    if _redis_cache_pool is not None:
        _redis_cache_pool.disconnect()

    _redis_client = None
    _redis_pool = None
    _redis_cache_client = None
    _redis_cache_pool = None


def redis_health_check() -> dict[str, Any]:
    """Ping Redis and return health status."""
    if _redis_client is None:
        return {"status": "unavailable", "detail": "Redis client is not initialized"}
    try:
        if _redis_client.ping():
            return {"status": "ok"}
        return {"status": "error", "detail": "Redis ping returned False"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


def get_redis_client() -> redis.Redis:
    """Return the shared sync Redis client (UTF-8 decoded strings)."""
    global _redis_client, _redis_pool
    if _redis_client is None:
        startup_redis()
    assert _redis_client is not None
    return _redis_client


def get_redis_cache_client() -> redis.Redis:
    """Return Redis client for HTTP cache keys (binary)."""
    global _redis_cache_client, _redis_cache_pool
    if _redis_cache_client is None:
        startup_redis()
    assert _redis_cache_client is not None
    return _redis_cache_client


def get_redis() -> Generator[redis.Redis, None, None]:
    """FastAPI dependency that yields the shared Redis client."""
    yield get_redis_client()


def cache_key(prefix: str, *parts: str) -> str:
    """Build a prefixed cache key."""
    joined = ":".join(str(part) for part in parts if part is not None)
    if joined:
        return f"{settings.REDIS_KEY_PREFIX}:{prefix}:{joined}"
    return f"{settings.REDIS_KEY_PREFIX}:{prefix}"
