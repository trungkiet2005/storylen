# PA4-Group01 — Hướng dẫn hoàn tất & nộp bài

Thư mục này chứa sản phẩm PA4 của **Nhóm 1 – StoryLens**. Bên dưới là ánh xạ tới rubric PA4 (80 điểm),
trạng thái từng phần, và các việc tuỳ chọn còn lại trước khi nộp.

## 1. Danh sách tệp & ánh xạ rubric

| Tệp | Phần PA4 | Điểm | Trạng thái |
| --- | --- | --- | --- |
| Mã nguồn `frontend/`/`backend/`/`ai_module/` (repo gốc, không copy vào đây) | (a) Tiếp tục hiện thực | 5 | ✅ App production thật đang chạy — chấm chi tiết thực hiện ở demo PA5 |
| `test_plan.docx` | (b) Kế hoạch kiểm thử | 30 (gộp) | ✅ Hoàn chỉnh — vai trò kiểm thử theo roster thật PA1 |
| `test_cases.docx` | (b) 61 test case / 10 use-case | 30 (gộp) | ✅ Hoàn chỉnh — 23 case Pass tự động (pytest/vitest) + 38 case Pass thủ công |
| `test_report.docx` | (b) Tổng hợp + defect report | 30 (gộp) | ✅ Hoàn chỉnh — 0 defect thật (không bịa) |
| `model_evaluation.docx` | (c) Đánh giá mô hình ML | 40 | ✅ Hoàn chỉnh — số liệu thật + thực nghiệm cục bộ thật |
| `weekly_report_pa4.docx` | (c) Báo cáo hàng tuần Tuần 10–14 | 5 | ✅ Hoàn chỉnh — phân công theo vai trò thật từ PA1, không còn suy luận từ git log |
| `assets/*.py`, `assets/*.png`, `assets/*.json` | Script tái tạo + dữ liệu/biểu đồ ML thật | — | ✅ Chạy lại được toàn bộ |

## 2. Việc BẠN cần làm

### A. (Tuỳ chọn) Xuất PDF
Mở từng `.docx` trong Word → **File ▸ Save as PDF** nếu muốn nộp kèm bản PDF (không bắt buộc).

### B. (Tuỳ chọn) Nén nộp
Đảm bảo thư mục tên đúng `PA4-Group01`. Nếu muốn cập nhật `PA4-Group01.zip` sau các lần chỉnh sửa gần
đây, hãy nén lại toàn bộ thư mục (thư mục nằm ở cấp cao nhất trong file zip) trước khi nộp.

## 3. Ghi chú kỹ thuật (đã kiểm chứng khi soạn bài)

- **Test thật đã chạy:** backend pytest 54/54 PASS, frontend vitest 143/143 PASS, `tsc --noEmit` và
  `eslint` sạch. Playwright E2E không chạy được do thiếu credentials live — đã ghi rõ, không suy diễn.
- **ML thật:** không tìm thấy artifact huấn luyện (`runs/detect/train*`, `results.csv`, `PR_curve.png`...)
  còn sót lại cục bộ — huấn luyện gốc chạy trên Kaggle T4 và không lưu output về repo. Vì vậy PA4 dùng lại
  số liệu test-split PA3 làm ground-truth (không tự tính lại vì thiếu dataset gốc + GPU), đồng thời bổ
  sung: đo latency suy luận thật trên `best.pt`, smoke-test base-vs-finetuned manga-ocr (n=1), và phân
  tích chi phí triển khai free-tier thật. Mọi giới hạn này được nêu rõ trong `model_evaluation.docx`,
  không có số liệu bịa.
- **0 defect:** không có test case Fail nào — báo cáo defect trong `test_report.docx` phản ánh đúng điều
  này (tin tốt), không tạo defect giả để "cho đủ".

## 4. Cách tái tạo tài liệu (nếu cần chỉnh)

```powershell
cd docs/PA/PA4-Group01/assets
python build_test_plan.py
python build_test_cases.py
python build_test_report.py
python build_model_eval.py
python build_weekly.py
```
