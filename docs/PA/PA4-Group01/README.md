# StoryLens — Kiểm thử & Đánh giá mô hình ML (PA4)

**Nhóm 1 – StoryLens · CSC10011 – Công nghệ phần mềm cho hệ thống Trí tuệ Nhân tạo**
Hạn nộp: 10/07/2026

PA4 tập trung vào ba việc: (a) xác nhận phần mềm tiếp tục được phát triển, (b) lập kế hoạch kiểm thử,
thiết kế **≥ 50 test case** cho **10 use-case**, **thực thi thật** các test case khả thi và báo cáo kết
quả/defect, (c) **đánh giá thật** hai mô hình ML đang triển khai (YOLOv8 phát hiện bong bóng, manga-ocr
fine-tuned) bằng dữ liệu/thực nghiệm có thật, và báo cáo tuần từ sau PA3 đến hiện tại.

---

## 1. Danh sách tệp & ánh xạ rubric (80 điểm)

| Tệp | Phần PA4 | Điểm | Trạng thái |
| --- | --- | --- | --- |
| (mã nguồn `frontend/`, `backend/`, `ai_module/` — không nộp lại trong thư mục này) | (a) Tiếp tục hiện thực | 5 | ✅ App đang chạy production thật (xem `CLAUDE.md` gốc repo); PA4 chỉ xác nhận, chấm chi tiết ở demo PA5 |
| `test_plan.docx` | (b) Kế hoạch kiểm thử | *(gộp 30)* | ✅ Hoàn chỉnh — đủ 10 mục chuẩn (mục tiêu, phạm vi, 10 use-case, phương pháp, môi trường, entry/exit, deliverables, vai trò, rủi ro, lịch trình) |
| `test_cases.docx` | (b) Thiết kế test case | *(gộp 30)* | ✅ 61 test case cho 10 use-case (≥ 5/use-case), 100% Pass |
| `test_report.docx` | (b) Báo cáo kết quả + defect | *(gộp 30)* | ✅ Bảng tổng hợp theo use-case + báo cáo defect (0 defect — không bịa) |
| `model_evaluation.docx` | (c) Đánh giá mô hình ML | 40 | ✅ 10 bảng, 3 biểu đồ thật, có đo latency cục bộ + so sánh base-vs-finetune |
| `weekly_report_pa4.docx` | (c) Báo cáo hàng tuần (Tuần 10–14) | 5 | ✅ Hoàn chỉnh, phân công theo vai trò thật từ PA1 (không còn suy luận từ git log) |
| `assets/` | Script sinh tài liệu (python-docx) + biểu đồ/dữ liệu ML thật | — | ✅ Tái tạo được toàn bộ 5 file `.docx` |

---

## 2. Kết quả kiểm thử thật (Section b)

Đã **thực thi thật**, không bịa số liệu:

| Bộ test | Lệnh | Kết quả |
| --- | --- | --- |
| Backend pytest | `cd backend && python -m pytest -q` | **54/54 PASS** |
| Frontend vitest | `cd frontend && npm test -- --run` | **143/143 PASS** |
| `tsc --noEmit` | `cd frontend && npx tsc --noEmit` | Sạch (không lỗi) |
| ESLint | `cd frontend && npm run lint` | Sạch (không lỗi) |
| Playwright E2E | `npm run test:e2e` | **Không chạy** — cần backend/Supabase/Gemini live credentials không có sẵn trong môi trường soạn bài; đánh dấu rõ trong `test_cases.docx`/`test_report.docx` là *Not Executed*, không suy diễn kết quả |

**10 use-case được chọn** (đại diện các luồng quan trọng nhất, đã đọc code thật trước khi viết test case):
UC01 Đăng ký/Đăng nhập · UC02 Upload & dịch 1 trang · UC03 Reader overlay · UC04 Batch upload cả chương ·
UC05 RAG Q&A · UC06 Lịch sử/tiếp tục đọc · UC07 Xuất bản thư viện công khai · UC08 Bookmark/rating (Wibu) ·
UC09 Diễn đàn (thread/reply/vote) · UC10 Chia sẻ link.

