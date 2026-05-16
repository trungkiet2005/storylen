"""Layout Constraint Agent — computes max_chars_hint from box pixel dimensions."""
from __future__ import annotations

import math


_CHARS_PER_PX_H = 0.12   # approx chars per pixel height (Vietnamese, small font)
_CHARS_PER_PX_W = 0.10   # approx chars per pixel width


def compute_constraints(boxes: list[dict]) -> dict:
    """
    boxes: list of {"box_id": str, "xyxy": [x1,y1,x2,y2]}
    Returns: {"layout_constraints": [{"box_id": str, "max_chars_hint": int, "length_policy": str}]}
    """
    constraints = []
    for box in boxes:
        xyxy = box.get("xyxy") or []
        if len(xyxy) == 4:
            x1, y1, x2, y2 = xyxy
            w, h = abs(x2 - x1), abs(y2 - y1)
        else:
            w, h = 100, 50

        chars_w = int(w * _CHARS_PER_PX_W)
        chars_h = int(h * _CHARS_PER_PX_H)
        lines = max(1, math.floor(h / 20))
        chars_per_line = max(8, chars_w)
        max_chars = chars_per_line * lines

        constraints.append({
            "box_id": box.get("box_id", ""),
            "max_chars_hint": max(15, min(max_chars, 120)),
            "length_policy": f"Tối đa {lines} dòng, mỗi dòng ~{chars_per_line} ký tự",
        })

    return {"layout_constraints": constraints}
