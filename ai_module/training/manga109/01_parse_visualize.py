"""
Manga109-s — Parse XML + Visualize Annotation
==============================================
Bước A của roadmap. Verify dataset, thống kê annotation, visualize bbox
(frame / body / face / text) overlay lên page.

Input dataset path (Kaggle):
    /kaggle/input/datasets/trungkiet/manga-109-s/Manga109s_clean/Manga109sreleased20260521

Caveat: Manga109 KHÔNG có annotation mask cho speech bubble. Field <text>
là bbox vùng *chữ* (tight crop quanh text), không phải contour của bubble.
Trong pipeline detect → crop → OCR, bbox text vẫn dùng được làm bubble proxy.

Cách chạy trên Kaggle (paste vào 1 cell notebook):

    %run /kaggle/working/01_parse_visualize.py

→ Hình hiện trực tiếp trong cell (inline). Đồng thời ghi PNG ra
/kaggle/working/manga109_viz/ làm backup.

KHÔNG dùng `!python` vì subprocess không pipe matplotlib figure về notebook
(chỉ thấy file PNG được lưu, không hiện hình inline).
"""

import os
import random
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import Counter

import matplotlib.pyplot as plt
import matplotlib.patches as patches
from PIL import Image


# ============================================================================
# Cell A1 — Imports + paths + find_image
# ============================================================================
BASE = Path("/kaggle/input/datasets/trungkiet/manga-109-s/Manga109s_clean/Manga109sreleased20260521")
IMG_DIR = BASE / "images1"
ANN_DIR = BASE / "annotations1"
OUT_DIR = Path("/kaggle/working/manga109_viz")
OUT_DIR.mkdir(parents=True, exist_ok=True)

_IMG_EXTS = (".jpg", ".jpeg", ".png", ".webp")
_image_cache = {}


def list_images(title: str):
    """Scan title dir once + sort. Page index = position trong sorted list."""
    if title not in _image_cache:
        title_dir = IMG_DIR / title
        if not title_dir.exists():
            _image_cache[title] = []
        else:
            _image_cache[title] = sorted(
                p for p in title_dir.iterdir()
                if p.suffix.lower() in _IMG_EXTS
            )
    return _image_cache[title]


def find_image(title: str, page_idx: int):
    """Robust: scan dir + index by position. Works cho mọi padding / 0-1 indexed."""
    imgs = list_images(title)
    if 0 <= page_idx < len(imgs):
        return imgs[page_idx]
    return None


# ============================================================================
# Cell A2 — Parser
# ============================================================================
def parse_xml(xml_path: Path):
    """Return (book_title, [page_dict, ...])."""
    tree = ET.parse(xml_path)
    root = tree.getroot()
    book_title = root.get("title", "")

    pages = []
    for page in root.findall(".//page"):
        pd = {
            "index": int(page.get("index")),
            "width": int(page.get("width")),
            "height": int(page.get("height")),
            "frames": [], "bodies": [], "faces": [], "texts": [],
        }
        for elem in page:
            try:
                box = (int(elem.get("xmin")), int(elem.get("ymin")),
                       int(elem.get("xmax")), int(elem.get("ymax")))
            except (TypeError, ValueError):
                continue
            entry = {
                "id": elem.get("id"),
                "bbox": box,
                "character": elem.get("character"),
                "text": (elem.text or "").strip(),
            }
            key = {"frame": "frames", "body": "bodies",
                   "face": "faces", "text": "texts"}.get(elem.tag)
            if key:
                pd[key].append(entry)
        pages.append(pd)
    return book_title, pages


# ============================================================================
# Cell A4 — Visualize
# ============================================================================
COLORS = {"frames": "#1f77b4", "bodies": "#2ca02c",
          "faces": "#d62728", "texts": "#ff7f0e"}


