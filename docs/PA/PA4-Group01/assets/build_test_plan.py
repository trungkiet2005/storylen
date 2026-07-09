# -*- coding: utf-8 -*-
"""Build StoryLens PA4 Test Plan -> ../test_plan.docx"""
import os
from _doc import *
from test_data import USE_CASES, totals, BACKEND_RESULT, FRONTEND_RESULT, TSC_RESULT, LINT_RESULT

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "test_plan.docx")

doc = new_doc()
T = totals()

# ============================== TITLE PAGE ==============================
P(doc, "TRƯỜNG ĐẠI HỌC KHOA HỌC TỰ NHIÊN – ĐHQG TP.HCM", bold=True, align="center", size=13, after=2)
P(doc, "KHOA CÔNG NGHỆ THÔNG TIN", bold=True, align="center", size=13, after=2)
P(doc, "CSC10011 – Công nghệ phần mềm cho hệ thống Trí tuệ Nhân tạo", italic=True, align="center", size=12, after=30)
for _ in range(2): doc.add_paragraph()
P(doc, "KẾ HOẠCH KIỂM THỬ", bold=True, align="center", size=24, after=4, color=NAVY)
P(doc, "(Test Plan)", italic=True, align="center", size=14, after=10, color=GREY)
P(doc, "STORYLENS", bold=True, align="center", size=30, after=2, color=ACCENT)
P(doc, "Nền tảng AI đọc & dịch manga đa ngôn ngữ có ngữ cảnh", italic=True, align="center", size=12.5, after=40)
for _ in range(2): doc.add_paragraph()
P(doc, "PA4 — Kiểm thử phần mềm", bold=True, align="center", size=13, after=2)
P(doc, "Nhóm 1 – StoryLens", bold=True, align="center", size=13, after=2)
P(doc, "GVHD: GS.TS Nguyễn Văn Vũ", align="center", size=12, after=2)
P(doc, "TP. Hồ Chí Minh, tháng 07 năm 2026", italic=True, align="center", size=12, after=2)
page_break(doc)

H1(doc, "Lịch sử chỉnh sửa")
table(doc, ["Ngày", "Phiên bản", "Mô tả", "Tác giả"], [
    ["09/07/2026", "1.0", "Bản đầu tiên — PA4: kế hoạch kiểm thử, thực thi thật pytest/vitest, "
                          "10 use-case, 60 test case.", "Nhóm 1"],
], widths=[1.1, 0.9, 4.0, 1.3])
page_break(doc)

# ============================== 1. INTRO ==============================
H1(doc, "1. Giới thiệu / Mục tiêu")
P(doc, "Tài liệu này mô tả kế hoạch kiểm thử cho hệ thống StoryLens ở giai đoạn PA4. Mục tiêu là "
       "xác minh 10 use-case/tính năng quan trọng nhất đang được hiện thực thật trong mã nguồn "
       "(frontend Next.js, backend FastAPI, ai_module) hoạt động đúng theo đặc tả, phát hiện lỗi "
       "hồi quy sớm, và cung cấp bằng chứng thực thi thật (pytest/vitest) thay vì chỉ mô tả lý "
       "thuyết. Toàn bộ kết quả trong tài liệu này — số lượng test pass/fail, thông điệp lỗi — "
       "được lấy từ lần chạy thật trên máy phát triển ngày 09/07/2026, không có kết quả bịa đặt.",
  align="justify")

# ============================== 2. SCOPE ==============================
H1(doc, "2. Phạm vi")
H2(doc, "2.1. Trong phạm vi")
bullet(doc, "10 use-case cốt lõi liệt kê ở Mục 3, gồm luồng chính (basic flow) và các luồng lỗi "
            "quan trọng (idempotency, IDOR/owner-scoping, giới hạn dữ liệu, TTL).")
bullet(doc, "Kiểm thử đơn vị (unit) cho các service thuần Python/TypeScript không phụ thuộc mạng: "
            "app/services/rag.py, idempotency.py, forum_service.py; frontend lib/localStore, "
            "WibuContext, StarRating.")
