"""Global pytest fixtures."""

from __future__ import annotations

import os

# IMPORTANT: set env defaults BEFORE importing anything from `app`, because
# importing app.core.config instantiates the settings singleton immediately.
os.environ.setdefault("ENVIRONMENT", "local")
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://library:library@localhost:5432/library")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("ENABLE_DOCS", "true")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.security.jwt import UserContext, create_access_token  # noqa: E402


@pytest.fixture(scope="session")
def app():
    from app.main import create_app

    return create_app()


@pytest.fixture(scope="session")
def test_client(app):
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


@pytest.fixture
def admin_user() -> UserContext:
    return UserContext(user_id="1", email="admin@bookhaven.org", roles=["admin", "staff"])


@pytest.fixture
def regular_user() -> UserContext:
    return UserContext(user_id="2", email="staff@bookhaven.org", roles=["staff"])


@pytest.fixture
def admin_token(admin_user: UserContext) -> str:
    return create_access_token(
        user_id=admin_user.user_id,
        email=admin_user.email,
        roles=admin_user.roles,
    )


@pytest.fixture
def user_token(regular_user: UserContext) -> str:
    return create_access_token(
        user_id=regular_user.user_id,
        email=regular_user.email,
        roles=regular_user.roles,
    )


@pytest.fixture
def auth_headers(user_token: str) -> dict:
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture
def admin_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}
