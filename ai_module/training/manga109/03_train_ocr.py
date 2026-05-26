"""
Manga109-s → OCR Fine-tune (kha-white/manga-ocr-base)
======================================================
End-to-end pipeline (single file) cho StoryLens OCR:

  [1] Extract crop+text pairs từ Manga109-s XML annotations
      - Mỗi <text> element → 1 sample (crop ảnh theo bbox + text label)
      - Split theo *title* (chống leak), 80/10/10 train/val/test
      - Filter: bbox quá nhỏ (< MIN_BOX_PX), text rỗng, text quá dài
  [2] Fine-tune VisionEncoderDecoderModel (kha-white/manga-ocr-base)
      - HuggingFace Trainer (Seq2SeqTrainer) với fp16 trên GPU
      - Optimizer: AdamW + cosine LR schedule, label smoothing
  [3] Evaluate trên test split (CER + char accuracy + exact match)
  [4] Visualize predictions vs ground truth trên sample crops
  [5] Save model + processor + tokenizer + metadata.json
      vào /kaggle/working/manga109_ocr/weights/
  [6] (Optional) Push lên HuggingFace Hub cho ai_module production

Run modes:
  MODE = "full"   → real fine-tune (~2-4h trên T4 / P100)
  MODE = "smoke"  → 4 titles, 1 epoch, ~5-8 min — verify pipeline

Kaggle setup (paste vào 1 cell notebook):

    !pip install -q transformers datasets evaluate jiwer manga-ocr sentencepiece
    %run /kaggle/working/03_train_ocr.py

Yêu cầu: Settings → Accelerator → GPU T4 x2 / P100.
CPU vẫn chạy được nhưng full mode sẽ rất lâu.

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
from dataclasses import dataclass

import matplotlib.pyplot as plt
from PIL import Image


def _ensure_deps():
    """Kaggle notebooks không có sẵn HF stack — pip install nếu thiếu.

    manga-ocr-base dùng BertJapaneseTokenizer → cần fugashi + unidic-lite (MeCab).
    """
    needed = []
    try:
        import transformers  # noqa: F401
    except ImportError:
        needed.append("transformers")
    try:
        import datasets  # noqa: F401
    except ImportError:
        needed.append("datasets")
    try:
        import evaluate  # noqa: F401
    except ImportError:
        needed.append("evaluate")
    try:
        import jiwer  # noqa: F401
    except ImportError:
        needed.append("jiwer")
    try:
        import sentencepiece  # noqa: F401
    except ImportError:
        needed.append("sentencepiece")
    try:
        import fugashi  # noqa: F401
    except ImportError:
        needed.append("fugashi")
    try:
        import unidic_lite  # noqa: F401
    except ImportError:
        needed.append("unidic-lite")
    try:
        import japanize_matplotlib  # noqa: F401
    except ImportError:
        needed.append("japanize-matplotlib")
    if needed:
        print(f"  Installing missing packages: {needed}")
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-q"] + needed
        )
    import transformers
    # Auto-config matplotlib để render chữ Nhật (tránh "Glyph missing" warning)
    try:
        import japanize_matplotlib  # noqa: F401
    except ImportError:
        pass
    print(f"  ✓ transformers {transformers.__version__}")


# ============================================================================
# Config
# ============================================================================
MODE = "full"  # "full" | "smoke"

BASE = Path("/kaggle/input/datasets/trungkiet/manga-109-s/Manga109s_clean/Manga109sreleased20260521")
IMG_DIR = BASE / "images1"
ANN_DIR = BASE / "annotations1"
OUT_DIR = Path("/kaggle/working/manga109_ocr")
CROPS_DIR = OUT_DIR / "crops"
RUN_ROOT = Path("/kaggle/working/runs_ocr")
WEIGHTS_OUT = OUT_DIR / "weights"

BASE_MODEL = "kha-white/manga-ocr-base"

SPLIT_RATIO = (0.80, 0.10, 0.10)
SEED = 42

# Filtering crops
MIN_BOX_PX = 8          # bbox cạnh tối thiểu
MAX_TEXT_LEN = 300      # text label tối đa (tokens count khác — đây là chars)
MIN_TEXT_LEN = 1        # cho phép 1 ký tự (Japanese particles)
PAD_RATIO = 0.05        # pad 5% mỗi cạnh để OCR không bị cắt sát mép chữ

# Train config — tuned cho fine-tune nhẹ trên T4 16GB
TRAIN_CONFIG = dict(
    output_dir=str(RUN_ROOT / "manga109_ocr"),
    num_train_epochs=8,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=32,
    gradient_accumulation_steps=1,
    learning_rate=3e-5,
    weight_decay=0.01,
    warmup_ratio=0.05,
    lr_scheduler_type="cosine",
    label_smoothing_factor=0.1,
    logging_steps=50,
    eval_strategy="epoch",
    save_strategy="epoch",
    save_total_limit=2,
    load_best_model_at_end=True,
    metric_for_best_model="cer",
    greater_is_better=False,
    predict_with_generate=True,
    generation_max_length=64,
    generation_num_beams=1,
    fp16=True,
    report_to="none",
    seed=SEED,
    remove_unused_columns=False,
    dataloader_num_workers=4,
    dataloader_pin_memory=True,
)

_IMG_EXTS = (".jpg", ".jpeg", ".png", ".webp")
_image_cache = {}
_page_cache = {}


# ============================================================================
# Helpers (shared với file 02)
# ============================================================================
def list_images(title: str):
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
            return "cuda", f"cuda:0 ({torch.cuda.get_device_name(0)})"
    except ImportError:
        pass
    return "cpu", "cpu"


# ============================================================================
# [1] Extract crops + text labels
# ============================================================================
def parse_texts(xml_path: Path):
    """Yield (page_idx, W, H, [(bbox, text), ...]) cho mỗi page có text."""
    tree = ET.parse(xml_path)
    root = tree.getroot()
    for page in root.findall(".//page"):
        idx = int(page.get("index"))
        W = int(page.get("width"))
        H = int(page.get("height"))
        items = []
        for t in page.findall("text"):
            try:
                x1 = max(0, int(t.get("xmin")))
                y1 = max(0, int(t.get("ymin")))
                x2 = min(W, int(t.get("xmax")))
                y2 = min(H, int(t.get("ymax")))
            except (TypeError, ValueError):
                continue
            text = (t.text or "").strip()
            if not text:
                continue
            items.append(((x1, y1, x2, y2), text))
        if items:
            yield idx, W, H, items


def pad_bbox(x1, y1, x2, y2, W, H, ratio=PAD_RATIO):
    w = x2 - x1
    h = y2 - y1
    px = int(w * ratio)
    py = int(h * ratio)
    return (
        max(0, x1 - px),
        max(0, y1 - py),
        min(W, x2 + px),
        min(H, y2 + py),
    )


def extract_crops(titles, train, val):
    """Crop từng <text> bbox + ghi manifest JSONL per split.
    Return: dict[split] = [(crop_path, text), ...]
    """
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    for sp in ("train", "val", "test"):
        (CROPS_DIR / sp).mkdir(parents=True, exist_ok=True)

    manifests = {"train": [], "val": [], "test": []}
    stats = {"written": 0, "no_image": 0, "bad_box": 0,
             "empty_text": 0, "too_long": 0,
             "per_split": {"train": 0, "val": 0, "test": 0}}

    for title in titles:
        sp = split_of(title, train, val)
        xml = ANN_DIR / f"{title}.xml"
        for idx, W, H, items in parse_texts(xml):
            img_path = find_image(title, idx)
            if img_path is None:
                stats["no_image"] += len(items)
                continue
            try:
                page_img = Image.open(img_path).convert("RGB")
            except Exception:
                stats["no_image"] += len(items)
                continue

            for k, ((x1, y1, x2, y2), text) in enumerate(items):
                if (x2 - x1) < MIN_BOX_PX or (y2 - y1) < MIN_BOX_PX:
                    stats["bad_box"] += 1
                    continue
                if len(text) < MIN_TEXT_LEN:
                    stats["empty_text"] += 1
                    continue
                if len(text) > MAX_TEXT_LEN:
                    stats["too_long"] += 1
                    continue

                px1, py1, px2, py2 = pad_bbox(x1, y1, x2, y2, W, H)
                crop = page_img.crop((px1, py1, px2, py2))

                stem = f"{title}_{idx:04d}_{k:03d}"
                crop_path = CROPS_DIR / sp / f"{stem}.jpg"
                crop.save(crop_path, "JPEG", quality=92)
                manifests[sp].append({"image": str(crop_path), "text": text})
                stats["written"] += 1
                stats["per_split"][sp] += 1

    for sp, items in manifests.items():
        with open(CROPS_DIR / f"{sp}.jsonl", "w", encoding="utf-8") as f:
            for it in items:
                f.write(json.dumps(it, ensure_ascii=False) + "\n")

    return stats, manifests


def viz_samples(manifest, n=6, save_to: Path = None):
    """Visualize n crop samples với text label."""
    if not manifest:
        return
    rng = random.Random(SEED)
    samples = rng.sample(manifest, min(n, len(manifest)))
    cols = 3
    rows = (len(samples) + cols - 1) // cols
    fig, axes = plt.subplots(rows, cols, figsize=(cols * 4, rows * 4))
    if rows == 1:
        axes = axes.reshape(1, -1)
    for ax in axes.flat:
        ax.axis("off")
    for ax, item in zip(axes.flat, samples):
        img = Image.open(item["image"]).convert("RGB")
        ax.imshow(img)
        title = item["text"][:30] + ("…" if len(item["text"]) > 30 else "")
        ax.set_title(title, fontsize=10)
    plt.tight_layout()
    if save_to:
        plt.savefig(save_to, dpi=100, bbox_inches="tight")
        print(f"  saved → {save_to}")
    plt.show()
    plt.close(fig)


# ============================================================================
# [2] Dataset + Model
# ============================================================================
@dataclass
class OcrCollator:
    """Collate batch: stack pixel_values + pad labels + compute decoder_input_ids.

    transformers 5.0+ KHÔNG còn auto-shift `labels` → `decoder_input_ids` trong
    VisionEncoderDecoderModel.forward, nên phải tự shift ở đây (an toàn cho mọi
    HF version).
    """
    processor: any
    max_length: int = 64
    decoder_start_token_id: int = 2  # CLS của BertJapanese; sẽ override từ model.config

    def __call__(self, examples):
        import torch
        pixel_values = torch.stack([ex["pixel_values"] for ex in examples])
        labels = [ex["labels"] for ex in examples]
        max_len = min(self.max_length, max(len(l) for l in labels))
        pad_id = self.processor.tokenizer.pad_token_id
        padded = torch.full((len(labels), max_len), pad_id, dtype=torch.long)
        for i, l in enumerate(labels):
            l = l[:max_len]
            padded[i, :len(l)] = torch.tensor(l, dtype=torch.long)

        # decoder_input_ids = shift right + prepend decoder_start_token_id
        decoder_input_ids = torch.full_like(padded, pad_id)
        decoder_input_ids[:, 0] = self.decoder_start_token_id
        decoder_input_ids[:, 1:] = padded[:, :-1]

        # labels: pad_id → -100 (ignore_index cho cross-entropy)
        labels_t = padded.clone()
        labels_t[labels_t == pad_id] = -100

        return {
            "pixel_values": pixel_values,
            "labels": labels_t,
            "decoder_input_ids": decoder_input_ids,
        }


class LazyOcrDataset:
    """Lazy dataset — preprocess on `__getitem__` để tránh tràn RAM.

    Manga109 có ~150k crops → in-memory pixel_values float32 ≈ 90GB.
    Với lazy loading chỉ batch hiện tại ở RAM (~few hundred MB).
    Tokens được pre-tokenize (rẻ — vài MB) để tránh init MeCab mỗi step.
    """

    def __init__(self, manifest, processor, max_length: int):
        from tqdm.auto import tqdm
        self.processor = processor
        self.max_length = max_length
        self.items = []
        tok = processor.tokenizer
        for item in tqdm(manifest, desc="  pre-tokenizing"):
            ids = tok(
                item["text"],
                truncation=True,
                max_length=max_length,
                add_special_tokens=True,
            ).input_ids
            self.items.append({"image": item["image"], "labels": ids})

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        it = self.items[idx]
        img = Image.open(it["image"]).convert("RGB")
        pv = self.processor(img, return_tensors="pt").pixel_values[0]
        return {"pixel_values": pv, "labels": it["labels"]}


def build_dataset(manifest, processor, max_length: int):
    return LazyOcrDataset(manifest, processor, max_length)


# ============================================================================
# [3] Metrics
# ============================================================================
def make_compute_metrics(processor):
    import jiwer
    tokenizer = processor.tokenizer

    def compute_metrics(eval_pred):
        preds = eval_pred.predictions
        labels = eval_pred.label_ids

        # Replace -100 (ignore_index) với pad_token_id để decode
        import numpy as np
        labels = np.where(labels == -100, tokenizer.pad_token_id, labels)
        if isinstance(preds, tuple):
            preds = preds[0]
        # Một số phiên bản trả về logits — argmax
        if preds.ndim == 3:
            preds = preds.argmax(-1)

        pred_str = tokenizer.batch_decode(preds, skip_special_tokens=True)
        label_str = tokenizer.batch_decode(labels, skip_special_tokens=True)

        # jiwer CER expects non-empty refs — filter
        pairs = [(p, r) for p, r in zip(pred_str, label_str) if r.strip()]
        if not pairs:
            return {"cer": 1.0, "exact_match": 0.0, "char_acc": 0.0}
        preds_f, refs_f = zip(*pairs)
        cer = jiwer.cer(list(refs_f), list(preds_f))
        exact = sum(p == r for p, r in pairs) / len(pairs)
        return {
            "cer": float(cer),
            "exact_match": float(exact),
            "char_acc": float(max(0.0, 1.0 - cer)),
        }

    return compute_metrics


# ============================================================================
# [4] Train
# ============================================================================
def train_ocr(train_samples, val_samples, processor, cfg: dict):
    _ensure_deps()
    import torch
    from transformers import (
        VisionEncoderDecoderModel,
        Seq2SeqTrainer,
        Seq2SeqTrainingArguments,
        EarlyStoppingCallback,
    )

    dev, dev_name = detect_device()
    print(f"  device: {dev_name}")
    print(f"  base model: {BASE_MODEL}")
    print(f"  train: {len(train_samples)}  val: {len(val_samples)}")

    model = VisionEncoderDecoderModel.from_pretrained(BASE_MODEL)
    # Ensure decoder config phù hợp với tokenizer hiện tại
    model.config.decoder_start_token_id = processor.tokenizer.cls_token_id \
        or processor.tokenizer.bos_token_id
    model.config.pad_token_id = processor.tokenizer.pad_token_id
    model.config.eos_token_id = processor.tokenizer.sep_token_id \
        or processor.tokenizer.eos_token_id
    model.config.vocab_size = model.config.decoder.vocab_size

    # fp16 chỉ bật khi có CUDA
    if dev == "cpu":
        cfg = {**cfg, "fp16": False}

    args = Seq2SeqTrainingArguments(**cfg)
    collator = OcrCollator(
        processor=processor,
        max_length=cfg.get("generation_max_length", 64),
        decoder_start_token_id=model.config.decoder_start_token_id,
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=args,
        train_dataset=train_samples,
        eval_dataset=val_samples,
        data_collator=collator,
        compute_metrics=make_compute_metrics(processor),
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)]
        if cfg.get("eval_strategy") != "no" else [],
    )

    trainer.train()
    save_dir = Path(cfg["output_dir"])
    print(f"\n  train output: {save_dir}")
    return trainer, save_dir


# ============================================================================
# [5] Evaluate
# ============================================================================
def evaluate_ocr(trainer, test_samples):
    print("\n--- Evaluating on test split ---")
    metrics = trainer.evaluate(eval_dataset=test_samples, metric_key_prefix="test")
    print("\n=== Test Metrics ===")
    for k, v in metrics.items():
        if isinstance(v, (int, float)):
            print(f"  {k}: {v:.4f}")
    return metrics


def viz_predictions(trainer, processor, test_manifest, n: int = 6,
                    save_to: Path = None):
    """Predict trên n test crops và visualize pred vs ground truth."""
    import torch
    if not test_manifest:
        print("  no test samples")
        return
    rng = random.Random(SEED)
    samples = rng.sample(test_manifest, min(n, len(test_manifest)))

    model = trainer.model.eval()
    device = next(model.parameters()).device

    cols = 3
    rows = (len(samples) + cols - 1) // cols
    fig, axes = plt.subplots(rows, cols, figsize=(cols * 4, rows * 4.5))
    if rows == 1:
        axes = axes.reshape(1, -1)
    for ax in axes.flat:
        ax.axis("off")

    for ax, item in zip(axes.flat, samples):
        img = Image.open(item["image"]).convert("RGB")
        pv = processor(img, return_tensors="pt").pixel_values.to(device)
        with torch.no_grad():
            ids = model.generate(pv, max_length=64, num_beams=1)
        pred = processor.tokenizer.decode(ids[0], skip_special_tokens=True)
        ok = "✓" if pred.strip() == item["text"].strip() else "✗"
        ax.imshow(img)
        gt = item["text"][:30] + ("…" if len(item["text"]) > 30 else "")
        pd_ = pred[:30] + ("…" if len(pred) > 30 else "")
        ax.set_title(f"{ok} GT: {gt}\nPR: {pd_}", fontsize=9)

    plt.tight_layout()
    if save_to:
        plt.savefig(save_to, dpi=100, bbox_inches="tight")
        print(f"  saved → {save_to}")
    plt.show()
    plt.close(fig)


# ============================================================================
# [6] Save artifacts
# ============================================================================
def save_artifacts(trainer, processor, save_dir: Path, summary: dict,
                   mode: str, train_cfg: dict, data_stats: dict):
    WEIGHTS_OUT.mkdir(parents=True, exist_ok=True)
    trainer.save_model(str(WEIGHTS_OUT))
    processor.save_pretrained(str(WEIGHTS_OUT))
    print(f"  model + processor → {WEIGHTS_OUT}")

    # Copy training logs
    log_csv = save_dir / "trainer_state.json"
    if log_csv.exists():
        shutil.copy2(log_csv, WEIGHTS_OUT / "trainer_state.json")

    meta = {
        "mode": mode,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "base_model": BASE_MODEL,
        "split_ratio": list(SPLIT_RATIO),
        "seed": SEED,
        "filter": {
            "min_box_px": MIN_BOX_PX,
            "min_text_len": MIN_TEXT_LEN,
            "max_text_len": MAX_TEXT_LEN,
            "pad_ratio": PAD_RATIO,
        },
        "data_stats": data_stats,
        "train_config": train_cfg,
        "test_metrics": {k: v for k, v in summary.items()
                         if isinstance(v, (int, float, str))},
        "train_dir": str(save_dir),
    }
    (WEIGHTS_OUT / "metadata.json").write_text(
        json.dumps(meta, indent=2, default=str, ensure_ascii=False))
    print(f"  metadata.json → {WEIGHTS_OUT / 'metadata.json'}")


# ============================================================================
# Pipeline orchestration
# ============================================================================
def run_pipeline(titles, train_cfg, mode, split_ratio=None):
    _ensure_deps()
    from transformers import TrOCRProcessor, AutoTokenizer, ViTImageProcessor
    try:
        # manga-ocr ships AutoTokenizer + ViTImageProcessor — TrOCRProcessor wraps both
        processor = TrOCRProcessor.from_pretrained(BASE_MODEL)
    except Exception:
        # Fallback: build processor thủ công từ 2 thành phần
        feat = ViTImageProcessor.from_pretrained(BASE_MODEL)
        tok = AutoTokenizer.from_pretrained(BASE_MODEL)
        processor = TrOCRProcessor(image_processor=feat, tokenizer=tok)
    print(f"  processor loaded: tokenizer vocab={processor.tokenizer.vocab_size}")

    train, val, test = make_split(titles, ratio=split_ratio)
    print(f"\nSplit: Train {len(train)} | Val {len(val)} | Test {len(test)}")
    if mode == "smoke":
        print(f"  train: {sorted(train)}")
        print(f"  val  : {sorted(val)}")
        print(f"  test : {sorted(test)}")

    print("\n--- [1/5] Extracting crops ---")
    stats, manifests = extract_crops(titles, train, val)
    print("  stats:", stats)
    assert stats["per_split"]["train"] > 0, "No training crops written"
    assert stats["per_split"]["val"] > 0, "No validation crops written"

    viz_dir = Path("/kaggle/working/manga109_ocr_viz")
    viz_dir.mkdir(parents=True, exist_ok=True)
    viz_samples(manifests["train"], n=6, save_to=viz_dir / "train_samples.png")

    print("\n--- [2/5] Building datasets ---")
    max_len = train_cfg.get("generation_max_length", 64)
    train_ds = build_dataset(manifests["train"], processor, max_len)
    val_ds = build_dataset(manifests["val"], processor, max_len)
    test_ds = build_dataset(manifests["test"], processor, max_len)
    print(f"  train: {len(train_ds)}  val: {len(val_ds)}  test: {len(test_ds)}")

    print("\n--- [3/5] Training ---")
    trainer, save_dir = train_ocr(train_ds, val_ds, processor, train_cfg)

    print("\n--- [4/5] Evaluating ---")
    summary = evaluate_ocr(trainer, test_ds)

    print("\n--- [5/5] Saving artifacts ---")
    save_artifacts(trainer, processor, save_dir, summary, mode, train_cfg, stats)
    viz_predictions(trainer, processor, manifests["test"], n=6,
                    save_to=viz_dir / "test_predictions.png")

    print("\n✓ Pipeline complete.")
    print(f"  Weights: {WEIGHTS_OUT}")
    cer = summary.get("test_cer", summary.get("eval_cer"))
    if cer is not None:
        print(f"  Test CER: {cer:.4f}  (char accuracy ≈ {1-cer:.4f})")
    return summary


def run_full_pipeline():
    assert IMG_DIR.exists(), f"Missing {IMG_DIR}"
    assert ANN_DIR.exists(), f"Missing {ANN_DIR}"
    titles = sorted(p.stem for p in ANN_DIR.glob("*.xml"))
    print(f"FULL mode | {len(titles)} titles | base={BASE_MODEL}")
    return run_pipeline(titles, TRAIN_CONFIG, mode="full")


# ============================================================================
# Smoke test
# ============================================================================
def run_smoke_test():
    """End-to-end pipeline trên 4 titles + 1 epoch để verify setup.
    Mục tiêu: finish trong 5-8 min trên T4."""
    print("\n" + "=" * 70)
    print(" OCR SMOKE TEST — verify Kaggle environment + pipeline")
    print("=" * 70)
    assert IMG_DIR.exists(), f"Missing {IMG_DIR}"
    assert ANN_DIR.exists(), f"Missing {ANN_DIR}"

    print("\n--- Pre-flight checks ---")
    _ensure_deps()
    import transformers
    print(f"  transformers: {transformers.__version__}")
    dev, dev_name = detect_device()
    print(f"  device      : {dev_name}")
    if dev == "cpu":
        print("  ⚠ CPU mode — smoke vẫn chạy nhưng full mode sẽ rất chậm.")

    all_titles = sorted(p.stem for p in ANN_DIR.glob("*.xml"))
    titles = all_titles[:4]
    print(f"  titles      : {titles}")

    smoke_cfg = {
        **TRAIN_CONFIG,
        "num_train_epochs": 1,
        "per_device_train_batch_size": 4,
        "per_device_eval_batch_size": 8,
        "logging_steps": 10,
        "output_dir": str(RUN_ROOT / "manga109_ocr_smoke"),
        "save_total_limit": 1,
    }
    smoke_ratio = (0.5, 0.25, 0.25)  # 4 titles → 2/1/1

    summary = run_pipeline(titles, smoke_cfg, mode="smoke", split_ratio=smoke_ratio)

    print("\n--- Smoke validation ---")
    checks = {
        "metadata.json":         WEIGHTS_OUT / "metadata.json",
        "config.json":           WEIGHTS_OUT / "config.json",
        "model weights":         WEIGHTS_OUT / "model.safetensors",
        "tokenizer_config.json": WEIGHTS_OUT / "tokenizer_config.json",
        "preprocessor_config":   WEIGHTS_OUT / "preprocessor_config.json",
    }
    # model.safetensors có thể tên pytorch_model.bin tuỳ HF version
    if not checks["model weights"].exists():
        alt = WEIGHTS_OUT / "pytorch_model.bin"
        if alt.exists():
            checks["model weights"] = alt

    all_ok = True
    for name, p in checks.items():
        ok = p.exists()
        size = f"{p.stat().st_size / 1024:.1f} KB" if ok else "—"
        print(f"  [{'OK  ' if ok else 'FAIL'}] {name:22s} ({size})")
        all_ok = all_ok and ok

    print("\n" + "=" * 70)
    if all_ok:
        print(" ✓ OCR SMOKE TEST PASSED — set MODE='full' for the real run")
    else:
        print(" ✗ OCR SMOKE TEST FAILED — see above")
    print("=" * 70)
    assert all_ok, "Smoke test failed"
    return summary


# ============================================================================
# Main
# ============================================================================
if __name__ == "__main__":
    print("=" * 70)
    print(f" Manga109 OCR Fine-tune Pipeline | MODE={MODE} | seed={SEED}")
    print("=" * 70)
    if MODE == "smoke":
        run_smoke_test()
    elif MODE == "full":
        run_full_pipeline()
    else:
        raise ValueError(f"MODE phải là 'full' hoặc 'smoke', got {MODE!r}")