bullet(doc, "Kiểm thử tĩnh: TypeScript typecheck (tsc --noEmit) và ESLint.")
bullet(doc, "Đặc tả thủ công (manual) cho các luồng cần backend/Supabase/Gemini sống — được đánh "
            "dấu rõ 'Not Executed' kèm lý do, không giả lập kết quả.")

H2(doc, "2.2. Ngoài phạm vi")
bullet(doc, "Kiểm thử tải/hiệu năng (load testing), kiểm thử bảo mật chuyên sâu (pentest).")
bullet(doc, "Đánh giá lại độ chính xác mô hình ML (YOLOv8/manga-ocr/LaMa) — không có GPU trong "
            "môi trường chấm bài này; xem SAD Mục 7 (PA3) cho quy trình huấn luyện/đánh giá.")
bullet(doc, "Playwright E2E đầy đủ (auth.spec.ts, forum.spec.ts, mobile.spec.ts, edge-cases.spec.ts, "
            "protected-pages.spec.ts, home.spec.ts) — các file này tồn tại thật trong "
            "frontend/e2e/ nhưng đòi hỏi dựng dev server + backend kết nối Supabase/Gemini thật; "
            "không chạy trong phiên kiểm thử này (xem Mục 5, Mục 9).")
bullet(doc, "Kiểm thử thanh toán Stripe thật (yêu cầu STRIPE_SECRET_KEY + webhook thật).")
page_break(doc)

# ============================== 3. USE CASES ==============================
H1(doc, "3. Danh sách use-case / tính năng được kiểm thử")
P(doc, "10 use-case dưới đây được chọn vì (a) đại diện các luồng nghiệp vụ cốt lõi của StoryLens, "
       "(b) đã được hiện thực đầy đủ trong mã nguồn hiện tại (không phải kế hoạch), và (c) có thể "
       "kiểm thử được — có endpoint/hàm cụ thể để gọi hoặc mock.", align="justify")
table(doc, ["ID", "Tên use-case", "Mô tả ngắn", "Mức ưu tiên"], [
    [u["id"], u["name"], u["desc"], u["priority"]] for u in USE_CASES
], widths=[0.55, 1.7, 3.9, 0.85])
page_break(doc)

# ============================== 4. METHOD ==============================
H1(doc, "4. Phương pháp kiểm thử")
table(doc, ["Cấp độ", "Công cụ / Stack", "Áp dụng cho"], [
    ["Unit test (backend)", "pytest 7.4 (Python 3.12), thư viện respx để mock HTTP Gemini/Supabase",
     "app/services/rag.py, idempotency.py, forum_service.py/scraper.py, ràng buộc SQL migration v7"],
    ["Unit / component test (frontend)", "Vitest 4 + React Testing Library",
     "src/lib (localStore, date-utils, mangadex), WibuContext, StarRating, Toast, CreditBadge, "
     "ReadingListPicker, Animations"],
    ["Kiểm thử tĩnh (static)", "tsc --noEmit, ESLint (next lint)", "Toàn bộ frontend/src, frontend/__tests__"],
    ["E2E (không chạy trong phiên này)", "Playwright (frontend/e2e/*.spec.ts)",
     "Luồng UI đầu-cuối cần dev server thật: auth, forum, mobile, protected-pages, edge-cases, home"],
    ["Kiểm thử thủ công (manual)", "Trình duyệt + Postman/curl thủ công đối chiếu mã nguồn router",
     "Mọi luồng cần Supabase/Gemini/AI Module sống mà môi trường này không có secrets"],
], widths=[1.55, 2.6, 2.85])

