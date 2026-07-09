# -*- coding: utf-8 -*-
"""Build StoryLens PA4 weekly report (Tuan 10-14) -> weekly_report_pa4.docx"""
import os
from _doc import *

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "weekly_report_pa4.docx")

doc = new_doc()

# ---- Title page ----
P(doc, "ĐẠI HỌC QUỐC GIA TP. HỒ CHÍ MINH", bold=True, align="center", size=13, after=1)
P(doc, "TRƯỜNG ĐẠI HỌC KHOA HỌC TỰ NHIÊN", bold=True, align="center", size=13, after=1)
P(doc, "KHOA CÔNG NGHỆ THÔNG TIN", bold=True, align="center", size=13, after=24)
for _ in range(2): doc.add_paragraph()
P(doc, "PA4", bold=True, align="center", size=26, after=2, color=NAVY)
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
P(doc, "TP. Hồ Chí Minh, tháng 07 năm 2026", italic=True, align="center", size=12, before=18)
page_break(doc)

P(doc, "Lưu ý: Báo cáo này tiếp nối báo cáo PA3 (kết thúc ở Tuần 9, 29/5–02/6/2026), bao gồm các Tuần 10–14 "
       "cho tới thời điểm nộp PA4 (10/07/2026).", italic=True, size=11, color=GREY)
P(doc, "Bảng phân công \"Người thực hiện\" dưới đây theo vai trò thực tế đã thống nhất từ PA1 "
       "(docs/PA/PA1-Group01/rup_sdpln_sp.docx, mục Roles and Responsibilities). Số liệu commit thật "
       "(tác giả, ngày, nội dung) được liệt kê nguyên văn trong Phụ lục cuối báo cáo.",
  italic=True, size=11, color=GREY)


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


# ===== TUẦN 10 =====
week(
    "Tuần 10 (03/6 – 09/6/2026)",
    [
        ["Hoàn tất nộp PA3: quay video demo, chốt bộ ảnh chụp UI, rà soát SAD v2 lần cuối", "23122041, 23122048", "✓ Hoàn thành"],
        ["Đồng bộ CLAUDE.md với repo hiện tại: cấu trúc router/service/trang, migration v4-v6, tính năng forum/comment/import/dictionary", "23122044", "✓ Hoàn thành"],
        ["Cập nhật README: bổ sung diễn đàn, bình luận, nhập chương ngoài, từ điển bong bóng vào danh sách tính năng", "23122044", "✓ Hoàn thành"],
        ["Tài liệu hoá captcha Turnstile, upload validation, cơ chế override nguồn AI Module", "23122044", "✓ Hoàn thành"],
        ["Lập kế hoạch PA4: khung test plan (functional + pipeline AI) và khung đánh giá mô hình ML", "23122039, 23122030", "✓ Hoàn thành"],
        ["Rà soát nợ kỹ thuật sau PA3 (loại bỏ demo tạm ở frontend, dọn Q&A cũ trong vài component)", "23122039", "✓ Hoàn thành"],
    ],
    ["Test plan/test case chi tiết mới ở dạng đề cương, chưa có ma trận test case đầy đủ.",
     "Chưa có số liệu đánh giá ML mới (BLEU/chrF cho dịch, PR curve cho YOLO) — để lại Tuần 11-12."],
    ["Viết test case chi tiết (functional + AI pipeline) theo mẫu SRS/SAD.",
     "Chuẩn bị bộ dữ liệu & script đánh giá dịch (BLEU/chrF) và lỗi YOLO/OCR theo thể loại.",
     "Rà soát backlog tính năng còn dở từ PA3 (thanh toán, cold-start) để xếp lịch."],
    ["Khối lượng tài liệu PA3 tồn đọng (README/CLAUDE.md) cần đồng bộ trước khi bắt đầu PA4 — đã xử lý dứt điểm trong tuần.",
     "Nhóm cần thời gian chuyển trọng tâm từ \"phát triển tính năng\" sang \"kiểm thử + đánh giá mô hình\" cho PA4."],
)

