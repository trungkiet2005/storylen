# -*- coding: utf-8 -*-
"""Build StoryLens PA3 weekly report (Tuần 7-9) -> weekly_report_pa3.docx"""
import os
from _doc import *

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "weekly_report_pa3.docx")

doc = new_doc()

# ---- Title page ----
P(doc, "ĐẠI HỌC QUỐC GIA TP. HỒ CHÍ MINH", bold=True, align="center", size=13, after=1)
P(doc, "TRƯỜNG ĐẠI HỌC KHOA HỌC TỰ NHIÊN", bold=True, align="center", size=13, after=1)
P(doc, "KHOA CÔNG NGHỆ THÔNG TIN", bold=True, align="center", size=13, after=24)
for _ in range(2): doc.add_paragraph()
P(doc, "PA3", bold=True, align="center", size=26, after=2, color=NAVY)
P(doc, "BÁO CÁO HÀNG TUẦN", bold=True, align="center", size=22, after=2)
P(doc, "STORYLENS", bold=True, align="center", size=20, after=1, color=ACCENT)
P(doc, "(AI-Powered International Manga Reader)", italic=True, align="center", size=12, after=28)
for _ in range(2): doc.add_paragraph()
P(doc, "Môn học: CSC10011 — Công nghệ phần mềm cho hệ thống trí tuệ nhân tạo", align="center", size=12, after=1)
P(doc, "Lớp: TTNT2023      GVHD: GS.TS Nguyễn Văn Vũ", align="center", size=12, after=14)
P(doc, "Nhóm sinh viên thực hiện:", bold=True, align="center", size=12, after=4)
for line in [
    "1. Nguyễn Đình Hà Dương — 23122002",
    "2. Phạm Phú Hòa — 23122030",
    "3. Huỳnh Trung Kiệt — 23122039",
    "4. Đào Sỹ Duy Minh — 23122041",
    "5. Trần Chí Nguyên — 23122044",
    "6. Nguyễn Lâm Phú Quý — 23122048",
]:
    P(doc, line, align="center", size=12, after=1)
P(doc, "TP. Hồ Chí Minh, tháng 06 năm 2026", italic=True, align="center", size=12, before=18)
page_break(doc)

P(doc, "Lưu ý: Báo cáo này tiếp nối báo cáo PA2 (kết thúc ở Tuần 6, 11–14/5/2026), bao gồm các Tuần 7, 8, 9 "
       "cho tới thời điểm nộp PA3 (02/06/2026).", italic=True, size=11, color=GREY)


def week(title, done_rows, undone, plan, risks):
    H1(doc, title)
    H2(doc, "Công việc đã hoàn thành")
    table(doc, ["Task", "Người thực hiện", "Trạng thái"], done_rows, widths=[4.4, 1.3, 1.0])
    H2(doc, "Công việc chưa hoàn thành")
    for u in undone:
        bullet(doc, u)
    H2(doc, "Kế hoạch tuần kế tiếp")
    for p in plan:
        bullet(doc, p)
    H2(doc, "Vấn đề / Rủi ro phát sinh")
    for r in risks:
        bullet(doc, r)
    page_break(doc)


# ===== TUẦN 7 =====
week(
    "Tuần 7 (15/5 – 21/5/2026)",
    [
        ["Hiện thực nhóm tính năng Wibu: bookmark, đánh giá sao, reading-list, mục tiêu đọc ngày/tuần, hệ thống XP/level", "23122044, 23122048", "✓ Hoàn thành"],
        ["Thành tựu (achievements) tự mở khoá + toast + thông báo; migrate gamification từ localStorage sang DB", "23122041", "✓ Hoàn thành"],
        ["Reader nâng cao: copy text gốc/dịch, phím tắt, fullscreen, chế độ cuộn dọc/webtoon, vuốt, preload ảnh", "23122044", "✓ Hoàn thành"],
        ["Layout responsive đầy đủ (mobile/tablet/desktop); PWA service worker + trang offline", "23122002", "✓ Hoàn thành"],
        ["Account self-service + thư viện công khai + huỷ tác vụ + event bus + Stripe; notifications + share link", "23122039, 23122030", "✓ Hoàn thành"],
        ["WebSocket tiến trình pipeline (thay polling REST); idempotency-key cho upload/scrape", "23122039", "✓ Hoàn thành"],
        ["Tích hợp MangaDex (browse/search/đọc); scraper chương qua URL; export chương ra ZIP", "23122048", "✓ Hoàn thành"],
        ["Observability: Sentry + OpenTelemetry + security headers/CSP; RLS + deep health + i18n + lỗi song ngữ", "23122039, 23122041", "✓ Hoàn thành"],
        ["Bộ test E2E Playwright + CI (typecheck/lint/build/e2e/pytest); captcha Turnstile + Google OAuth", "23122002", "✓ Hoàn thành"],
        ["Studio QC: hiệu đính per-bubble (approve/reject); diễn đàn cộng đồng (mention, đính kèm, voting)", "23122044, 23122030", "✓ Hoàn thành"],
    ],
    ["manga-ocr thật chưa tích hợp vào pipeline production (vẫn dùng Gemini Vision tạm) — lên lịch fine-tune trên Kaggle ở Tuần 8.",
     "Một số test E2E còn phụ thuộc dữ liệu mock; cần bổ sung test cho luồng thanh toán Stripe."],
    ["Fine-tune manga-ocr + YOLOv8 thật trên Manga109-s (Kaggle GPU) và tích hợp vào AI Module.",
     "Bổ sung quản lý nguồn AI Module động (Admin) và Kaggle launcher cho ai_module.",
     "Tinh chỉnh render chữ tiếng Việt vào bbox."],
    ["Khối lượng tính năng v2/v3 lớn dồn trong tuần — đã chia module song song (frontend/backend/ai/admin).",
     "Cookie cross-domain SameSite=None cần HTTPS hai phía (Vercel/Render) — đã cấu hình & kiểm thử lại."],
)

