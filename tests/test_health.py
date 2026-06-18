"""Health endpoint tests."""

import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.contract


def test_health_returns_json(test_client: TestClient):
    response = test_client.get("/api/health")
    assert response.status_code in (200, 503)
    body = response.json()
    assert "status" in body
    assert "postgres" in body
    assert "redis" in body


def test_health_status_field_values(test_client: TestClient):
    response = test_client.get("/api/health")
    body = response.json()
    assert body["status"] in ("ok", "degraded")
    assert isinstance(body["postgres"], bool)
    assert isinstance(body["redis"], bool)
