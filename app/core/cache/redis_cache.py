"""
Sync Redis cache decorator for FastAPI sync route handlers.

Key format: ``{REDIS_KEY_PREFIX}:2:<logical_key>``
Values are JSON + optional zlib compression for payloads > 4KB.
"""

from __future__ import annotations

import hashlib
import json
import logging
import random
import zlib
from collections.abc import Callable
from functools import wraps
from typing import Any, ParamSpec, TypeVar, cast

from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings
from app.core.database.redis import get_redis_cache_client

P = ParamSpec("P")
R = TypeVar("R")

logger = logging.getLogger(__name__)

COMPRESS_THRESHOLD = 4096
LOCK_TTL = 10
LOCK_WAIT_MS = 50
LOCK_MAX_WAIT_MS = 2000

_VERSION_LOCAL_TTL = 5.0
_version_local: dict[str, tuple[int, float]] = {}

_CACHE_TTL_MAP: dict[str, int] = {
    "book_list": 120,
    "book_detail": 60,
    "member_list": 120,
    "loan_list": 60,
}


def _redis_key(key: str) -> str:
    return f"{settings.REDIS_KEY_PREFIX}:2:{key}"


def _resolve_user(request: Request, kwargs: dict):
    for candidate in (
        kwargs.get("current_user"),
        kwargs.get("user"),
        getattr(request.state, "user", None),
    ):
        if candidate is not None:
            return candidate
    return None


def _user_scope_token(user) -> str:
    user_id = getattr(user, "user_id", None) or getattr(user, "id", None)
    return str(user_id) if user_id else "anon"


def _build_cache_key(request: Request, user, prefix: str) -> str:
    scope_key = f"user:{_user_scope_token(user)}"

    params: dict[str, Any] = {}
    for key, value in request.query_params.multi_items():
        if key == "nocache":
            continue
        if key in params:
            existing = params[key]
            if isinstance(existing, list):
                existing.append(value)
            else:
                params[key] = [existing, value]
        else:
            params[key] = value

    normalized: dict[str, Any] = {}
    for key, values in params.items():
        if isinstance(values, list):
            normalized[key] = sorted(values) if len(values) > 1 else values[0]
        else:
            normalized[key] = values

    param_hash = hashlib.sha256(json.dumps(normalized, sort_keys=True, default=str).encode()).hexdigest()
    return f"cache:{scope_key}:{prefix}:{request.url.path}:{param_hash}"


def _jitter_ttl(ttl: int) -> int:
    return max(1, int(ttl * random.uniform(0.9, 1.1)))


def _pack_payload(data: Any, status_code: int) -> dict:
    raw = json.dumps({"data": data, "status": status_code}, default=str)
    if len(raw) > COMPRESS_THRESHOLD:
        return {"c": True, "b": zlib.compress(raw.encode()).hex()}
    return {"c": False, "p": {"data": data, "status": status_code}}


def _unpack_payload(stored: dict) -> tuple[Any, int]:
    if stored.get("c"):
        raw = zlib.decompress(bytes.fromhex(stored["b"])).decode()
        parsed = json.loads(raw)
        return parsed["data"], parsed["status"]
    payload = stored["p"]
    return payload["data"], payload["status"]


def _load_cached(raw: Any) -> dict | None:
    if raw is None:
        return None
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, (bytes, str)):
        try:
            text = raw.decode("utf-8") if isinstance(raw, bytes) else raw
            return json.loads(text)
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None
    return None


def resolve_ttl(cache_key_prefix: str, default: int = 300) -> int:
    return _CACHE_TTL_MAP.get(cache_key_prefix, default)


def redis_cache_response(
    ttl: int = 300,
    cache_key_prefix: str = "view",
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Decorator for sync GET route handlers. Caches responses in Redis."""

    def decorator(route_func: Callable[P, R]) -> Callable[P, R]:
        @wraps(route_func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            request: Request | None = cast("Request | None", kwargs.get("request"))
            if request is None:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            user = _resolve_user(request, kwargs) if request else None

            if request is None or user is None or request.method != "GET":
                return route_func(*args, **kwargs)
            if request.query_params.get("nocache") in ("1", "true", "True"):
                return route_func(*args, **kwargs)

            ck = _build_cache_key(request, user, cache_key_prefix)
            client = get_redis_cache_client()

            try:
                cached = _load_cached(client.get(_redis_key(ck)))
                if cached is not None:
                    data, status_code = _unpack_payload(cached)
                    return cast(R, JSONResponse(content=data, status_code=status_code))
            except Exception:
                logger.debug("Redis cache read failed for key: %s", ck, exc_info=True)

            response = route_func(*args, **kwargs)
            status_code = 200
            body: Any = response

            if isinstance(response, JSONResponse):
                status_code = response.status_code
                if status_code == 200:
                    body = json.loads(bytes(response.body).decode())
            elif isinstance(response, Response):
                status_code = response.status_code
                body = json.loads(bytes(response.body).decode()) if response.body else {}
            elif isinstance(response, tuple) and len(response) == 2:
                body, status_code = response[0], int(response[1])

            if status_code == 200:
                try:
                    packed = _pack_payload(body, status_code)
                    effective_ttl = resolve_ttl(cache_key_prefix, default=ttl)
                    client.setex(
                        _redis_key(ck),
                        _jitter_ttl(effective_ttl),
                        json.dumps(packed, default=str).encode("utf-8"),
                    )
                except Exception:
                    logger.warning("Redis cache write failed for key: %s", ck)

            return response

        return wrapper

    return decorator


def invalidate_cache_for_user(user_id: str, prefix: str) -> None:
    """Invalidate all cache keys for a given user and prefix (pattern-delete)."""
    client = get_redis_cache_client()
    pattern = _redis_key(f"cache:user:{user_id}:{prefix}:*")
    try:
        keys = client.keys(pattern)
        if keys:
            client.delete(*keys)
    except Exception:
        logger.warning("Failed to invalidate cache for user %s prefix %s", user_id, prefix)