# ===== TUẦN 8 =====
week(
    "Tuần 8 (22/5 – 28/5/2026)",
    [
        ["Xây dựng pipeline fine-tune OCR end-to-end trên Manga109-s (01_parse, 02_yolo, 03_train_ocr)", "23122039, 23122002", "✓ Hoàn thành"],
        ["Fine-tune manga-ocr (kha-white/manga-ocr-base) trên 123.208 mẫu — đạt CER 6.1%, Char-Acc 93.9% (test)", "23122039", "✓ Hoàn thành"],
        ["Thêm MangaYoloDetector + cấu hình phát hiện cho pipeline manga; convert Manga109-s → YOLO", "23122048", "✓ Hoàn thành"],
        ["Kaggle launcher cho ai_module: liên kết model, cài dependency, tunnel Cloudflare, tail log worker", "23122048", "✓ Hoàn thành"],
        ["Module render HTML + xử lý panel cho dịch manga; tích hợp trọng số mới vào AI Module", "23122039", "✓ Hoàn thành"],
        ["Quản lý nguồn AI Module trong Admin (đặt/đổi endpoint động) + UI hỗ trợ", "23122041", "✓ Hoàn thành"],
        ["Script chạy migration Supabase (run_migrations.py); làm gọn menu người dùng TopBar (theme/ngôn ngữ)", "23122041, 23122002", "✓ Hoàn thành"],
        ["Diễn đàn: đính kèm ảnh/video, @mention autocomplete; sửa hiển thị gallery", "23122030", "✓ Hoàn thành"],
    ],
    ["mAP của YOLOv8 chưa chốt số cuối — pipeline đánh giá đã sẵn, sẽ báo cáo đầy đủ ở PA4.",
     "Render chữ tiếng Việt dài trong bong bóng nhỏ còn tràn ở vài trường hợp — xử lý ở Tuần 9."],
    ["Tinh chỉnh render font-fitting cho tiếng Việt (binary-search cỡ chữ).",
     "Ổn định Gemini (throttle/cooldown key) và xử lý timeout request nội bộ.",
     "Hoàn thiện tài liệu PA3 (SAD v2, UI prototype) và chuẩn bị video demo."],
    ["Train trên Kaggle bị giới hạn thời gian/phiên GPU — lưu checkpoint theo epoch, chia tập theo title chống leak.",
     "Phụ thuộc HuggingFace Space để phục vụ model — cần keep-alive + nguồn động phòng khi Space ngủ."],
)

# ===== TUẦN 9 =====
week(
    "Tuần 9 (29/5 – 02/6/2026)",
    [
        ["Render tiếng Việt: binary-search cỡ chữ tối ưu trong bbox YOLO, chỉnh offset/min-font", "23122039", "✓ Hoàn thành"],
        ["Cập nhật GEMINI_MODEL lên 2.5; throttle client-side + xử lý rate-limit & cooldown key", "23122030", "✓ Hoàn thành"],
        ["Cấu hình timeout có thể tuỳ biến cho request nội bộ (aiohttp); cải thiện HTTP/1.1 & tái dùng client Supabase", "23122039", "✓ Hoàn thành"],
        ["Sửa loạt lỗi: signed URL hết hạn, upload khi user chưa refresh, retry tải ảnh reader, audit offset", "23122002, 23122030", "✓ Hoàn thành"],
        ["Trang chi tiết manga + chọn chương + lọc ngôn ngữ; refactor MangaCard (mở tab mới)", "23122044", "✓ Hoàn thành"],
        ["TranslationFeedback ẩn sau khi vote + nút bỏ qua; cập nhật hero song ngữ (VI/EN)", "23122044, 23122030", "✓ Hoàn thành"],
        ["Tinh chỉnh ngưỡng detector (box threshold) + xử lý GPU; ổn định log subprocess (dịch)", "23122048", "✓ Hoàn thành"],
        ["Đánh giá YOLOv8 trên test (956 ảnh / 14.130 box): mAP@0.5=0.953, mAP@0.5:0.95=0.844, P=0.973, R=0.938", "23122039", "✓ Hoàn thành"],
        ["Hoàn thiện tài liệu PA3: SAD v2 (Mục 1–7) kèm kết quả ML thật, sơ đồ deployment & use-case, UI prototype, README", "23122041, 23122048", "✓ Hoàn thành"],
    ],
    ["Video demo 2–3 phút và bộ ảnh chụp UI đang được hoàn tất tại thời điểm nộp.",
     "Đánh giá đầy đủ YOLOv8 (mAP) và đánh giá dịch (BLEU/feedback quy mô) để dành cho PA4."],
    ["PA4: đánh giá chất lượng dịch (BLEU/chrF + human eval) và phân tích lỗi sâu cho YOLO/OCR (PR curve, theo thể loại).",
     "Tối ưu cold-start (keep-alive, cân nhắc nâng cấp gói), bổ sung test cho thanh toán.",
     "Thu thập dữ liệu hiệu đính (Studio QC + feedback) cho vòng tái huấn luyện kế tiếp."],
    ["Cold-start Render/HF Spaces ảnh hưởng trải nghiệm lần đầu — đã có keep-alive ping; demo cần đánh thức trước.",
     "Quota Gemini free giới hạn lúc cao điểm — đã có key-rotation + throttle + cache để giảm rủi ro."],
)

doc.save(OUT)
print("SAVED", os.path.abspath(OUT))
print("paragraphs:", len(doc.paragraphs), "tables:", len(doc.tables))
