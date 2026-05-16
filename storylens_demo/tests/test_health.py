"""Health endpoint tests."""
import pytest


@pytest.mark.asyncio
async def test_health_live(client):
    res = await client.get("/health/live")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_health_ready(client):
    res = await client.get("/health/ready")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "db" in data


@pytest.mark.asyncio
async def test_health_dependencies(client):
    res = await client.get("/health/dependencies")
    assert res.status_code == 200
    data = res.json()
    assert "gemini_api_key_configured" in data
    assert "key_status" in data