# ============================== 5. ENVIRONMENT ==============================
H1(doc, "5. Môi trường kiểm thử")
table(doc, ["Thành phần", "Phiên bản / Ghi chú"], [
    ["Hệ điều hành", "Windows 11 Home Single Language 10.0.26200"],
    ["Python", "3.12.3 (hệ thống, không dùng venv riêng — pytest 7.4.4 đã cài sẵn)"],
    ["Node.js / npm", "Theo package.json frontend (Next.js 16.2.6, React 19); Vitest 4.1.6"],
    ["Backend", "FastAPI + Python — chạy ở chế độ import module cho unit test, KHÔNG khởi động "
                "uvicorn thật (không kết nối Supabase/Gemini thật trong lần chạy pytest này); "
                "các test set biến môi trường SUPABASE_URL/GEMINI_API_KEY giả (test.supabase.co) "
                "để app/config.py không crash khi import."],
    ["Frontend", "vitest run --run trong jsdom, không cần server thật cho unit/component test."],
    ["Bí mật sản xuất (secrets)", "backend/.env tồn tại cục bộ trên máy phát triển nhưng chứa "
                                   "khoá thật trỏ tới dự án Supabase/Gemini đang vận hành — KHÔNG "
                                   "được dùng để chạy kiểm thử tự động/CI vì rủi ro ghi dữ liệu vào "
                                   "hệ thống thật và không phù hợp cho một lần chấm bài. Do đó mọi "
                                   "test case đòi hỏi backend sống được đánh dấu 'Not Executed' "
                                   "thay vì giả lập PASS."],
], widths=[1.9, 4.9])

# ============================== 6. ENTRY/EXIT ==============================
H1(doc, "6. Tiêu chí bắt đầu / kết thúc")
H2(doc, "6.1. Tiêu chí bắt đầu (Entry criteria)")
bullet(doc, "Mã nguồn build được: npx tsc --noEmit không lỗi, backend import được không lỗi cú pháp.")
bullet(doc, "Danh sách 10 use-case và bộ test case (Mục 3, tài liệu test_cases.docx) đã được chốt.")
bullet(doc, "Môi trường chạy pytest/vitest sẵn sàng (dependencies cài đặt đủ để collect test).")
H2(doc, "6.2. Tiêu chí kết thúc (Exit criteria)")
bullet(doc, "100% test case tự động hoá (pytest + vitest) được thực thi và ghi nhận kết quả thật.")
bullet(doc, "Không còn lỗi mức Critical/High chưa xử lý trong các test đã thực thi được.")
bullet(doc, "Mọi test case không thực thi được (Not Executed) có lý do rõ ràng, không để trống.")
bullet(doc, "Test Report (test_report.docx) phản ánh đúng số liệu Pass/Fail/Not Executed khớp với "
            "test_cases.docx.")

# ============================== 7. DELIVERABLES ==============================
H1(doc, "7. Sản phẩm bàn giao kiểm thử")
numbered(doc, "Kế hoạch kiểm thử — test_plan.docx (tài liệu này).")
numbered(doc, "Bộ test case chi tiết — test_cases.docx (10 use-case × ≥5 test case = "
              f"{totals()['total']} test case).")
numbered(doc, "Báo cáo kết quả kiểm thử — test_report.docx (bảng tổng hợp theo use-case + báo cáo "
              "defect nếu có).")
numbered(doc, "Log thực thi thật: kết quả pytest (" + BACKEND_RESULT + ") và vitest (" + FRONTEND_RESULT + ").")
page_break(doc)

# ============================== 8. ROLES ==============================
H1(doc, "8. Vai trò & trách nhiệm")
P(doc, "Danh sách thành viên, MSSV và vai trò dưới đây lấy nguyên văn từ mục 'Roles and "
       "Responsibilities' trong docs/PA/PA1-Group01/rup_sdpln_sp.docx (không đổi ở PA2). Vai trò "
       "kiểm thử ở cột cuối được ánh xạ trực tiếp từ vai trò thật của từng người.",
  align="justify", size=11, color=GREY)
