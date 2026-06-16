"""Application settings."""

from __future__ import annotations

import ast
from pathlib import Path
from typing import Any, ClassVar

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

_DEFAULT_CORS_HEADERS = (
    "accept",
    "accept-encoding",
    "accept-language",
    "authorization",
    "cache-control",
    "content-type",
    "dnt",
    "expires",
    "if-modified-since",
    "if-none-match",
    "origin",
    "pragma",
    "referer",
    "traceparent",
    "tracestate",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-request-id",
)


def _parse_bool(value: str | bool | None, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    return str(value).lower() in ("1", "true", "yes")


def _parse_list_env(raw: str | None) -> list[str]:
    if not raw:
        return []
    raw = raw.strip()
    if raw.startswith("["):
        try:
            parsed = ast.literal_eval(raw)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
        except (ValueError, SyntaxError):
            pass
    return [item.strip() for item in raw.split(",") if item.strip()]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(BASE_DIR / ".env"), str(BASE_DIR / "app" / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    BASE_DIR: Path = BASE_DIR

    # --- Security ---
    SECRET_KEY: str | None = None

    @model_validator(mode="after")
    def _require_secret_key_in_production(self) -> Settings:
        env = (self.ENVIRONMENT or "local").lower()
        if env not in ("local", "test") and not self.SECRET_KEY:
            raise ValueError(
                "SECRET_KEY must be set in non-local environments. "
                'Generate with: python -c "import secrets; print(secrets.token_hex(32))"'
            )
        return self

    DEBUG: bool = False
    ENABLE_DOCS: bool = False
    ALLOWED_HOSTS: str = "['*']"
    ENVIRONMENT: str = "local"

    # --- JWT (HS256) ---
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 30

    # --- PostgreSQL ---
    DATABASE_URL: str = "postgresql+psycopg://library:library@localhost:5432/library"
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_ECHO: bool = False

    # --- Lending rules ---
    LOAN_PERIOD_DAYS: int = 14
    FINE_PER_DAY: float = 0.50

    # --- Redis ---
    REDIS_URL: str = "redis://localhost:6379/1"
    REDIS_KEY_PREFIX: str = "app"
    REDIS_SOCKET_CONNECT_TIMEOUT: int = 2
    REDIS_SOCKET_TIMEOUT: int = 2

    # --- CORS ---
    CORS_ALLOWED_ORIGINS: str | None = None
    CORS_ALLOWED_ORIGIN: str | None = None
    CORS_EXTRA_ALLOW_HEADERS: str = ""
    CORS_ALLOW_ALL_ORIGINS: bool = False
    CORS_ALLOWED_ORIGINS_LIST: list[str] = Field(default_factory=list)
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_HEADERS: list[str] = Field(default_factory=list)

    # --- Logging ---
    LOG_FILE: str = "/tmp/app_fastapi.log"
    DEBUG_LOGFILE: str = "/tmp/app_fastapi_debug.log"
    CELERY_LOGFILE: str = "/tmp/app_celery.log"
    LOGFILE_SIZE: int = 5242880
    LOGFILE_COUNT: int = 5
    SERVICE_NAME: str = "fastapi-app"
    SERVICE_VERSION: str = "1.0.0"
    ENABLE_REQUEST_BODY_LOGGING: bool = True
    ENABLE_RESPONSE_BODY_LOGGING: bool = True
    ENABLE_FUNCTION_TRACING: bool = False
    MAX_LOG_DATA_LENGTH: int = 300
    TRACE_ON_ERROR_ONLY: bool = True

    # --- Celery ---
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    CELERY_ACCEPT_CONTENT: list[str] = Field(default_factory=lambda: ["application/json"])
    CELERY_TASK_SERIALIZER: str = "json"
    CELERY_RESULT_SERIALIZER: str = "json"
    CELERY_TIMEZONE: str = "UTC"
    CELERY_ENABLE_UTC: bool = True
    CELERYD_TASK_SOFT_TIME_LIMIT: int = 1000

    # --- Runtime tuning ---
    THREADPOOL_MAX_THREADS: int = 40
    PROMETHEUS_METRICS_ENABLED: bool = False
    RATE_LIMIT_ENABLED: bool = False
    RATE_LIMIT_DEFAULT: str = "100/minute"

    # --- Cache TTL ---
    CACHE_WARM_TTL_DAYS: int = 1

    # --- Static constants ---
    SENSITIVE_KEYS: ClassVar[list[str]] = [
        "access-token",
        "refresh-token",
        "sub",
        "access_token",
        "refresh_token",
        "password",
        "secret",
        "key",
        "token",
        "authorization",
        "auth",
        "client_secret",
        "api_key",
        "private_key",
        "jwt",
        "bearer",
    ]
    ROTATING_HANDLER_CLASS: ClassVar[str] = "logging.handlers.RotatingFileHandler"
    _CACHE_TTL_DEFAULTS: ClassVar[dict[str, int]] = {
        "book_list": 120,
        "book_detail": 60,
        "member_list": 120,
        "loan_list": 60,
    }

    @field_validator("DEBUG", "ENABLE_DOCS", "DB_ECHO", mode="before")
    @classmethod
    def parse_debug(cls, value: Any) -> bool:
        return _parse_bool(value)

    @property
    def allowed_hosts_list(self) -> list[str]:
        return _parse_list_env(self.ALLOWED_HOSTS)

    @property
    def CACHE_TTL(self) -> dict[str, int]:
        return dict(self._CACHE_TTL_DEFAULTS)

    @property
    def LOG_FILE_PATH(self) -> str:
        return self.LOG_FILE

    @property
    def DEBUG_MODE(self) -> bool:
        return self.DEBUG

    @model_validator(mode="after")
    def finalize_settings(self) -> Settings:
        if not Path(self.LOG_FILE).is_absolute():
            object.__setattr__(self, "LOG_FILE", str(BASE_DIR / self.LOG_FILE))

        self.ENABLE_FUNCTION_TRACING = self.DEBUG

        raw_cors = self.CORS_ALLOWED_ORIGINS or self.CORS_ALLOWED_ORIGIN
        cors_origins: list[str] = []
        if raw_cors:
            cors_origins = _parse_list_env(raw_cors)
        if self.DEBUG and not cors_origins:
            cors_origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:8080",
                "http://127.0.0.1:8080",
            ]
        if cors_origins == ["*"] or "*" in cors_origins:
            self.CORS_ALLOW_ALL_ORIGINS = True
            self.CORS_ALLOWED_ORIGINS_LIST = []
            self.CORS_ALLOW_CREDENTIALS = False
        else:
            self.CORS_ALLOW_ALL_ORIGINS = False
            self.CORS_ALLOWED_ORIGINS_LIST = cors_origins
            self.CORS_ALLOW_CREDENTIALS = True

        extra_headers = [h.strip().lower() for h in self.CORS_EXTRA_ALLOW_HEADERS.split(",") if h.strip()]
        allow_headers: list[str] = []
        for header in (*_DEFAULT_CORS_HEADERS, *extra_headers):
            if header not in allow_headers:
                allow_headers.append(header)
        self.CORS_ALLOW_HEADERS = allow_headers

        return self


settings = Settings()
