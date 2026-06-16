"""Business logic for authentication — never imports from fastapi."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.auth.models import User
from app.core.exceptions import ConflictError
from app.core.security.jwt import hash_password, verify_password


def get_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def register_user(db: Session, email: str, password: str, name: str | None) -> User:
    if get_by_email(db, email) is not None:
        raise ConflictError("A user with this email already exists")
    user = User(
        email=email,
        name=name or "",
        hashed_password=hash_password(password),
        roles=["staff"],
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User | None:
    """Return the user when credentials are valid, else None (router maps to 401)."""
    user = get_by_email(db, email)
    if user is None or not verify_password(password, user.hashed_password):
        return None
    return user
