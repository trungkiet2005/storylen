"""
Manga109-s → YOLO Convert + Train + Eval (Speech Bubble Detection)
====================================================================
End-to-end pipeline (single file) cho StoryLens bubble detector:

  [1] Convert Manga109-s XML annotations → YOLOv8 format
      - Split theo *title* (chống leak), 80/10/10 train/val/test
      - Filter degenerate boxes (< MIN_BOX_PX), normalize toạ độ
  [2] Train YOLOv8 (default: yolov8n @ 640px, 50 epochs, cosine LR)
      - Augmentation tuned for manga (no flip, no HSV — line art B&W)
  [3] Evaluate trên test split (mAP@0.5, mAP@0.5:0.95, per-class)
  [4] Visualize predictions trên sample test pages
  [5] Save best.pt + last.pt + results.csv + plots + metadata.json
      vào /kaggle/working/manga109_yolo/weights/
  [6] (Optional) Export ONNX cho production inference trong ai_module/

Run modes:
  MODE = "full"   → real training run (~2-3h on T4, 1-1.5h on P100)
  MODE = "smoke"  → 4 titles, 1 epoch, ~3-5 min — verify pipeline hoạt động

Kaggle setup (paste vào 1 cell notebook):

    !pip install -q ultralytics
    %run /kaggle/working/02_convert_to_yolo.py

Yêu cầu: Settings → Accelerator → GPU T4 x2 / P100. Không có GPU sẽ fallback
sang CPU (rất chậm — chỉ phù hợp smoke test).

KHÔNG dùng `!python` — subprocess không pipe matplotlib inline về notebook.
"""

import os
import sys
import shutil
import random
import json
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime, timezone

import matplotlib.pyplot as plt
import matplotlib.patches as patches
import yaml
from PIL import Image


def _ensure_ultralytics():
    """Kaggle notebooks không có sẵn ultralytics — pip install nếu thiếu."""
    try:
        import ultralytics  # noqa: F401
        return
    except ImportError:
        pass
    print("  ultralytics chưa cài — đang `pip install -q ultralytics`...")
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "-q", "ultralytics"]
    )
    import ultralytics  # noqa: F401
    print(f"  ✓ ultralytics {ultralytics.__version__} installed")


# ============================================================================
# Config
# ============================================================================
MODE = "full"  # "full" | "smoke"

BASE = Path("/kaggle/input/datasets/trungkiet/manga-109-s/Manga109s_clean/Manga109sreleased20260521")
IMG_DIR = BASE / "images1"
ANN_DIR = BASE / "annotations1"
OUT_DIR = Path("/kaggle/working/manga109_yolo")
RUN_ROOT = Path("/kaggle/working/runs")
WEIGHTS_OUT = OUT_DIR / "weights"

CLASSES = ["text"]
TAG_OF = {"text": "text", "frame": "frame", "body": "body", "face": "face"}

SPLIT_RATIO = (0.80, 0.10, 0.10)
SEED = 42
USE_SYMLINK = True
MIN_BOX_PX = 4
ZIP_OUTPUT = False
EXPORT_ONNX = False  # True = export ONNX cho ai_module production inference

# Train config — augmentations tuned cho manga (mostly monochrome line art)
TRAIN_CONFIG = dict(
    model="yolov8n.pt",
    epochs=50,
    imgsz=640,
    batch=16,
    patience=10,          # early-stop nếu val mAP plateau
    optimizer="auto",
    cos_lr=True,
    workers=4,
    seed=SEED,
    project=str(RUN_ROOT),
    name="manga109_bubble",
    exist_ok=True,
    plots=True,
    save=True,
    val=True,
    hsv_h=0.0,            # manga is monochrome — no hue shift
    hsv_s=0.0,
    hsv_v=0.2,
    fliplr=0.0,           # bubble shapes asymmetric — no horizontal flip
    mosaic=1.0,
    mixup=0.0,
    copy_paste=0.0,
    degrees=2.0,
    translate=0.05,
    scale=0.3,
)

EVAL_CONFIG = dict(
    imgsz=640,
    conf=0.25,
    iou=0.6,
    plots=True,
    save_json=True,
)

_IMG_EXTS = (".jpg", ".jpeg", ".png", ".webp")
_image_cache = {}


# ============================================================================
# Helpers
# ============================================================================
def list_images(title: str):
    """Scan title dir once + sort. Page index = position trong sorted list."""
    if title not in _image_cache:
        td = IMG_DIR / title
        _image_cache[title] = sorted(
            p for p in td.iterdir() if p.suffix.lower() in _IMG_EXTS
        ) if td.exists() else []
    return _image_cache[title]


