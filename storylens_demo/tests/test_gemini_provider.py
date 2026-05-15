"""Gemini provider tests — mocked, no real API calls."""
import json
from unittest.mock import MagicMock, patch

from control_plane.llm.gemini_provider import GeminiProvider, BoxInput


def _mock_response(data: dict):
    mock = MagicMock()
    mock.text = json.dumps(data)
    mock.usage_metadata = None
    return mock


@patch("control_plane.llm.gemini_provider._ensure_init")
@patch("control_plane.llm.gemini_provider.genai.GenerativeModel")
def test_translate_batch_mock(MockModel, mock_init):
    mock_init.return_value = None
    instance = MockModel.return_value
    instance.generate_content.return_value = _mock_response({
        "items": [{"box_id": "b001", "translated_text": "Đưa cho tớ!", "speaker": "Nobita", "confidence": 0.9}],
        "memory_updates": [],
    })

    provider = GeminiProvider()
    boxes = [BoxInput(box_id="b001", raw_text="Give it to me!")]
    result = provider.translate_batch(boxes, {}, "You are a translator.")

    assert len(result.items) == 1
    assert result.items[0].box_id == "b001"
    assert result.items[0].translated_text == "Đưa cho tớ!"


@patch("control_plane.llm.gemini_provider._ensure_init")
@patch("control_plane.llm.gemini_provider.genai.GenerativeModel")
def test_translate_batch_bad_json(MockModel, mock_init):
    """Should not crash on malformed JSON response."""
    mock_init.return_value = None
    instance = MockModel.return_value
    mock_resp = MagicMock()
    mock_resp.text = "This is not JSON"
    mock_resp.usage_metadata = None
    instance.generate_content.return_value = mock_resp

    provider = GeminiProvider()
    result = provider.translate_batch([BoxInput("b001", "Hello")], {}, "prompt")
    assert result.items == []