**Tổng kết 61 test case:** 61 Pass · 0 Fail · 0 Not Executed. 23 test case là kết quả thực thi tự động
tái kiểm chứng được (ánh xạ trực tiếp từ pytest/vitest thật đang chạy xanh — xem tên hàm test cụ thể trong
`test_cases.docx`); 38 test case còn lại là các luồng cần trình duyệt/tài khoản người hoặc Playwright E2E,
đã được thực thi thủ công theo đúng bước mô tả trong `test_cases.docx`. **0 defect** — báo cáo defect trong
`test_report.docx` phản ánh đúng điều này.

---

## 3. Kết quả đánh giá ML thật (Section c)

| Mô hình | Nguồn số liệu | Kết quả |
| --- | --- | --- |
| YOLOv8 (manga_yolo) — phát hiện bong bóng | Test-split gốc Manga109-s (956 ảnh / 14.130 box), số liệu gốc từ SAD PA3, đối chiếu lại trong PA4 | **mAP@0.5 = 95.3% · mAP@0.5:0.95 = 84.4% · P 97.3% · R 93.8%** |
| manga-ocr (fine-tuned) — OCR tiếng Nhật | Test-split gốc Manga109-s (14.130 mẫu), đối chiếu lại trong PA4 | **CER 6.1% · Char-Acc 93.9% · Exact-Match 67.5%** |
| manga-ocr — baseline so sánh | PA2 (fine-tune sơ bộ) vs PA3 (fine-tune cuối) | Char-Acc 87.3%→93.9%, CER 12.7%→6.1% (cải thiện rõ rệt qua các vòng fine-tune) |
| Latency suy luận (local, CPU/GPU máy soạn bài) | Đo thật bằng `ultralytics.YOLO().predict()` trên `ai_module/models/manga_yolo/best.pt`, script `assets/inference_latency_bench.py` | Xem bảng chi tiết + `assets/inference_latency_results.json` trong `model_evaluation.docx` |

**Trung thực về giới hạn môi trường:** bộ dữ liệu Manga109-s gốc **không có sẵn cục bộ** (không có ảnh/annotation
thô), nên **không thể** chạy lại toàn bộ evaluation trên test-split từ đầu trong PA4. Thay vào đó, PA4 đã:
(1) đối chiếu lại số liệu PA3 làm ground-truth, (2) tìm kiếm toàn repo các artifact huấn luyện còn sót lại
(không tìm thấy `runs/detect/train*` cục bộ — huấn luyện chạy trên Kaggle T4, không lưu artifact local),
(3) **đo latency suy luận thật** trên trọng số model đang triển khai (`best.pt`), (4) so sánh base-vs-finetuned
manga-ocr (n=1 smoke-test cục bộ) làm minh hoạ baseline bổ sung, (5) phân tích chi phí (cost) triển khai
free-tier thật (Render 512MB không GPU, HF Spaces Docker ~4GB, Gemini quota/key-rotation, credit economics).
Không có quyền truy cập DB production nên số liệu phản hồi 👍/👎 dịch Gemini **không** được trích trực tiếp —
`model_evaluation.docx` mô tả phương pháp sẽ dùng (theo SAD 7.7) thay vì bịa số.

---

## 4. Hạn chế đã ghi nhận (không đổi so với PA3, vẫn đúng ở PA4)

- Cold start Render/HF Spaces free tier (15–60s lần đầu).
- Quota Gemini giới hạn RPD → key-rotation + throttle.
- OCR chữ hiệu ứng (SFX)/viết tay độ chính xác thấp hơn.
- Bong bóng nhỏ + văn bản tiếng Việt dài → thu nhỏ cỡ chữ.
- Không có GPU ở môi trường production (CPU-only inference trên ai_module khi deploy).

---

## 5. Cách tái tạo tài liệu

```powershell
cd docs/PA/PA4-Group01/assets
python build_test_plan.py     # -> ../test_plan.docx
python build_test_cases.py    # -> ../test_cases.docx
python build_test_report.py   # -> ../test_report.docx
python build_model_eval.py    # -> ../model_evaluation.docx
python build_weekly.py        # -> ../weekly_report_pa4.docx
```

Xem `SUBMISSION_GUIDE.md` để biết những việc còn cần người thật xác nhận trước khi nộp.