def find_image(title: str, page_idx: int):
    imgs = list_images(title)
    return imgs[page_idx] if 0 <= page_idx < len(imgs) else None


def make_split(titles, ratio=None):
    ratio = ratio or SPLIT_RATIO
    rng = random.Random(SEED)
    shuf = titles[:]
    rng.shuffle(shuf)
    n = len(shuf)
    n_tr = int(n * ratio[0])
    n_va = int(n * ratio[1])
    return set(shuf[:n_tr]), set(shuf[n_tr:n_tr + n_va]), set(shuf[n_tr + n_va:])


def split_of(title, train, val):
    return "train" if title in train else ("val" if title in val else "test")


def detect_device():
    try:
        import torch
        if torch.cuda.is_available():
            return 0, f"cuda:0 ({torch.cuda.get_device_name(0)})"
    except ImportError:
        pass
    return "cpu", "cpu"


# ============================================================================
# [1] Convert XML → YOLO
# ============================================================================
def convert(titles, train, val):
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    for sp in ("train", "val", "test"):
        (OUT_DIR / "images" / sp).mkdir(parents=True, exist_ok=True)
        (OUT_DIR / "labels" / sp).mkdir(parents=True, exist_ok=True)

    stats = {"written": 0, "no_ann": 0, "no_image": 0, "bad_box": 0,
             "per_split": {"train": 0, "val": 0, "test": 0}}

    for title in titles:
        tree = ET.parse(ANN_DIR / f"{title}.xml")
        root = tree.getroot()
        sp = split_of(title, train, val)

        for page in root.findall(".//page"):
            idx = int(page.get("index"))
            W = int(page.get("width"))
            H = int(page.get("height"))

            lines = []
            for cls_id, cls_name in enumerate(CLASSES):
                for elem in page.findall(TAG_OF[cls_name]):
                    try:
                        x1 = max(0, int(elem.get("xmin")))
                        y1 = max(0, int(elem.get("ymin")))
                        x2 = min(W, int(elem.get("xmax")))
                        y2 = min(H, int(elem.get("ymax")))
                    except (TypeError, ValueError):
                        stats["bad_box"] += 1
                        continue
                    if (x2 - x1) < MIN_BOX_PX or (y2 - y1) < MIN_BOX_PX:
                        stats["bad_box"] += 1
                        continue
                    cx = (x1 + x2) / 2 / W
                    cy = (y1 + y2) / 2 / H
                    bw = (x2 - x1) / W
                    bh = (y2 - y1) / H
                    lines.append(f"{cls_id} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")

            if not lines:
                stats["no_ann"] += 1
                continue

            img_path = find_image(title, idx)
            if img_path is None:
                stats["no_image"] += 1
                continue

            ext = img_path.suffix.lower()
            stem = f"{title}_{idx:04d}"
            dst_img = OUT_DIR / "images" / sp / f"{stem}{ext}"
            dst_lbl = OUT_DIR / "labels" / sp / f"{stem}.txt"

            if not dst_img.exists():
                if USE_SYMLINK:
                    try:
                        os.symlink(img_path, dst_img)
                    except FileExistsError:
                        pass
                else:
                    shutil.copy2(img_path, dst_img)
            dst_lbl.write_text("\n".join(lines))

            stats["written"] += 1
            stats["per_split"][sp] += 1

    return stats


def write_data_yaml():
    data_yaml = {
        "path": str(OUT_DIR),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "names": {i: c for i, c in enumerate(CLASSES)},
    }
    p = OUT_DIR / "data.yaml"
    p.write_text(yaml.dump(data_yaml, sort_keys=False, allow_unicode=True))
    return p


def sanity_check():
    for sp in ("train", "val", "test"):
        n_i = sum(1 for p in (OUT_DIR / "images" / sp).iterdir()
                  if p.suffix.lower() in _IMG_EXTS)
        n_l = len(list((OUT_DIR / "labels" / sp).glob("*.txt")))
        print(f"  {sp:5s}: {n_i} images, {n_l} labels")

    sample = random.choice(list((OUT_DIR / "labels" / "train").glob("*.txt")))
    print(f"\nSample label: {sample.name}")
    print(sample.read_text()[:400])
    return sample


