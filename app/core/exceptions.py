"""Domain exceptions — HTTP mapping happens in app.main exception handlers."""

from __future__ import annotations


class AppError(Exception):
    """Application error with structured payload and explicit HTTP status."""

    def __init__(
        self,
        message: str,
        payload: dict | None = None,
        *,
        http_status: int = 400,
    ) -> None:
        self.http_status = http_status
        self.payload = payload if payload is not None else {"success": False, "msg": message}
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, message: str, payload: dict | None = None) -> None:
        super().__init__(message, payload, http_status=404)


class AccessDeniedError(AppError):
    def __init__(self, message: str, payload: dict | None = None) -> None:
        super().__init__(message, payload, http_status=403)


class ConflictError(AppError):
    def __init__(
        self,
        message: str,
        payload: dict | None = None,
        *,
        http_status: int = 409,
    ) -> None:
        super().__init__(message, payload, http_status=http_status)


class ValidationError(AppError):
    def __init__(
        self,
        message: str,
        payload: dict | None = None,
        *,
        http_status: int = 422,
    ) -> None:
        super().__init__(message, payload, http_status=http_status)