table(doc, ["Họ và tên", "MSSV", "Vai trò dự án (PA1)", "Vai trò kiểm thử PA4"], [
    ["Nguyễn Lâm Phú Quý", "23122048", "QA & Business Analyst",
     "Trưởng nhóm kiểm thử — chủ trì soạn test plan/test case, điều phối thực thi, tổng hợp "
     "test report, UAT (toàn bộ UC)"],
    ["Huỳnh Trung Kiệt", "23122039", "Backend Developer",
     "Thực thi kiểm thử backend/API tự động (pytest) và các luồng cần FastAPI/Supabase sống "
     "(UC01, UC02, UC04, UC06, UC07, UC10) — người thực thi pytest/vitest trong tài liệu này"],
    ["Trần Chí Nguyên", "23122044", "Frontend Developer",
     "Thực thi kiểm thử frontend/component (vitest) và E2E Playwright (UC03, UC08, UC09)"],
    ["Đào Sỹ Duy Minh", "23122041", "Project Manager & AI/ML Engineer",
     "Điều phối tiến độ kiểm thử toàn nhóm; kiểm thử pipeline OCR/dịch và migration contract "
     "(UC02, UC05)"],
    ["Nguyễn Đình Hà Dương", "23122002", "AI/ML Engineer (OCR)",
     "Hỗ trợ đánh giá test case liên quan OCR/dataset, error analysis cho UC02/UC04"],
    ["Phạm Phú Hòa", "23122030", "AI/ML Engineer (RAG)",
     "Kiểm thử RAG/Q&A pipeline và vector database (UC05)"],
], widths=[1.75, 0.85, 2.05, 2.55])

# ============================== 9. RISKS ==============================
H1(doc, "9. Rủi ro")
table(doc, ["Rủi ro", "Ảnh hưởng", "Giảm thiểu"], [
    ["Không có GPU để tái đánh giá mô hình ML (YOLOv8/manga-ocr/LaMa) trong môi trường này.",
     "Không xác nhận lại được độ chính xác mô hình cho PA4.",
     "Dựa trên kết quả đánh giá mô hình đã có ở SAD PA3 Mục 7; ngoài phạm vi PA4 (Mục 2.2)."],
    ["Không có Supabase/Gemini/AI Module thật kết nối được an toàn trong phiên kiểm thử tự động.",
     f"{totals()['not_executed']}/{totals()['total']} test case không thực thi được (đánh dấu "
     "Not Executed thay vì giả lập).",
     "Ưu tiên phủ logic nghiệp vụ cốt lõi (RAG owner-scoping, idempotency, hot-score, mention "
     "parsing, localStorage) bằng unit test không cần mạng — đã đạt 100% pass trên các phần này."],
    ["Playwright E2E không chạy được do thiếu thời gian dựng dev-server + backend + Supabase test "
     "project riêng.",
     "Không có bằng chứng UI đầu-cuối tự động cho PA4.",
     "File E2E thật đã tồn tại (frontend/e2e/*.spec.ts) và có thể chạy khi có môi trường staging; "
     "khuyến nghị bổ sung ở PA5 hoặc CI (.github/workflows/ci.yml đã có job Playwright)."],
    ["ESLint báo 105 warning (không lỗi) — chủ yếu react-hooks/set-state-in-effect, no-explicit-any.",
     "Không chặn build/deploy nhưng là nợ kỹ thuật.",
     "Ghi nhận, không coi là defect (không lỗi chức năng); có thể dọn dần ở PA5."],
], widths=[2.3, 2.0, 2.5])

# ============================== 10. SCHEDULE ==============================
H1(doc, "10. Lịch trình")
table(doc, ["Mốc", "Ngày", "Nội dung"], [
    ["Chốt danh sách use-case & test case", "08/07/2026", "Đọc mã nguồn thật, xác nhận endpoint/hàm tồn tại"],
    ["Thực thi kiểm thử tự động", "09/07/2026", "pytest (backend), vitest/tsc/eslint (frontend) — kết quả thật trong tài liệu này"],
    ["Soạn test_plan / test_cases / test_report", "09/07/2026", "Ba tài liệu .docx, số liệu nhất quán"],
    ["Hạn nộp PA4", "10/07/2026", "Bàn giao gói tài liệu PA4"],
], widths=[2.2, 1.3, 3.3])

doc.save(OUT)
print("Saved:", OUT)
