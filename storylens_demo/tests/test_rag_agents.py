"""RAG agents unit tests — no vector DB required."""
from control_plane.rag import layout_agent


def test_layout_agent_basic():
    boxes = [{"box_id": "b001", "xyxy": [0, 0, 200, 60]}]
    result = layout_agent.compute_constraints(boxes)
    constraints = result["layout_constraints"]
    assert len(constraints) == 1
    assert constraints[0]["box_id"] == "b001"
    assert constraints[0]["max_chars_hint"] > 0


def test_layout_agent_empty():
    result = layout_agent.compute_constraints([])
    assert result["layout_constraints"] == []


def test_layout_agent_no_xyxy():
    boxes = [{"box_id": "b001"}]
    result = layout_agent.compute_constraints(boxes)
    assert result["layout_constraints"][0]["max_chars_hint"] >= 15
