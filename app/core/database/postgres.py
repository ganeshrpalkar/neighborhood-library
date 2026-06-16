"""PostgreSQL connectivity — SQLAlchemy 2.0 engine, session factory, and FastAPI dependency."""

from __future__ import annotations

import logging
from collections.abc import Generator
from datetime import datetime

from sqlalchemy import DateTime, create_engine, func, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from app.core.config import settings

_logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Declarative base shared by every ORM model."""


class TimestampMixin:
    """Adds server-managed created_at / updated_at columns to a model."""

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


# A single engine + session factory for the process. Created lazily so importing this
# module never opens a connection (keeps unit tests and Alembic import-safe).
_engine = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine():
    """Return the process-wide SQLAlchemy engine, creating it on first use."""
    global _engine
    if _engine is None:
        _engine = create_engine(
            settings.DATABASE_URL,
            echo=settings.DB_ECHO,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_pre_ping=True,
            future=True,
        )
    return _engine


def get_sessionmaker() -> sessionmaker[Session]:
    """Return the process-wide session factory, creating it on first use."""
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            bind=get_engine(),
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
            future=True,
        )
    return _SessionLocal


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency: yield a Session, commit on success, roll back on error."""
    session = get_sessionmaker()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def startup_postgres() -> None:
    """Verify the database is reachable at app startup."""
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        _logger.info("PostgreSQL connection established")
    except Exception:  # pragma: no cover - logged for ops visibility
        _logger.exception("Failed to connect to PostgreSQL on startup")


def shutdown_postgres() -> None:
    """Dispose of the engine connection pool on shutdown."""
    global _engine
    if _engine is not None:
        _engine.dispose()
        _engine = None


def postgres_health_check() -> bool:
    """Return True if a trivial query succeeds."""
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
