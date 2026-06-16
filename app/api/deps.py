"""Shared FastAPI dependencies."""

from __future__ import annotations

from app.core.database.postgres import get_session
from app.core.database.redis import get_redis
from app.core.security.jwt import UserContext, get_current_user, get_optional_user

__all__ = [
    "UserContext",
    "get_current_user",
    "get_optional_user",
    "get_session",
    "get_redis",
]