def viz_gt(img_path: Path, lbl_path: Path, save_to: Path):
    img = Image.open(img_path).convert("RGB")
    W, H = img.size
    fig, ax = plt.subplots(figsize=(10, 8))
    ax.imshow(img)
    palette = ["#ff7f0e", "#1f77b4", "#2ca02c", "#d62728"]
    for line in lbl_path.read_text().splitlines():
        parts = line.split()
        cls = int(parts[0])
        cx, cy, w, h = map(float, parts[1:])
        x1 = (cx - w / 2) * W
        y1 = (cy - h / 2) * H
        ax.add_patch(patches.Rectangle(
            (x1, y1), w * W, h * H, linewidth=2,
            edgecolor=palette[cls % len(palette)], facecolor="none"))
    ax.set_title(f"GT | {img_path.name} | classes={CLASSES}")
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(save_to, dpi=100, bbox_inches="tight")
    plt.show()
    plt.close(fig)
    print(f"  saved → {save_to}")


# ============================================================================
# [2] Train
# ============================================================================
def train_yolo(data_yaml: Path, cfg: dict):
    _ensure_ultralytics()
    from ultralytics import YOLO

    dev, dev_name = detect_device()
    print(f"  device: {dev_name}")
    print(f"  model : {cfg['model']}")
    print(f"  epochs={cfg['epochs']} imgsz={cfg['imgsz']} batch={cfg['batch']}")

    model = YOLO(cfg["model"])
    train_kwargs = {k: v for k, v in cfg.items() if k != "model"}
    train_kwargs["data"] = str(data_yaml)
    train_kwargs["device"] = dev

    results = model.train(**train_kwargs)
    save_dir = Path(results.save_dir)
    print(f"\n  train output: {save_dir}")
    return model, save_dir


# ============================================================================
# [3] Evaluate
# ============================================================================
def evaluate_yolo(model, data_yaml: Path, cfg: dict):
    print("\n--- Evaluating on test split ---")
    metrics = model.val(data=str(data_yaml), split="test", **cfg)
    box = metrics.box

    try:
        fitness = float(metrics.fitness)
    except (AttributeError, TypeError):
        fitness = 0.0

    summary = {
        "mAP50":             float(box.map50),
        "mAP50-95":          float(box.map),
        "mean_precision":    float(box.mp),
        "mean_recall":       float(box.mr),
        "per_class_mAP50-95": {CLASSES[i]: float(v) for i, v in enumerate(box.maps)},
        "fitness":           fitness,
    }
    print("\n=== Test Metrics ===")
    for k, v in summary.items():
        if isinstance(v, dict):
            print(f"  {k}:")
            for ck, cv in v.items():
                print(f"    {ck}: {cv:.4f}")
        else:
            print(f"  {k}: {v:.4f}")
    return metrics, summary


def viz_predictions(model, n_samples: int = 4):
    print(f"\n--- Visualizing {n_samples} test predictions ---")
    test_imgs = sorted(
        p for p in (OUT_DIR / "images" / "test").iterdir()
        if p.suffix.lower() in _IMG_EXTS
    )
    if not test_imgs:
        print("  no test images")
        return
    rng = random.Random(SEED)
    samples = rng.sample(test_imgs, min(n_samples, len(test_imgs)))

    viz_dir = Path("/kaggle/working/manga109_yolo_pred")
    viz_dir.mkdir(parents=True, exist_ok=True)

    for img_p in samples:
        res = model.predict(source=str(img_p), conf=0.25, iou=0.6, verbose=False)[0]
        img = Image.open(img_p).convert("RGB")
        fig, ax = plt.subplots(figsize=(10, 8))
        ax.imshow(img)
        if res.boxes is not None and len(res.boxes) > 0:
            for box, conf, cls in zip(
                res.boxes.xyxy.cpu().numpy(),
                res.boxes.conf.cpu().numpy(),
                res.boxes.cls.cpu().numpy().astype(int),
            ):
                x1, y1, x2, y2 = box
                ax.add_patch(patches.Rectangle(
                    (x1, y1), x2 - x1, y2 - y1, linewidth=2,
                    edgecolor="#ff3b3b", facecolor="none"))
                ax.text(x1, max(y1 - 5, 0), f"{CLASSES[cls]} {conf:.2f}",
                        color="white", fontsize=8,
                        bbox=dict(facecolor="#ff3b3b", edgecolor="none", pad=1.5))
        ax.set_title(f"PRED | {img_p.name}")
        ax.axis("off")
        plt.tight_layout()
        out = viz_dir / f"pred_{img_p.stem}.png"
        plt.savefig(out, dpi=100, bbox_inches="tight")
        plt.show()
        plt.close(fig)
        print(f"  saved → {out}")


