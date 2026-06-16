"""Contract test fixtures — requires live PostgreSQL + Redis.

Run the databases first:  docker compose up postgres redis -d  &&  make migrate
"""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("ENVIRONMENT", "local")
os.environ.setdefault(
    "DATABASE_URL",
    os.getenv("DATABASE_URL", "postgresql+psycopg://library:library@localhost:5432/library"),
)
os.environ.setdefault("REDIS_URL", os.getenv("REDIS_URL", "redis://localhost:6379/15"))
os.environ.setdefault("JWT_SECRET_KEY", "contract-test-secret-key")

CONTRACT_EMAIL = "contract-test@bookhaven.org"
CONTRACT_PASSWORD = "TestPassword123"


@pytest.fixture(scope="session")
def contract_app():
    from app.core.database.postgres import startup_postgres
    from app.core.database.redis import startup_redis
    from app.main import create_app

    startup_postgres()
    startup_redis()
    return create_app()


@pytest.fixture(scope="session")
def contract_client(contract_app):
    with TestClient(contract_app, raise_server_exceptions=False) as client:
        yield client


@pytest.fixture(scope="session")
def seeded_user(contract_app):
    """Create a test staff user in PostgreSQL and return their credentials + token."""
    from sqlalchemy import select

    from app.api.v1.auth.models import User
    from app.core.database.postgres import get_sessionmaker
    from app.core.security.jwt import create_access_token, hash_password

    Session = get_sessionmaker()
    with Session() as db:
        user = db.scalar(select(User).where(User.email == CONTRACT_EMAIL))
        if user is None:
            user = User(
                email=CONTRACT_EMAIL,
                name="Contract Test User",
                hashed_password=hash_password(CONTRACT_PASSWORD),
                roles=["staff"],
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        user_id = user.id

    token = create_access_token(str(user_id), CONTRACT_EMAIL, roles=["staff"])
    return {
        "id": user_id,
        "email": CONTRACT_EMAIL,
        "password": CONTRACT_PASSWORD,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }
