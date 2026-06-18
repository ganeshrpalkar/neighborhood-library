"""Logging context, filters, JSON formatter, and dictConfig setup."""

from __future__ import annotations

import logging
import os
import uuid
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

import json_log_formatter

from app.core.config import settings

logger = logging.getLogger(__name__)


class LoggingContext:
    _correlation_id: ContextVar[str] = ContextVar("correlation_id", default="")
    _current_span_id: ContextVar[str] = ContextVar("current_span_id", default="")
    _organization_id: ContextVar[str] = ContextVar("organization_id", default="")
    _organization_name: ContextVar[str] = ContextVar("organization_name", default="")
    _user: ContextVar[str] = ContextVar("user", default="Anonymous")
    _error_occurred: ContextVar[bool] = ContextVar("error_occurred", default=False)
    _trace_buffer: ContextVar[list | None] = ContextVar("trace_buffer", default=None)

    @classmethod
    def set_correlation_id(cls, correlation_id: str) -> None:
        cls._correlation_id.set(correlation_id)

    @classmethod
    def get_correlation_id(cls) -> str:
        return cls._correlation_id.get()

    @classmethod
    def get_span_id(cls) -> str:
        return cls._current_span_id.get()

    @classmethod
    def set_span_id(cls, span_id: str) -> None:
        cls._current_span_id.set(span_id)

    @classmethod
    def generate_span_id(cls) -> str:
        span_id = uuid.uuid4().hex[:8]
        cls.set_span_id(span_id)
        return span_id

    @classmethod
    def set_organization_context(cls, org_id: str, org_name: str) -> None:
        cls._organization_id.set(org_id)
        cls._organization_name.set(org_name)

    @classmethod
    def get_context(cls) -> dict[str, Any]:
        return {
            "correlation_id": cls._correlation_id.get(),
            "span_id": cls._current_span_id.get(),
            "organization_id": cls._organization_id.get(),
            "organization_name": cls._organization_name.get(),
            "user": cls._user.get(),
        }

    @classmethod
    def clear_context(cls) -> None:
        cls._correlation_id.set("")
        cls._current_span_id.set("")
        cls._organization_id.set("")
        cls._organization_name.set("")
        cls._user.set("Anonymous")
        cls._error_occurred.set(False)
        cls._trace_buffer.set([])

    @classmethod
    def set_user_context(cls, user_email: str) -> None:
        cls._user.set(user_email)

    @classmethod
    def get_user_context(cls) -> str:
        return cls._user.get()

    @classmethod
    def set_error_occurred(cls, error: bool = True) -> None:
        cls._error_occurred.set(error)

    @classmethod
    def has_error_occurred(cls) -> bool:
        return cls._error_occurred.get()


class ExcludeBaseViewsFilter(logging.Filter):
    def filter(self, record):
        return True


class CustomisedJSONFormatter(json_log_formatter.JSONFormatter):
    def json_record(self, message: str, extra: dict, record: logging.LogRecord) -> dict:
        try:
            context_data = LoggingContext.get_context()
            for field in ("correlation_id", "span_id", "organization_id", "organization_name"):
                extra[field] = context_data.get(field, "")
            extra["trace_id"] = context_data.get("correlation_id", "")
            if "user" not in extra or not extra["user"]:
                extra["user"] = context_data.get("user", "Anonymous")
        except Exception:
            pass

        extra["service"] = extra.get("service", settings.SERVICE_NAME)
        extra.pop("function", None)
        extra.pop("funcName", None)
        extra["log.level"] = record.levelname
        extra["line_number"] = record.lineno

        if "@timestamp" not in extra:
            extra["@timestamp"] = datetime.now(UTC).isoformat()

        if record.exc_info:
            extra["exc_info"] = self.formatException(record.exc_info)

        extra["message"] = message

        if "taskName" in extra and not extra["taskName"]:
            extra.pop("taskName")

        for field in (
            "remote_address",
            "request_method",
            "request_path",
            "run_time",
            "status_code",
            "user",
            "headers",
            "request_body",
            "response_body",
            "query_params",
        ):
            if hasattr(record, field) and field not in extra:
                extra[field] = getattr(record, field)

        module_path = getattr(record, "pathname", "")
        func_name = record.funcName or "unknown"
        path_parts = os.path.normpath(module_path).split(os.sep) if module_path else []
        extra["app"] = path_parts[-3] if len(path_parts) >= 3 else "unknown"
        extra["module"] = os.path.splitext(path_parts[-1])[0] if path_parts else "unknown"
        extra["function_name"] = func_name

        return extra


def get_logging_config() -> dict[str, Any]:
    debug_handlers = ["debug_log", "console"] if settings.DEBUG_MODE else ["debug_log"]

    handlers: dict[str, Any] = {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
        "rotating_file": {
            "level": "INFO",
            "class": settings.ROTATING_HANDLER_CLASS,
            "filename": settings.LOG_FILE_PATH,
            "maxBytes": settings.LOGFILE_SIZE,
            "backupCount": settings.LOGFILE_COUNT,
            "formatter": "json",
        },
        "celery_log": {
            "level": "INFO",
            "class": settings.ROTATING_HANDLER_CLASS,
            "filename": settings.CELERY_LOGFILE,
            "maxBytes": settings.LOGFILE_SIZE,
            "backupCount": settings.LOGFILE_COUNT,
            "formatter": "json",
        },
        "debug_log": {
            "level": "DEBUG",
            "class": settings.ROTATING_HANDLER_CLASS,
            "maxBytes": settings.LOGFILE_SIZE,
            "backupCount": settings.LOGFILE_COUNT,
            "filename": settings.DEBUG_LOGFILE,
            "formatter": "json",
        },
    }

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "simple": {
                "format": "[%(asctime)s]-%(filename)s-%(funcName)s()-%(lineno)d-%(levelname)-2s-%(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "json": {
                "()": "app.core.logging_setup.CustomisedJSONFormatter",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": handlers,
        "loggers": {
            "debug_log": {
                "handlers": debug_handlers,
                "level": "DEBUG" if settings.DEBUG_MODE else "INFO",
                "propagate": False,
            },
            "celery_log": {
                "handlers": ["celery_log"],
                "level": "INFO",
                "propagate": False,
            },
        },
        "root": {
            "handlers": ["console"],
            "level": "WARNING",
        },
    }


_logging_configured: bool = False


def setup_logging() -> None:
    """Apply logging configuration. Idempotent — safe to call from lifespan and Celery worker."""
    global _logging_configured
    if _logging_configured:
        return
    from logging.config import dictConfig

    dictConfig(get_logging_config())
    _logging_configured = True