# ============================================================================
# [5] Save artifacts
# ============================================================================
def save_artifacts(train_dir: Path, summary: dict, mode: str, train_cfg: dict):
    WEIGHTS_OUT.mkdir(parents=True, exist_ok=True)

    src_best = train_dir / "weights" / "best.pt"
    src_last = train_dir / "weights" / "last.pt"
    if src_best.exists():
        shutil.copy2(src_best, WEIGHTS_OUT / "best.pt")
        print(f"  best.pt → {WEIGHTS_OUT / 'best.pt'} "
              f"({src_best.stat().st_size / 1e6:.1f} MB)")
    if src_last.exists():
        shutil.copy2(src_last, WEIGHTS_OUT / "last.pt")

    for fname in ("results.csv", "results.png", "confusion_matrix.png",
                  "confusion_matrix_normalized.png", "PR_curve.png",
                  "F1_curve.png", "P_curve.png", "R_curve.png",
                  "labels.jpg", "labels_correlogram.jpg", "args.yaml"):
        src = train_dir / fname
        if src.exists():
            shutil.copy2(src, WEIGHTS_OUT / fname)

    meta = {
        "mode": mode,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "classes": CLASSES,
        "split_ratio": list(SPLIT_RATIO),
        "seed": SEED,
        "train_config": train_cfg,
        "eval_config": EVAL_CONFIG,
        "test_metrics": summary,
        "train_dir": str(train_dir),
    }
    (WEIGHTS_OUT / "metadata.json").write_text(
        json.dumps(meta, indent=2, default=str))
    print(f"  metadata.json → {WEIGHTS_OUT / 'metadata.json'}")


def export_onnx(model):
    print("\n--- Exporting ONNX ---")
    onnx_path = model.export(
        format="onnx", imgsz=TRAIN_CONFIG["imgsz"], opset=12, simplify=True)
    dst = WEIGHTS_OUT / "best.onnx"
    shutil.copy2(onnx_path, dst)
    print(f"  best.onnx → {dst}")


def zip_output():
    import zipfile
    Z = Path("/kaggle/working/manga109_yolo.zip")
    with zipfile.ZipFile(Z, "w", compression=zipfile.ZIP_STORED, allowZip64=True) as zf:
        for p in OUT_DIR.rglob("*"):
            if p.is_file() or p.is_symlink():
                zf.write(p, p.relative_to(OUT_DIR.parent))
    print(f"Zipped → {Z} ({Z.stat().st_size/1e9:.2f} GB)")


# ============================================================================
# Pipeline orchestration
# ============================================================================
def run_pipeline(titles, train_cfg, eval_cfg, mode, split_ratio=None):
    train, val, test = make_split(titles, ratio=split_ratio)
    print(f"\nSplit: Train {len(train)} | Val {len(val)} | Test {len(test)}")
    if mode == "smoke":
        print(f"  train: {sorted(train)}")
        print(f"  val  : {sorted(val)}")
        print(f"  test : {sorted(test)}")

    print("\n--- [1/5] Converting XML → YOLO ---")
    stats = convert(titles, train, val)
    print("  stats:", stats)
    assert stats["per_split"]["train"] > 0, "No training images written"
    assert stats["per_split"]["val"] > 0, "No validation images written"

    print("\n--- [2/5] data.yaml + sanity check ---")
    yaml_path = write_data_yaml()
    print(yaml_path.read_text())
    sample_lbl = sanity_check()

    viz_dir = Path("/kaggle/working/manga109_yolo_viz")
    viz_dir.mkdir(parents=True, exist_ok=True)
    stem = sample_lbl.stem
    img_dir = OUT_DIR / "images" / "train"
    img_path = next(
        (img_dir / f"{stem}{ext}" for ext in _IMG_EXTS
         if (img_dir / f"{stem}{ext}").exists()), None)
    if img_path is not None:
        viz_gt(img_path, sample_lbl, viz_dir / f"{stem}.png")

    print("\n--- [3/5] Training ---")
    model, train_dir = train_yolo(yaml_path, train_cfg)

    print("\n--- [4/5] Evaluating ---")
    summary = evaluate_yolo(model, yaml_path, eval_cfg)[1]

    print("\n--- [5/5] Saving artifacts ---")
    save_artifacts(train_dir, summary, mode, train_cfg)
    viz_predictions(model, n_samples=4)

    if EXPORT_ONNX:
        export_onnx(model)
    if ZIP_OUTPUT:
        print("\n--- Zipping output ---")
        zip_output()

    print("\n✓ Pipeline complete.")
    print(f"  Weights: {WEIGHTS_OUT / 'best.pt'}")
    print(f"  Metrics: mAP@50={summary['mAP50']:.4f}  "
          f"mAP@50-95={summary['mAP50-95']:.4f}")
    return summary


