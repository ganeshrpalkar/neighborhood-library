"""Unit tests for domain exceptions."""

import pytest

from app.core.exceptions import (
    AccessDeniedError,
    AppError,
    ConflictError,
    NotFoundError,
    ValidationError,
)


def test_app_error_default_status():
    err = AppError("something failed")
    assert err.http_status == 400
    assert err.payload == {"success": False, "msg": "something failed"}


def test_app_error_custom_payload():
    err = AppError("fail", payload={"code": "E001"})
    assert err.payload == {"code": "E001"}


def test_not_found_status():
    err = NotFoundError("item not found")
    assert err.http_status == 404
    assert isinstance(err, AppError)


def test_access_denied_status():
    err = AccessDeniedError("forbidden")
    assert err.http_status == 403


def test_conflict_status():
    err = ConflictError("duplicate")
    assert err.http_status == 409


def test_validation_status():
    err = ValidationError("bad input")
    assert err.http_status == 422


def test_conflict_custom_status():
    err = ConflictError("gone", http_status=410)
    assert err.http_status == 410


def test_exceptions_are_catchable_as_app_error():
    with pytest.raises(AppError):
        raise NotFoundError("not found")

    with pytest.raises(AppError):
        raise AccessDeniedError("denied")