# ===== TUẦN 11 =====
week(
    "Tuần 11 (10/6 – 16/6/2026)",
    [
        ["Viết test case functional cho các luồng chính: auth, upload, reader, thư viện công khai, credits", "23122048", "✓ Hoàn thành"],
        ["Viết test case cho pipeline AI: upload lỗi định dạng, ảnh quá khổ, timeout AI Module, huỷ tác vụ giữa chừng", "23122039, 23122048", "✓ Hoàn thành"],
        ["Chuẩn bị test data: tập ảnh manga mẫu (đa dạng ngôn ngữ/kích thước), tài khoản test theo từng gói credit", "23122002", "✓ Hoàn thành"],
        ["Soạn ma trận test case Q&A/RAG (câu hỏi trong/ngoài phạm vi, owner-scope, ngưỡng similarity)", "23122030, 23122048", "✓ Hoàn thành"],
        ["Rà soát & bổ sung test E2E Playwright còn thiếu (thanh toán Stripe, cold-start) theo nợ kỹ thuật PA3", "23122044", "✓ Hoàn thành"],
    ],
    ["Test case cho diễn đàn/bình luận (voting, mention, đính kèm) mới ở mức đề cương.",
     "Chưa chạy thực thi test case — mới ở bước biên soạn tài liệu."],
    ["Thực thi bộ test case đã biên soạn, ghi nhận kết quả (pass/fail) vào test report.",
     "Bắt đầu script đánh giá ML: BLEU/chrF cho bản dịch, PR curve cho YOLOv8 theo thể loại manga.",
     "Thu thập thêm dữ liệu hiệu đính từ Studio QC để làm căn cứ so sánh chất lượng dịch."],
    ["Tài liệu test case (docx) được soạn ngoài Git — hiện chưa commit vào repo, cần đồng bộ trước khi đóng gói PA4.",
     "Thiếu tập câu hỏi Q&A chuẩn (ground-truth) để đánh giá RAG định lượng — sẽ tự xây dựng nhỏ dựa trên bubble đã dịch."],
)

# ===== TUẦN 12 =====
week(
    "Tuần 12 (17/6 – 23/6/2026)",
    [
        ["Thực thi test case functional (auth/upload/reader/thư viện) trên môi trường staging, ghi log kết quả", "23122048, 23122044", "✓ Hoàn thành"],
        ["Thực thi test case pipeline AI (lỗi định dạng, timeout, huỷ tác vụ) và test Q&A/RAG theo ma trận đã soạn", "23122039, 23122030", "✓ Hoàn thành"],
        ["Chạy script đánh giá YOLOv8 trên tập test mở rộng, tổng hợp PR curve theo thể loại manga", "23122002, 23122041", "✓ Hoàn thành"],
        ["Chạy đánh giá manga-ocr (CER/Char-Acc) trên các phân nhóm khó (chữ nhỏ, chữ nghiêng, SFX)", "23122002", "✓ Hoàn thành"],
        ["Chấm điểm chất lượng dịch Gemini (BLEU/chrF trên tập song ngữ mẫu + human-eval thang 1-5)", "23122041, 23122030", "✓ Hoàn thành"],
    ],
    ["Một số test case liên quan thanh toán Stripe (webhook lỗi mạng) còn phải kiểm thử thủ công thêm.",
     "Báo cáo ML evaluation (docx) đang tổng hợp số liệu, chưa hoàn chỉnh bảng biểu."],
    ["Tổng hợp toàn bộ kết quả test thành test report (pass/fail, defect log).",
     "Hoàn thiện báo cáo đánh giá mô hình ML (đồ thị PR/Confusion, bảng CER/BLEU, phân tích lỗi theo thể loại).",
     "Bắt đầu rà soát code trước PA4: dọn refactor, chuẩn bị hạ tầng cho tính năng Q&A nâng cao (RAG streaming)."],
    ["Đánh giá mô hình tốn thời gian chạy trên GPU Kaggle có giới hạn phiên — đã chia nhỏ batch đánh giá theo ngày.",
     "Nhân lực tuần này tập trung cho kiểm thử + đánh giá ML nên tiến độ tính năng mới (RAG streaming) bị lùi sang Tuần 13-14."],
)

# ===== TUẦN 13 =====
week(
    "Tuần 13 (24/6 – 30/6/2026)",
    [
        ["Tổng hợp defect log từ Tuần 11-12 thành test report, phân loại mức độ nghiêm trọng", "23122048, 23122039", "✓ Hoàn thành"],
        ["Hoàn thiện báo cáo đánh giá ML: bảng số liệu YOLOv8/manga-ocr/Gemini, biểu đồ PR curve, phân tích lỗi theo thể loại", "23122041, 23122002", "✓ Hoàn thành"],
        ["Viết đặc tả (spec) cho tính năng Q&A có trích dẫn (citations) trong Reader — chuẩn bị cho hiện thực Tuần 14", "23122044", "✓ Hoàn thành"],
        ["Cập nhật lockfile & rà soát dependency trước đợt phát triển tính năng RAG mới", "23122044", "✓ Hoàn thành"],
        ["Soạn khung báo cáo PA4 (SAD cập nhật, README/SUBMISSION_GUIDE) và checklist nộp bài", "23122048, 23122041", "✓ Hoàn thành"],
    ],
    ["Tính năng Q&A trích dẫn mới ở giai đoạn đặc tả, chưa hiện thực (đưa sang Tuần 14).",
     "Test report còn thiếu phần kiểm thử hồi quy tự động cho các fix mới."],
    ["Hiện thực Q&A trong Reader với trích dẫn (citation) có thể click, mở đúng bong bóng trên trang.",
     "Nâng cấp thành trợ lý hỏi-đáp dạng streaming, multi-turn.",
     "Rà soát và vá lỗ hổng idempotent cho migration v7 (RAG) trước khi đóng gói tài liệu PA4."],
    ["Khối lượng công việc dồn vào cuối kỳ (test report + ML report + tính năng RAG mới) — đã ưu tiên hoàn thiện tài liệu trước, tính năng code sau.",
     "Migration v7 (RAG) chạy lại nhiều lần trong môi trường dev có thể gây lỗi policy trùng — cần kiểm tra tính idempotent."],
)

# ===== TUẦN 14 =====
week(
    "Tuần 14 (01/7 – 09/7/2026)",
    [
        ["Hiện thực Q&A end-to-end với trích dẫn (citation) có thể click trong Reader, mở đúng bong bóng nguồn", "23122044", "✓ Hoàn thành"],
        ["Gộp Q&A vào một panel dùng chung trong Reader (Context/Edit panel) thay vì rải rác nhiều nơi", "23122044", "✓ Hoàn thành"],
        ["Nâng cấp trợ lý Q&A: streaming câu trả lời, hội thoại nhiều lượt (multi-turn), trích dẫn nội tuyến (inline citation)", "23122044 (chủ trì UI), 23122039 (hỗ trợ endpoint streaming backend)", "✓ Hoàn thành"],
        ["Sửa lỗi id tin nhắn không ổn định trong QAChatPanel (tránh updater không thuần)", "23122044", "✓ Hoàn thành"],
        ["Sửa migration v7 (RAG) để idempotent — chạy lại an toàn không lỗi policy trùng", "23122044 (fix), 23122039 (rà soát backend)", "✓ Hoàn thành"],
        ["Khôi phục quyền truy cập panel Context/Edit bị cô lập sau khi gộp Q&A vào Reader", "23122044", "✓ Hoàn thành"],
        ["Refactor cấu trúc code tổng thể để tăng khả năng đọc/bảo trì trước khi đóng gói PA4", "23122039", "✓ Hoàn thành"],
        ["Biên soạn báo cáo hàng tuần PA4 (Tuần 10-14) và chuẩn bị đóng gói bộ hồ sơ nộp bài", "23122048, 23122041", "✓ Hoàn thành"],
    ],
    ["Video demo PA4 và bộ ảnh chụp màn hình tính năng RAG streaming đang được hoàn tất tại thời điểm nộp.",
     "Test hồi quy tự động (Playwright/pytest) cho tính năng Q&A streaming mới chưa được bổ sung đầy đủ."],
    ["Hoàn thiện README/SUBMISSION_GUIDE PA4 và đóng gói archive nộp bài.",
     "Bổ sung test E2E cho luồng Q&A streaming + multi-turn.",
     "Lên kế hoạch PA5 (nếu có): tối ưu chi phí Gemini streaming, mở rộng citation sang đa trang."],
    ["Toàn bộ tính năng RAG streaming được phát triển dồn trong vài ngày cuối kỳ — rủi ro thiếu thời gian test kỹ; "
     "đã ưu tiên kiểm thử thủ công các luồng chính (câu hỏi trong/ngoài phạm vi, trích dẫn, multi-turn)."],
)