def run_full_pipeline():
    assert IMG_DIR.exists(), f"Missing {IMG_DIR}"
    assert ANN_DIR.exists(), f"Missing {ANN_DIR}"
    titles = sorted(p.stem for p in ANN_DIR.glob("*.xml"))
    print(f"FULL mode | {len(titles)} titles | classes={CLASSES}")
    return run_pipeline(titles, TRAIN_CONFIG, EVAL_CONFIG, mode="full")


# ============================================================================
# [6] Kaggle smoke test
# ============================================================================
def run_smoke_test():
    """End-to-end pipeline trên 4 titles + 1 epoch để verify setup.
    Mục tiêu: finish trong 3-5 min trên T4. Pass = MODE='full' chạy được."""
    print("\n" + "=" * 70)
    print(" SMOKE TEST — verify Kaggle environment + pipeline")
    print("=" * 70)
    assert IMG_DIR.exists(), f"Missing {IMG_DIR}"
    assert ANN_DIR.exists(), f"Missing {ANN_DIR}"

    # Pre-flight environment checks
    print("\n--- Pre-flight checks ---")
    _ensure_ultralytics()
    import ultralytics
    print(f"  ultralytics: {ultralytics.__version__}")
    dev, dev_name = detect_device()
    print(f"  device     : {dev_name}")
    if dev == "cpu":
        print("  ⚠ CPU mode — smoke vẫn chạy được nhưng full mode sẽ rất chậm.")

    all_titles = sorted(p.stem for p in ANN_DIR.glob("*.xml"))
    titles = all_titles[:4]
    print(f"  titles     : {titles}")

    smoke_train = {**TRAIN_CONFIG,
                   "epochs": 1, "batch": 4, "name": "manga109_smoke",
                   "patience": 0, "workers": 2, "plots": False}
    smoke_eval = {**EVAL_CONFIG, "plots": False, "save_json": False}
    smoke_ratio = (0.5, 0.25, 0.25)  # 4 titles → 2/1/1

    summary = run_pipeline(
        titles, smoke_train, smoke_eval, mode="smoke", split_ratio=smoke_ratio)

    print("\n--- Smoke validation ---")
    checks = {
        "data.yaml":     OUT_DIR / "data.yaml",
        "best.pt":       WEIGHTS_OUT / "best.pt",
        "last.pt":       WEIGHTS_OUT / "last.pt",
        "metadata.json": WEIGHTS_OUT / "metadata.json",
        "results.csv":   WEIGHTS_OUT / "results.csv",
    }
    all_ok = True
    for name, p in checks.items():
        ok = p.exists()
        size = f"{p.stat().st_size / 1024:.1f} KB" if ok else "—"
        print(f"  [{'OK  ' if ok else 'FAIL'}] {name:14s} ({size})")
        all_ok = all_ok and ok

    test_imgs = list((OUT_DIR / "images" / "test").iterdir())
    test_lbls = list((OUT_DIR / "labels" / "test").glob("*.txt"))
    print(f"  [{'OK  ' if test_imgs else 'FAIL'}] test images    "
          f"({len(test_imgs)} files)")
    print(f"  [{'OK  ' if test_lbls else 'FAIL'}] test labels    "
          f"({len(test_lbls)} files)")
    all_ok = all_ok and bool(test_imgs) and bool(test_lbls)

    print("\n" + "=" * 70)
    if all_ok:
        print(" ✓ SMOKE TEST PASSED — set MODE='full' for the real run")
    else:
        print(" ✗ SMOKE TEST FAILED — see above")
    print("=" * 70)
    assert all_ok, "Smoke test failed"
    return summary


# ============================================================================
# Main
# ============================================================================
if __name__ == "__main__":
    print("=" * 70)
    print(f" Manga109 YOLO Pipeline | MODE={MODE} | seed={SEED}")
    print("=" * 70)
    if MODE == "smoke":
        run_smoke_test()
    elif MODE == "full":
        run_full_pipeline()
    else:
        raise ValueError(f"MODE phải là 'full' hoặc 'smoke', got {MODE!r}")
