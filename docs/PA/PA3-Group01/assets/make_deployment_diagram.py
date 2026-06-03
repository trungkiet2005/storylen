# -*- coding: utf-8 -*-
"""Render the StoryLens UML deployment diagram (PA3 - Section 5)."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib.lines import Line2D

INK = "#15110c"
ACCENT = "#b91c1c"
EXT = "#1d4ed8"
DATA = "#0f766e"
PURPLE = "#6b21a8"
PAPER = "#fbf7ef"

fig, ax = plt.subplots(figsize=(16, 13))
ax.set_xlim(0, 16); ax.set_ylim(0, 13); ax.axis("off")
fig.patch.set_facecolor(PAPER); ax.set_facecolor(PAPER)


def node(x, y, w, h, stereo, title, lines, edge=INK, face="#ffffff", fs=10):
    off = 0.18
    # back faces (cube hint) first
    ax.add_patch(plt.Polygon([(x, y + h), (x + off, y + h + off), (x + w + off, y + h + off), (x + w, y + h)],
                             closed=True, linewidth=1.4, edgecolor=edge, facecolor="#efe7d8", zorder=2))
    ax.add_patch(plt.Polygon([(x + w, y), (x + w + off, y + off), (x + w + off, y + h + off), (x + w, y + h)],
                             closed=True, linewidth=1.4, edgecolor=edge, facecolor="#efe7d8", zorder=2))
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="square,pad=0",
                                linewidth=2.0, edgecolor=edge, facecolor=face, zorder=3))
    cx = x + w / 2
    ax.text(cx, y + h - 0.30, stereo, ha="center", va="top", fontsize=9,
            style="italic", color=edge, zorder=4)
    ax.text(cx, y + h - 0.66, title, ha="center", va="top", fontsize=fs + 1.5,
            fontweight="bold", color=INK, zorder=4)
    ax.text(cx, y + h - 1.12, "\n".join(lines), ha="center", va="top", fontsize=fs - 0.5,
            color="#3a342c", zorder=4, linespacing=1.4)


def arrow(p1, p2, label, color=INK, style="-|>", dashed=False, lw=1.9, off=(0, 0), fs=9, rad=0.0):
    ls = (0, (6, 4)) if dashed else "solid"
    ax.add_patch(FancyArrowPatch(p1, p2, arrowstyle=style, mutation_scale=17,
                                 linewidth=lw, color=color, linestyle=ls,
                                 connectionstyle=f"arc3,rad={rad}", zorder=1.5))
    mx, my = (p1[0] + p2[0]) / 2 + off[0], (p1[1] + p2[1]) / 2 + off[1]
    ax.text(mx, my, label, ha="center", va="center", fontsize=fs, color=color,
            bbox=dict(boxstyle="round,pad=0.2", fc=PAPER, ec="none", alpha=0.96), zorder=5)


# ---- Tier bands (labels on the far left, at vertical centres) ----
for yb, name in [(11.2, "CLIENT TIER"), (8.75, "PRESENTATION"),
                 (6.25, "APPLICATION"), (3.6, "DATA & AI TIER"), (1.05, "OFFLINE TRAINING")]:
    ax.text(0.12, yb, name, rotation=90, ha="center", va="center", fontsize=9,
            color="#9a8f7d", fontweight="bold")

# ---- CLIENT TIER ----
node(1.4, 10.4, 4.0, 1.6, "«device»", "Máy tính (Desktop)",
     ["Chrome / Edge / Firefox / Safari", "Trình duyệt web — StoryLens PWA"])
node(6.2, 10.4, 4.0, 1.6, "«device»", "Điện thoại / Tablet",
     ["Mobile browser + PWA cài đặt", "Camera upload, đọc long-strip"])

# ---- PRESENTATION ----
node(3.5, 8.0, 5.6, 1.6, "«execution environment»", "Vercel  (Edge/CDN, global)",
     ["Next.js 16 + React 19 (TypeScript)", "SSR + static + Service Worker (offline)"], edge=ACCENT)

# ---- APPLICATION ----
node(3.2, 5.1, 6.4, 2.15, "«execution environment»", "Render  (Docker · Singapore)",
     ["FastAPI (Python 3.11) — REST /v1 + WebSocket",
      "routers: auth, upload, library, payments…",
      "services: ai_pipeline, credit_service,",
      "pipeline_control (cancel + event bus)"], edge=ACCENT, fs=9.5)

# ---- DATA & AI TIER ----
node(1.0, 2.55, 4.5, 2.1, "«execution environment»", "Supabase Cloud",
     ["PostgreSQL 15 (managed)", "Auth (JWT) · Storage (buckets)",
      "manga_pages, bubble_data, chapters…"], edge=DATA, fs=9.5)
node(6.0, 2.55, 4.6, 2.1, "«execution environment»", "HuggingFace Spaces",
     ["AI Module — Docker (~4GB), GPU/CPU", "YOLOv8 → manga-ocr → LaMa → render",
      "FastAPI /translate/* endpoints"], edge=DATA, fs=9.5)

# ---- EXTERNAL SaaS (right column) ----
node(11.6, 7.7, 4.0, 1.55, "«external service»", "Google Gemini API",
     ["gemini-2.5-flash", "Dịch ngữ cảnh bong bóng thoại"], edge=EXT, fs=9.5)
node(11.6, 5.55, 4.0, 1.45, "«external service»", "Stripe API",
     ["Checkout + Webhook", "Nâng cấp gói trả phí"], edge=EXT, fs=9.5)
node(11.6, 3.35, 4.0, 1.45, "«external service»", "MangaDex API",
     ["Browse / import chương", "(nguồn truyện tuỳ chọn)"], edge=EXT, fs=9.5)

# ---- OFFLINE TRAINING ----
node(6.0, 0.25, 4.6, 1.75, "«execution environment»", "Kaggle GPU (T4/P100)",
     ["Fine-tune YOLOv8 + manga-ocr (Manga109-s, offline)"], edge=PURPLE, fs=9.5)

# ---- LINKS ----
arrow((3.4, 10.4), (5.0, 9.6), "HTTPS\n(HTML/JS/CSS, PWA)", off=(-0.95, 0.05))
arrow((8.2, 10.4), (7.3, 9.6), "HTTPS", off=(0.55, 0.05))
# clients call backend directly (api.ts)
arrow((9.95, 10.5), (9.5, 7.25), "HTTPS REST /v1\n+ WSS (tiến trình)", color=ACCENT, off=(1.35, 0.0), rad=-0.16)
# vercel -> render (SSR)
arrow((6.3, 8.0), (6.3, 7.25), "HTTPS (SSR fetch)", off=(1.45, 0.0))
# render -> supabase
arrow((4.6, 5.1), (3.6, 4.65), "HTTPS\nPostgREST/Auth/Storage", color=DATA, off=(-1.25, 0.16))
# render -> hf spaces
arrow((6.8, 5.1), (7.8, 4.65), "HTTPS REST\n(/translate)", color=DATA, off=(1.15, 0.14))
# render -> gemini
arrow((9.6, 6.5), (11.6, 8.2), "HTTPS", color=EXT, off=(0.1, 0.32))
# render -> stripe
arrow((9.6, 5.9), (11.6, 6.25), "HTTPS + webhook", color=EXT, off=(-0.1, 0.24))
# render -> mangadex
arrow((9.6, 5.4), (11.6, 4.2), "HTTPS", color=EXT, off=(0.15, -0.1))
# hf spaces -> gemini (translate)
arrow((10.6, 4.0), (11.6, 7.7), "HTTPS (LLM dịch)", color=EXT, off=(1.15, -0.15), rad=-0.22)
# kaggle -> hf spaces (deploy weights)
arrow((8.3, 2.0), (8.3, 2.55), "deploy weights\n(best.pt / .safetensors)", color=PURPLE,
      dashed=True, off=(2.1, 0.0), fs=8.4)

# legend
leg = [
    Line2D([0], [0], color=INK, lw=2, label="HTTPS / REST / WSS"),
    Line2D([0], [0], color=PURPLE, lw=2, ls=(0, (6, 4)), label="Triển khai mô hình (offline → online)"),
]
ax.legend(handles=leg, loc="lower left", bbox_to_anchor=(0.01, 0.01), fontsize=9,
          frameon=True, edgecolor=INK)

ax.text(7.6, 12.65, "StoryLens — UML Deployment Diagram", ha="center", va="top",
        fontsize=16, fontweight="bold", color=INK)

plt.subplots_adjust(left=0.02, right=0.99, top=0.99, bottom=0.01)
out = "deployment_diagram.png"
plt.savefig(out, dpi=190, facecolor=PAPER)
print("saved", out)