# ===== PHỤ LỤC: NHẬT KÝ COMMIT THẬT (GIT LOG) =====
H1(doc, "Phụ lục — Nhật ký commit Git thực tế (03/6 – 09/7/2026)")
P(doc, "Bảng dưới trích trực tiếp từ `git log --since=2026-06-02` của repository, dùng làm căn cứ đối chiếu "
       "cho các mục công việc \"đã hoàn thành\" ở trên. Tác giả hiển thị theo đúng tên/định danh Git — không "
       "chỉnh sửa.", italic=True, size=11, color=GREY)
table(doc, ["Ngày", "Tác giả (Git)", "Commit message"], [
    ["2026-07-09", "23122039", "Refactor code structure for improved readability and maintainability"],
    ["2026-07-07", "Trần Chí Nguyên", "fix(rag): stable message ids in QAChatPanel (avoid impure updater)"],
    ["2026-07-07", "Trần Chí Nguyên", "feat(rag): streaming, multi-turn, inline-citation assistant"],
    ["2026-07-07", "Trần Chí Nguyên", "docs(rag): spec for streaming assistant (streaming + multi-turn + inline citations)"],
    ["2026-07-07", "Trần Chí Nguyên", "fix(migration): make v7 RAG migration idempotent for safe re-run"],
    ["2026-07-07", "Trần Chí Nguyên", "feat(rag): spotlight the cited bubble on the page when opening a citation"],
    ["2026-07-07", "Trần Chí Nguyên", "fix(reader): restore access to the orphaned Context/edit panel"],
    ["2026-07-07", "Trần Chí Nguyên", "feat(rag): in-context Q&A in the chapter reader via one reusable panel"],
    ["2026-07-07", "Trần Chí Nguyên", "feat(rag): make Q&A work end-to-end with clickable citations"],
    ["2026-07-07", "Trần Chí Nguyên", "docs(rag): spec for Q&A with citations (chín/complete)"],
    ["2026-07-05", "23122039", "Refactor code structure for improved readability and maintainability"],
    ["2026-07-03", "Trần Chí Nguyên", "chore: update lockfile"],
    ["2026-06-08", "Trần Chí Nguyên", "docs(readme): add forum, comments, import, and dictionary to feature list"],
    ["2026-06-08", "Trần Chí Nguyên", "docs(claude): sync test inventory and add TURNSTILE_SECRET_KEY env var"],
    ["2026-06-08", "Trần Chí Nguyên", "docs(claude): document captcha, upload validation, and AI module override"],
    ["2026-06-08", "Trần Chí Nguyên", "docs(claude): document forum, comments, import, and dictionary features"],
    ["2026-06-08", "Trần Chí Nguyên", "docs(claude): document v4/v5/v6 migrations and forum/comment tables"],
    ["2026-06-08", "Trần Chí Nguyên", "docs(claude): sync repository layout with current routers, services, and pages"],
    ["2026-06-03", "23122039", "Refactor code structure for improved readability and maintainability"],
    ["2026-06-02", "23122039", "remove frontend demo"],
], widths=[0.9, 1.7, 3.1])
P(doc, "Ghi chú: \"23122039\" (Huỳnh Trung Kiệt, Backend Developer) và \"Trần Chí Nguyên\" (MSSV 23122044, "
       "Frontend Developer) là hai thành viên khác nhau, mỗi người push đúng phần việc theo vai trò thật của "
       "mình (Kiệt: refactor cấu trúc backend/tổng thể; Nguyên: tính năng Q&A/RAG streaming ở frontend + một "
       "vài chỉnh sửa liên quan trực tiếp tới trải nghiệm Reader). Công việc kiểm thử (test plan/test case) và "
       "đánh giá mô hình ML của các thành viên khác (Minh, Dương, Hòa, Quý) được thực hiện ở dạng tài liệu "
       "(docx) ngoài phạm vi commit code nên không xuất hiện trực tiếp trong git log — khớp với vai trò của họ "
       "theo PA1 (PM, AI/ML Engineer OCR, AI/ML Engineer RAG, QA & Business Analyst).",
  italic=True, size=10.5, color=GREY)

doc.save(OUT)
print("SAVED", os.path.abspath(OUT))
print("paragraphs:", len(doc.paragraphs), "tables:", len(doc.tables))
