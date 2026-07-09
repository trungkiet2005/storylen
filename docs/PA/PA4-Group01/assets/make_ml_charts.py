# -*- coding: utf-8 -*-
"""
PA4 — Generate charts from REAL numbers already produced by the team's own
training runs (no dataset/GPU re-run needed here). Sources:

  - manga-ocr PA2-preliminary vs PA3-final: from docs/PA/PA3-Group01/rup_sad_v2.docx
    section 7.5, cross-checked against the actual metadata.json written by the
    Kaggle training job and shipped in this repo at
    ai_module/models/manga_ocr/weights/metadata.json (test_cer=0.06109,
    test_char_acc=0.93891, test_exact_match=0.67481, on a 14,130-sample test
    split -- exact match with the SAD numbers, confirming they are the real
    training-run output and not a hand-typed guess).
  - YOLOv8 detector: from the same SAD section 7.5 (mAP50=0.9525,
    mAP50-95=0.8440, precision=0.9731, recall=0.9379). No local results.csv/
    metadata.json exists for the YOLO run in this repo (only best.pt weights
    were copied over -- see report for details), so these numbers are taken
    from the SAD as the last verified source, not re-derived here.
  - Latency bars: from inference_latency_bench.py's real local run
    (inference_latency_results.json), produced on this machine, CPU-only.

Outputs (saved next to this script):
  - chart_ocr_pa2_vs_pa3.png
  - chart_yolo_metrics.png
  - chart_latency.png
"""
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = Path(__file__).resolve().parent

NAVY = "#16325c"
ACCENT = "#b91c1c"
TEAL = "#0f766e"
GREY = "#555555"

plt.rcParams["font.family"] = "DejaVu Sans"


def chart_ocr_pa2_vs_pa3():
    labels = ["Char-Accuracy", "1 - CER"]
    pa2 = [0.873, 1 - 0.127]
    pa3 = [0.9389, 1 - 0.0611]

    x = range(len(labels))
    w = 0.32
    fig, ax = plt.subplots(figsize=(6.2, 4.2))
    b1 = ax.bar([i - w / 2 for i in x], pa2, width=w, label="PA2 preliminary fine-tune", color=GREY)
    b2 = ax.bar([i + w / 2 for i in x], pa3, width=w, label="PA3 final fine-tune (8 epochs)", color=ACCENT)
    ax.set_xticks(list(x))
    ax.set_xticklabels(labels)
    ax.set_ylim(0, 1.05)
    ax.set_ylabel("Score (higher = better)")
    ax.set_title("manga-ocr: PA2 preliminary vs PA3 final fine-tune\n(Manga109-s test split, 14,130 samples)")
    for bars in (b1, b2):
        for bar in bars:
            h = bar.get_height()
            ax.annotate(f"{h:.3f}", (bar.get_x() + bar.get_width() / 2, h),
                        textcoords="offset points", xytext=(0, 3), ha="center", fontsize=9)
    ax.legend(loc="lower right", fontsize=9)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    out = HERE / "chart_ocr_pa2_vs_pa3.png"
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f"saved {out}")


def chart_yolo_metrics():
    labels = ["mAP@0.5", "mAP@0.5:0.95", "Precision", "Recall"]
    values = [0.9525, 0.8440, 0.9731, 0.9379]
    threshold = 0.85  # acceptance threshold for mAP@0.5 only

    fig, ax = plt.subplots(figsize=(6.2, 4.2))
    bars = ax.bar(labels, values, color=[ACCENT, NAVY, TEAL, TEAL])
    ax.axhline(threshold, color="black", linestyle="--", linewidth=1, label="mAP@0.5 acceptance threshold (0.85)")
    ax.set_ylim(0, 1.05)
    ax.set_ylabel("Score")
    ax.set_title("YOLOv8 (manga_yolo, yolov8n fine-tune)\nTest split: 956 images / 14,130 text regions")
    for bar, v in zip(bars, values):
        ax.annotate(f"{v:.3f}", (bar.get_x() + bar.get_width() / 2, v),
                    textcoords="offset points", xytext=(0, 3), ha="center", fontsize=9)
    ax.legend(loc="lower right", fontsize=8)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    out = HERE / "chart_yolo_metrics.png"
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f"saved {out}")


def chart_latency():
    res_path = HERE / "inference_latency_results.json"
    if not res_path.exists():
        print("inference_latency_results.json not found -- run inference_latency_bench.py first")
        return
    data = json.loads(res_path.read_text(encoding="utf-8"))
    rows = data["per_image"]
    labels = [r["image"] for r in rows]
    lat = [r["latency_s"] for r in rows]

    fig, ax = plt.subplots(figsize=(6.2, 4.0))
    bars = ax.bar(labels, lat, color=NAVY)
    ax.set_ylabel("Latency (s), CPU, this local machine")
    ax.set_title(
        f"YOLOv8 forward-pass latency (smoke test, not manga-representative)\n"
        f"model load={data['model_load_time_s']}s  warm-up={data['warmup_inference_time_s']}s "
        f"ultralytics {data['ultralytics_version']}"
    )
    for bar, v in zip(bars, lat):
        ax.annotate(f"{v:.3f}s", (bar.get_x() + bar.get_width() / 2, v),
                    textcoords="offset points", xytext=(0, 3), ha="center", fontsize=9)
    ax.tick_params(axis="x", labelrotation=12)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    out = HERE / "chart_latency.png"
    fig.savefig(out, dpi=150)
    plt.close(fig)
    print(f"saved {out}")


if __name__ == "__main__":
    chart_ocr_pa2_vs_pa3()
    chart_yolo_metrics()
    chart_latency()
