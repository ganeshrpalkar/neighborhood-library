"""Unit tests for JWT security utilities."""

from __future__ import annotations

import time
from datetime import timedelta

import pytest
from fastapi import HTTPException

from app.core.security.jwt import (
    UserContext,
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_create_and_decode_token():
    token = create_access_token("user-1", "test@example.com", roles=["user"])
    payload = decode_token(token)
    assert payload["sub"] == "user-1"
    assert payload["email"] == "test@example.com"
    assert "user" in payload["roles"]


def test_token_contains_expiry():
    token = create_access_token("user-1", "test@example.com")
    payload = decode_token(token)
    assert "exp" in payload
    assert payload["exp"] > time.time()


def test_expired_token_raises():
    token = create_access_token("user-1", "test@example.com", expires_delta=timedelta(seconds=-1))
    with pytest.raises(HTTPException) as exc_info:
        decode_token(token)
    assert exc_info.value.status_code == 401


def test_invalid_token_raises():
    with pytest.raises(HTTPException) as exc_info:
        decode_token("not.a.valid.token")
    assert exc_info.value.status_code == 401


def test_password_hash_and_verify():
    password = "MySecurePassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)


def test_wrong_password_fails_verify():
    hashed = hash_password("correct-password")
    assert not verify_password("wrong-password", hashed)


def test_user_context_is_admin():
    user = UserContext(user_id="1", email="a@b.com", roles=["admin"])
    assert user.is_admin is True


def test_user_context_not_admin():
    user = UserContext(user_id="1", email="a@b.com", roles=["user"])
    assert user.is_admin is False
