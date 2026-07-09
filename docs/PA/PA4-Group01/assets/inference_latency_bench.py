# -*- coding: utf-8 -*-
"""
PA4 — Local inference latency smoke test for the fine-tuned YOLOv8 bubble
detector (ai_module/models/manga_yolo/best.pt).

IMPORTANT / HONESTY NOTE
-------------------------
This machine has no local copy of the Manga109-s dataset (it lives only on
Kaggle, where the original fine-tuning + test-split evaluation ran — see
docs/PA/PA3-Group01/rup_sad_v2.docx section 7.5 for those numbers, which are
reused as ground truth in the PA4 report and NOT re-derived here).

What IS real about this script:
  - it loads the ACTUAL fine-tuned weights shipped in the repo
    (ai_module/models/manga_yolo/best.pt), not a placeholder.
  - it runs REAL forward passes and times them with time.perf_counter().
  - the 3 images used are the only manga-style artwork that exists anywhere
    in this repository (frontend/public/...). They are AI-generated hero/
    marketing artwork, NOT scanned manga pages from Manga109-s or any other
    manga dataset. Detection counts/confidences reported here are therefore
    a LATENCY-ONLY smoke test and are explicitly NOT claimed to be
    representative of production box quality on genuine manga content.

Run:
    cd docs/PA/PA4-Group01/assets
    python inference_latency_bench.py
"""
import json
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[3]
WEIGHTS = REPO_ROOT / "ai_module" / "models" / "manga_yolo" / "best.pt"

IMAGES = [
    REPO_ROOT / "frontend" / "public" / "images" / "manga_hero_ja.png",
    REPO_ROOT / "frontend" / "public" / "images" / "manga_hero_clean.png",
    REPO_ROOT / "frontend" / "public" / "manga_panel_samurai.png",
]

OUT_JSON = HERE / "inference_latency_results.json"


def main():
    print("=" * 72)
    print(" YOLOv8 (manga_yolo/best.pt) — local latency smoke test")
    print("=" * 72)
    print(f"  weights: {WEIGHTS}  (exists={WEIGHTS.exists()})")
    for p in IMAGES:
        print(f"  image  : {p}  (exists={p.exists()})")

    assert WEIGHTS.exists(), f"Missing weights: {WEIGHTS}"
    images = [p for p in IMAGES if p.exists()]
    assert images, "No sample images found"

    t0 = time.perf_counter()
    from ultralytics import YOLO
    import ultralytics
    model = YOLO(str(WEIGHTS))
    load_s = time.perf_counter() - t0
    print(f"\n  ultralytics version : {ultralytics.__version__}")
    print(f"  model load time     : {load_s:.3f}s")

    results_rows = []

    # Warm-up pass (first forward pass includes lazy CUDA/CPU kernel init,
    # so it is excluded from the "steady-state" timing below and reported
    # separately).
    warm_img = str(images[0])
    t0 = time.perf_counter()
    _ = model.predict(source=warm_img, conf=0.25, iou=0.6, verbose=False)
    warmup_s = time.perf_counter() - t0
    print(f"  warm-up inference   : {warmup_s:.3f}s (first-call overhead, excluded below)")

    print("\n  --- per-image timings (steady state) ---")
    for img_path in images:
        t0 = time.perf_counter()
        res = model.predict(source=str(img_path), conf=0.25, iou=0.6, verbose=False)[0]
        dt = time.perf_counter() - t0
        n_boxes = 0 if res.boxes is None else len(res.boxes)
        confs = [] if res.boxes is None else [float(c) for c in res.boxes.conf.cpu().numpy()]
        row = {
            "image": img_path.name,
            "latency_s": round(dt, 4),
            "n_detections": n_boxes,
            "confidences": [round(c, 3) for c in confs],
            "mean_confidence": round(sum(confs) / len(confs), 3) if confs else None,
        }
        results_rows.append(row)
        print(f"  {img_path.name:28s} latency={dt:6.3f}s  detections={n_boxes:2d}  "
              f"mean_conf={row['mean_confidence']}")

    summary = {
        "note": (
            "LATENCY-ONLY SMOKE TEST. Images are AI-generated manga-style "
            "marketing artwork bundled with the frontend (frontend/public/), "
            "NOT real Manga109-s / scanned manga pages. Detection counts and "
            "confidences are NOT representative of production box quality on "
            "genuine manga content -- see PA3 SAD section 7.5 / the metadata.json "
            "under ai_module/models/manga_ocr/weights/ for the real Manga109-s "
            "test-split metrics (mAP@0.5=0.9525, CER=0.0611 etc.), which is the "
            "ground truth this PA4 report relies on."
        ),
        "weights_path": str(WEIGHTS.relative_to(REPO_ROOT)),
        "ultralytics_version": ultralytics.__version__,
        "model_load_time_s": round(load_s, 4),
        "warmup_inference_time_s": round(warmup_s, 4),
        "per_image": results_rows,
    }

    OUT_JSON.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"\n  Results written -> {OUT_JSON}")
    print("=" * 72)


if __name__ == "__main__":
    main()
