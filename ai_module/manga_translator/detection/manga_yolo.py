"""Manga109-fine-tuned YOLOv8 text detector.

Loads the local checkpoint at ``ai_module/models/manga_yolo/best.pt`` produced by
``ai_module/training/manga109/02_convert_to_yolo.py`` and emits axis-aligned
``Quadrilateral`` text regions plus a rasterized box mask compatible with the
downstream OCR / inpainting / rendering pipeline.

Single-class model: ``["text"]``.
"""

from __future__ import annotations

import os
from typing import List, Tuple

import cv2
import numpy as np

from .common import OfflineDetector
from ..utils import Quadrilateral


class MangaYoloDetector(OfflineDetector):
    """YOLOv8 text-region detector trained on Manga109-s."""

    _MODEL_SUB_DIR = 'manga_yolo'
    _MODEL_MAPPING: dict = {}  # Pre-bundled — no remote download.
    _CHECKPOINT_NAME = 'best.pt'

    def __init__(self, *args, **kwargs):
        os.makedirs(self.model_dir, exist_ok=True)
        super().__init__(*args, **kwargs)

    # The base ModelWrapper assumes _MODEL_MAPPING entries are downloadable; we
    # ship the checkpoint with the image, so short-circuit both checks.
    def _check_downloaded(self) -> bool:
        return os.path.exists(self._get_file_path(self._CHECKPOINT_NAME))

    async def _download(self):
        if not self._check_downloaded():
            raise FileNotFoundError(
                f'manga_yolo checkpoint not found at {self._get_file_path(self._CHECKPOINT_NAME)}. '
                'Place the fine-tuned best.pt under ai_module/models/manga_yolo/.'
            )

    async def _load(self, device: str):
        from ultralytics import YOLO

        ckpt = self._get_file_path(self._CHECKPOINT_NAME)
        self.model = YOLO(ckpt)
        self.device = device if device in ('cuda', 'mps') else 'cpu'

    async def _unload(self):
        del self.model

    async def _infer(
        self,
        image: np.ndarray,
        detect_size: int,
        text_threshold: float,
        box_threshold: float,
        unclip_ratio: float,
        verbose: bool = False,
    ) -> Tuple[List[Quadrilateral], np.ndarray, np.ndarray]:
        h, w = image.shape[:2]

        # YOLO expects RGB; pipeline already feeds RGB ndarrays.
        results = self.model.predict(
            source=image,
            imgsz=int(detect_size) if detect_size else 640,
            conf=float(box_threshold) if box_threshold else 0.25,
            iou=0.5,
            device=self.device,
            verbose=False,
        )

        textlines: List[Quadrilateral] = []
        raw_mask = np.zeros((h, w), dtype=np.uint8)

        if not results:
            return textlines, raw_mask, None

        res = results[0]
        if res.boxes is None or len(res.boxes) == 0:
            return textlines, raw_mask, None

        xyxy = res.boxes.xyxy.cpu().numpy()
        scores = res.boxes.conf.cpu().numpy()

        # IGNORE unclip_ratio: DBNet's unclip semantics expand thin stroke polygons
        # to cover the whole text, but YOLO already emits whole-text bboxes — applying
        # unclip_ratio=2.3 here inflates short_side by ~2.3× → Quadrilateral.font_size
        # blows up → renderer draws oversized text. Use the YOLO-specific
        # padding_ratio (set by dispatch()) for a small inpaint headroom instead.
        padding_ratio = float(getattr(self, 'padding_ratio', 0.1))
        margin = max(0.0, padding_ratio)
        # Manga109 `<text>` is per-block (multi-line per bubble), not per-line, so
        # each YOLO bbox covers multiple text lines/columns. Quadrilateral.font_size
        # = box short side → inflates with line/column count. Sub-divide each box
        # into N≈short/expected_font fake textline strips so font_size ≈ real font;
        # textline_merge groups them back into one TextBlock with correct font_size.
        expected_font_px = max(1, int(getattr(self, 'expected_font_px', 28)))

        total_strips = 0
        for (x1, y1, x2, y2), score in zip(xyxy, scores):
            bw = x2 - x1
            bh = y2 - y1
            if margin > 0:
                px = margin * min(bw, bh) * 0.5
                x1 -= px
                y1 -= px
                x2 += px
                y2 += px
            x1 = int(max(0, np.floor(x1)))
            y1 = int(max(0, np.floor(y1)))
            x2 = int(min(w, np.ceil(x2)))
            y2 = int(min(h, np.ceil(y2)))
            bw_i = x2 - x1
            bh_i = y2 - y1
            if bw_i < 2 or bh_i < 2:
                continue

            # Inpaint mask covers the full bbox (one filled rect per detection).
            cv2.rectangle(raw_mask, (x1, y1), (x2, y2), 255, thickness=-1)

            short = min(bw_i, bh_i)
            is_vertical = bh_i > bw_i
            N = max(1, int(round(short / expected_font_px)))

            if N == 1:
                pts = np.array(
                    [[x1, y1], [x2, y1], [x2, y2], [x1, y2]],
                    dtype=np.int64,
                )
                textlines.append(Quadrilateral(pts, '', float(score)))
                total_strips += 1
                continue

            # Sub-divide along the short side. Vertical block → split width into N
            # columns; horizontal block → split height into N rows.
            if is_vertical:
                edges = np.linspace(x1, x2, N + 1).astype(np.int64)
                for i in range(N):
                    sx1, sx2 = int(edges[i]), int(edges[i + 1])
                    if sx2 - sx1 < 2:
                        continue
                    pts = np.array(
                        [[sx1, y1], [sx2, y1], [sx2, y2], [sx1, y2]],
                        dtype=np.int64,
                    )
                    textlines.append(Quadrilateral(pts, '', float(score)))
                    total_strips += 1
            else:
                edges = np.linspace(y1, y2, N + 1).astype(np.int64)
                for i in range(N):
                    sy1, sy2 = int(edges[i]), int(edges[i + 1])
                    if sy2 - sy1 < 2:
                        continue
                    pts = np.array(
                        [[x1, sy1], [x2, sy1], [x2, sy2], [x1, sy2]],
                        dtype=np.int64,
                    )
                    textlines.append(Quadrilateral(pts, '', float(score)))
                    total_strips += 1

        if verbose:
            self.logger.info(
                f'manga_yolo: {len(xyxy)} bboxes → {total_strips} strips '
                f'@ conf>={box_threshold or 0.25}, expected_font={expected_font_px}px'
            )

        return textlines, raw_mask, None
