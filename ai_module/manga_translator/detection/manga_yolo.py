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
            if x2 - x1 < 2 or y2 - y1 < 2:
                continue
            pts = np.array(
                [[x1, y1], [x2, y1], [x2, y2], [x1, y2]],
                dtype=np.int64,
            )
            textlines.append(Quadrilateral(pts, '', float(score)))
            cv2.rectangle(raw_mask, (x1, y1), (x2, y2), 255, thickness=-1)

        if verbose:
            self.logger.info(
                f'manga_yolo: {len(textlines)} text regions @ conf>={box_threshold or 0.25}'
            )

        return textlines, raw_mask, None
