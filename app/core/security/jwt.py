"""HS256 JWT authentication — token creation, decoding, and FastAPI dependencies."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings

_bearer_scheme = HTTPBearer(auto_error=True)
_bearer_optional = HTTPBearer(auto_error=False)

# bcrypt operates on the first 72 bytes of the password.
_BCRYPT_MAX_BYTES = 72


@dataclass
class UserContext:
    """Authenticated user resolved from a JWT token."""

    user_id: str
    email: str
    roles: list[str] = field(default_factory=list)
    is_authenticated: bool = True

    @property
    def is_admin(self) -> bool:
        return "admin" in self.roles


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    pw = password.encode("utf-8")[:_BCRYPT_MAX_BYTES]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:_BCRYPT_MAX_BYTES], hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(
    user_id: str,
    email: str,
    roles: list[str] | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed HS256 JWT access token."""
    expire = datetime.now(UTC) + (expires_delta or timedelta(minutes=settings.JWT_EXPIRY_MINUTES))
    payload = {
        "sub": user_id,
        "email": email,
        "roles": roles or [],
        "exp": expire,
        "iat": datetime.now(UTC),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def _token_to_user_context(token: str) -> UserContext:
    payload = decode_token(token)
    user_id: str | None = payload.get("sub")
    email: str | None = payload.get("email")
    roles: list[str] = payload.get("roles", [])

    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return UserContext(user_id=user_id, email=email, roles=roles)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> UserContext:
    """FastAPI dependency: require a valid Bearer token."""
    return _token_to_user_context(credentials.credentials)


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_optional),
) -> UserContext | None:
    """FastAPI dependency: resolve user from Bearer token if present, else None."""
    if credentials is None:
        return None
    try:
        return _token_to_user_context(credentials.credentials)
    except HTTPException:
        return None