def visualize(title: str, page_idx: int,
              show=("frames", "bodies", "faces", "texts"),
              figsize=(12, 9),
              save: bool = True):
    """Vẽ bbox overlay lên page. save=True → ghi PNG ra OUT_DIR; show inline nếu notebook."""
    img_path = find_image(title, page_idx)
    if img_path is None:
        raise FileNotFoundError(f"Image {title}/{page_idx} not found")
    img = Image.open(img_path).convert("RGB")
    _, pages = parse_xml(ANN_DIR / f"{title}.xml")
    page = next((p for p in pages if p["index"] == page_idx), None)
    assert page is not None, f"No page {page_idx} in {title}"

    fig, ax = plt.subplots(figsize=figsize)
    ax.imshow(img)
    for cls in show:
        for ent in page[cls]:
            x1, y1, x2, y2 = ent["bbox"]
            ax.add_patch(patches.Rectangle(
                (x1, y1), x2 - x1, y2 - y1,
                linewidth=2, edgecolor=COLORS[cls], facecolor="none"))
    handles = [patches.Patch(color=COLORS[c], label=c) for c in show]
    ax.legend(handles=handles, loc="upper right", fontsize=9)
    ax.set_title(f"{title} — page {page_idx} ({img.size[0]}x{img.size[1]})")
    ax.axis("off")
    plt.tight_layout()

    if save:
        out = OUT_DIR / f"{title}_p{page_idx:04d}.png"
        plt.savefig(out, dpi=100, bbox_inches="tight")
        print(f"  saved → {out}")
    plt.show()
    plt.close(fig)


# ============================================================================
# Main
# ============================================================================
def main():
    assert IMG_DIR.exists(), f"Missing {IMG_DIR}"
    assert ANN_DIR.exists(), f"Missing {ANN_DIR}"

    titles = sorted(p.stem for p in ANN_DIR.glob("*.xml"))
    print(f"Found {len(titles)} titles")
    print("First 10:", titles[:10])

    # Debug: xác minh filename convention
    sample_files = list_images(titles[0])
    print(f"\n{titles[0]}: {len(sample_files)} images")
    print(f"  First 5: {[p.name for p in sample_files[:5]]}")
    print(f"  Last 3 : {[p.name for p in sample_files[-3:]]}")

    # Per-title sanity check
    book, pages = parse_xml(ANN_DIR / "ARMS1.xml")
    print(f"\n{book}: {len(pages)} pages")
    c = Counter()
    for p in pages:
        for k in ("frames", "bodies", "faces", "texts"):
            c[k] += len(p[k])
    print("Annotations in ARMS1:", dict(c))

    # Dataset-wide stats
    print("\n--- Dataset stats (~30s) ---")
    all_counts = Counter()
    total_pages = 0
    ann_pages = 0
    per_title_text = {}
    for t in titles:
        _, pages = parse_xml(ANN_DIR / f"{t}.xml")
        n_text_title = 0
        for p in pages:
            total_pages += 1
            n = sum(len(p[k]) for k in ("frames", "bodies", "faces", "texts"))
            if n > 0:
                ann_pages += 1
            for k in ("frames", "bodies", "faces", "texts"):
                all_counts[k] += len(p[k])
            n_text_title += len(p["texts"])
        per_title_text[t] = n_text_title
    print(f"Titles: {len(titles)}")
    print(f"Pages : {total_pages} (annotated: {ann_pages})")
    print(f"Annotations totals: {dict(all_counts)}")
    print(f"Avg text/page: {all_counts['texts']/max(ann_pages,1):.1f}")
    print("Top-5 titles by text count:",
          sorted(per_title_text.items(), key=lambda x: -x[1])[:5])

    # Visualize a few pages
    print("\n--- Visualize samples (saved to /kaggle/working/manga109_viz/) ---")
    visualize("ARMS1", 3)
    visualize("ARMS1", 4)

    random.seed(0)
    t = random.choice(titles)
    _, pages = parse_xml(ANN_DIR / f"{t}.xml")
    non_empty = [p["index"] for p in pages if p["texts"]]
    if non_empty:
        visualize(t, random.choice(non_empty))


if __name__ == "__main__":
    main()
