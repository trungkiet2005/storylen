"""Translate API tests — uses mock image, no real Gemini calls."""
import io
import pytest


@pytest.mark.asyncio
async def test_create_manga(client):
    res = await client.post("/api/v1/manga", json={
        "title": "Test Manga",
        "source_language": "ja",
        "target_language": "vi",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Test Manga"
    assert "id" in data
    return data["id"]


@pytest.mark.asyncio
async def test_list_manga(client):
    res = await client.get("/api/v1/manga")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


@pytest.mark.asyncio
async def test_translate_missing_manga(client):
    """Should return 404 for nonexistent manga."""
    tiny_png = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
        b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx'
        b'\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
    )
    res = await client.post(
        "/api/v1/manga/nonexistent-id/translate/pages",
        files={"image": ("test.png", io.BytesIO(tiny_png), "image/png")},
        data={"chapter_id": "fake-chapter", "page_index": "0"},
    )
    assert res.status_code == 404
