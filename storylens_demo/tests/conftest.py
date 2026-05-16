"""Pytest fixtures — async app client."""
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


@pytest_asyncio.fixture
async def client():
    from control_plane.app import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
