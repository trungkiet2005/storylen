# -*- coding: utf-8 -*-
"""StoryLens UML Use-Case diagram (PA3 - Section 3)."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Ellipse, FancyArrowPatch, Rectangle

INK = "#15110c"; ACCENT = "#b91c1c"; PAPER = "#fbf7ef"
fig, ax = plt.subplots(figsize=(15, 11))
ax.set_xlim(0, 15); ax.set_ylim(0, 11); ax.axis("off")
fig.patch.set_facecolor(PAPER); ax.set_facecolor(PAPER)

# System boundary
ax.add_patch(Rectangle((4.2, 0.6), 6.6, 9.8, fill=False, lw=2.2, edgecolor=INK))
ax.text(7.5, 10.15, "Hệ thống StoryLens", ha="center", va="center", fontsize=12, fontweight="bold", color=INK)


def actor(x, y, name):
    ax.plot([x], [y + 0.32], marker="o", ms=11, color=INK)
    ax.plot([x, x], [y + 0.27, y - 0.18], color=INK, lw=2)
    ax.plot([x - 0.32, x + 0.32], [y + 0.12, y + 0.12], color=INK, lw=2)
    ax.plot([x, x - 0.28], [y - 0.18, y - 0.55], color=INK, lw=2)
    ax.plot([x, x + 0.28], [y - 0.18, y - 0.55], color=INK, lw=2)
    ax.text(x, y - 0.85, name, ha="center", va="top", fontsize=10, fontweight="bold", color=INK)


def uc(x, y, label, w=2.45, h=0.92, color=INK):
    ax.add_patch(Ellipse((x, y), w, h, fill=True, facecolor="#ffffff", edgecolor=color, lw=1.8, zorder=3))
    ax.text(x, y, label, ha="center", va="center", fontsize=8.7, color=INK, zorder=4)


def link(a, b, color=INK, lw=1.4, dashed=False, label=None):
    ls = (0, (5, 3)) if dashed else "solid"
    ax.add_patch(FancyArrowPatch(a, b, arrowstyle="-", lw=lw, color=color, linestyle=ls, zorder=1))
    if label:
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        ax.text(mx, my, label, fontsize=7.2, style="italic", ha="center", color="#6b21a8",
                bbox=dict(boxstyle="round,pad=0.1", fc=PAPER, ec="none"))


# Actors (left + right)
actor(1.7, 8.4, "Khách\n(Guest)")
actor(1.7, 5.2, "Người dùng\nđã đăng ký")
actor(1.7, 2.2, "Content\nCreator")
actor(13.3, 7.6, "Admin")
actor(13.3, 4.0, "Gemini API\n«system»")
actor(13.3, 1.7, "AI Module\n«system»")

# Use cases inside boundary
UC = {
    "reg":  (5.7, 9.3, "Đăng ký / Đăng nhập"),
    "up":   (5.7, 8.1, "UC01: Upload &\nDịch trang manga"),
    "batch":(9.3, 8.1, "UC03: Batch upload\ncả chương"),
    "ov":   (5.7, 6.9, "UC02: Xem bản dịch\noverlay"),
    "his":  (5.7, 5.7, "UC04: Xem lịch sử /\ntiếp tục đọc"),
    "lib":  (9.3, 6.9, "Xuất bản &\nThư viện công khai"),
    "review":(5.7, 4.5, "Hiệu đính bong bóng\n(Studio QC)"),
    "credit":(9.3, 5.7, "Quản lý credits /\nnâng cấp gói"),
    "forum": (9.3, 4.5, "Diễn đàn / Bình luận"),
    "admin": (7.5, 2.9, "Quản trị hệ thống\n(Admin dashboard)"),
}
for k, (x, y, lb) in UC.items():
    uc(x, y, lb)

# Guest
for k in ["reg", "ov", "lib"]:
    link((2.2, 8.4), (UC[k][0] - 1.2, UC[k][1]))
# Registered user
for k in ["up", "ov", "his", "credit", "review"]:
    link((2.2, 5.2), (UC[k][0] - 1.2, UC[k][1]))
# Content creator
for k in ["batch", "lib", "forum", "review"]:
    link((2.2, 2.2), (UC[k][0] - 1.2, UC[k][1]))
# Admin
link((12.8, 7.6), (UC["admin"][0] + 1.2, UC["admin"][1] + 0.2))
link((12.8, 7.6), (UC["credit"][0] + 1.2, UC["credit"][1]))
# Gemini system (translation only)
link((12.8, 4.0), (UC["up"][0] + 1.2, UC["up"][1]), color="#1d4ed8")
# AI module system
link((12.8, 1.7), (UC["up"][0] + 1.2, UC["up"][1] - 0.2), color="#0f766e")
link((12.8, 1.7), (UC["batch"][0] + 1.2, UC["batch"][1] - 0.2), color="#0f766e")

# include
link((UC["up"][0], UC["up"][1] - 0.46), (UC["ov"][0], UC["ov"][1] + 0.46), dashed=True, label="«include»")
link((UC["batch"][0], UC["batch"][1] - 0.46), (UC["up"][0] + 1.3, UC["up"][1]), dashed=True, label="«include»")

ax.text(7.5, 0.25, "Hình 3.1 — Sơ đồ Use-Case tổng quát của StoryLens", ha="center", fontsize=10, style="italic")
plt.tight_layout()
plt.savefig("usecase_diagram.png", dpi=185, bbox_inches="tight", facecolor=PAPER)
print("saved usecase_diagram.png")
