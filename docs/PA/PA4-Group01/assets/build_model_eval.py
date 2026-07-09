# -*- coding: utf-8 -*-
"""Build StoryLens PA4 ML Model Evaluation report -> model_evaluation.docx"""
import os
from _doc import *

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "model_evaluation.docx")

CHART_OCR = os.path.join(HERE, "chart_ocr_pa2_vs_pa3.png")
CHART_YOLO = os.path.join(HERE, "chart_yolo_metrics.png")
CHART_LAT = os.path.join(HERE, "chart_latency.png")

doc = new_doc()

# ============================== TITLE PAGE ==============================
P(doc, "TRƯỜNG ĐẠI HỌC KHOA HỌC TỰ NHIÊN – ĐHQG TP.HCM", bold=True, align="center", size=13, after=2)
P(doc, "KHOA CÔNG NGHỆ THÔNG TIN", bold=True, align="center", size=13, after=2)
P(doc, "CSC10011 – Công nghệ phần mềm cho hệ thống Trí tuệ Nhân tạo", italic=True, align="center", size=12, after=30)
for _ in range(2): doc.add_paragraph()
P(doc, "ĐÁNH GIÁ MÔ HÌNH HỌC MÁY", bold=True, align="center", size=24, after=4, color=NAVY)
P(doc, "(ML Model Evaluation Report)", italic=True, align="center", size=14, after=10, color=GREY)
P(doc, "STORYLENS", bold=True, align="center", size=30, after=2, color=ACCENT)
P(doc, "Nền tảng AI đọc & dịch manga đa ngôn ngữ có ngữ cảnh", italic=True, align="center", size=12.5, after=40)
for _ in range(2): doc.add_paragraph()
P(doc, "PA4 — Mục (c) Evaluating ML models", bold=True, align="center", size=13, after=2)
P(doc, "Nhóm 1 – StoryLens", bold=True, align="center", size=13, after=2)
P(doc, "Người thực hiện: Huỳnh Trung Kiệt — 23122039", align="center", size=12, after=2)
P(doc, "TP. Hồ Chí Minh, tháng 07 năm 2026", italic=True, align="center", size=12, after=2)
page_break(doc)

# ============================== SCOPE / HONESTY NOTE ==============================
H1(doc, "Phạm vi & nguyên tắc trung thực báo cáo")
P(doc, "Tài liệu này là phần mở rộng (đào sâu) của Mục 7 trong SAD PA3 "
       "(rup_sad_v2.docx), nơi đã trình bày kết quả đánh giá ban đầu của hai mô hình "
       "tự huấn luyện (manga-ocr fine-tune và YOLOv8 bubble detector) và ghi rõ "
       "\"đánh giá sâu hơn ... sẽ trình bày ở PA4\". Tài liệu tuân thủ nguyên tắc: "
       "không bịa số liệu; mọi số liệu đều lấy từ (a) kết quả huấn luyện thật đã "
       "chạy trên Kaggle (xác nhận lại qua metadata.json còn sót trong repo), hoặc "
       "(b) thực nghiệm mới chạy thật ngay trên máy cục bộ trong quá trình viết báo "
       "cáo này (có script kèm theo, có thể chạy lại), hoặc (c) sự thật/ràng buộc hạ "
       "tầng lấy trực tiếp từ cấu hình triển khai (Dockerfile, CLAUDE.md, render.yaml). "
       "Ở mọi chỗ KHÔNG thể chạy thực nghiệm sống (do thiếu dataset, thiếu GPU, "
       "không có quyền truy cập DB production), tài liệu nêu rõ lý do thay vì suy diễn.",
  align="justify")
page_break(doc)

# ============================== 1. DATASETS ==============================
H1(doc, "1. Datasets (Dữ liệu đánh giá)")

H2(doc, "1.1. Bộ dữ liệu gốc — Manga109-s")
P(doc, "Cả hai mô hình tự huấn luyện của StoryLens (YOLOv8 bubble detector và "
       "manga-ocr fine-tune) đều được huấn luyện và đánh giá trên Manga109-s "
       "(Aizawa Lab, Đại học Tokyo) — bộ dữ liệu học thuật chuẩn cho bài toán đọc "
       "hiểu manga, gồm 109 đầu truyện với annotation frame/body/face/text.",
  align="justify")
table(doc, ["Thuộc tính", "Giá trị"], [
    ["Nguồn", "Manga109-s (Manga109sreleased20260521), Aizawa Lab — University of Tokyo"],
    ["Tổng mẫu OCR trích xuất", "123.208 cặp (crop ảnh bong bóng + nhãn văn bản tiếng Nhật)"],
    ["Chia tập", "Theo ĐẦU TRUYỆN (split-by-title, chống rò rỉ dữ liệu), seed = 42"],
    ["Tỉ lệ chia", "Train 97.602 (80%) / Val 11.476 (10%) / Test 14.130 (10%)"],
    ["Lọc nhiễu (OCR)", "min_box=8px, min_text_len=1, max_text_len=300 ký tự, pad 5% quanh bbox"],
    ["Lọc nhiễu (Detection)", "Cùng nguồn XML, convert bbox <text> → nhãn YOLO 1 lớp \"text\", loại box < 4px"],
    ["Ảnh test (Detection)", "956 ảnh trang manga, tương ứng 14.130 vùng chữ"],
], widths=[1.8, 4.7])

H2(doc, "1.2. Vì sao KHÔNG chạy lại đánh giá trên dataset gốc trong PA4")
P(doc, "Máy cục bộ dùng để viết báo cáo PA4 này KHÔNG có bản sao Manga109-s "
       "(dataset chỉ tồn tại trên Kaggle, nơi huấn luyện diễn ra — xem "
       "ai_module/training/manga109/02_convert_to_yolo.py và 03_train_ocr.py, cả hai "
       "đều trỏ BASE = /kaggle/input/datasets/... — đường dẫn chỉ có trên Kaggle). "
       "Việc tải lại 109 đầu truyện (dữ liệu học thuật có giấy phép nghiên cứu riêng, "
       "dung lượng nhiều GB) vượt phạm vi và thời gian của PA4. Do đó, nhóm KHÔNG "
       "tự suy diễn hay tạo số liệu test-split mới — thay vào đó:",
  align="justify")
bullet(doc, "tái sử dụng nguyên bộ số liệu test-split đã tính thật trên Kaggle ở PA3 "
            "(coi là ground truth, không chỉnh sửa) — số liệu này được XÁC MINH LẠI "
            "trong PA4 bằng cách đối chiếu với file metadata.json thật còn sót lại "
            "trong repo tại ai_module/models/manga_ocr/weights/metadata.json (xem Mục 5.1) — "
            "khớp chính xác đến 4 chữ số thập phân với số liệu trong SAD, xác nhận đây là "
            "output thật của lần train, không phải số gõ tay.", bold_lead="Đã tái sử dụng — ")
bullet(doc, "tìm kiếm toàn bộ repo để xác nhận KHÔNG còn artifact huấn luyện nào khác "
            "(results.csv, PR_curve.png, confusion_matrix.png, thư mục runs/...) — báo cáo "
            "trung thực những gì tìm thấy / không tìm thấy (Mục 4.3).", bold_lead="Đã kiểm tra artifact — ")
bullet(doc, "chạy các thực nghiệm THẬT có thể thực hiện được trên máy cục bộ hiện tại: "
            "đo độ trễ inference thật của trọng số YOLOv8 đã fine-tune, và so sánh định "
            "tính manga-ocr base vs fine-tuned trên một mẫu chữ Nhật thật (Mục 5.2–5.3).", bold_lead="Đã bổ sung — ")
bullet(doc, "phân tích chi phí/hạ tầng triển khai thật (Render free tier, HF Spaces Docker "
            "CPU-only, Gemini pricing/quota, kinh tế học credit) — dữ liệu lấy trực tiếp từ "
            "cấu hình triển khai, không suy diễn (Mục 3.2).", bold_lead="Đã bổ sung — ")
page_break(doc)

# ============================== 2. BASELINES ==============================
H1(doc, "2. Baselines & phương pháp so sánh")

H2(doc, "2.1. manga-ocr: PA2 sơ bộ vs PA3 hoàn chỉnh (ablation thật)")
P(doc, "StoryLens có 2 lần fine-tune manga-ocr thật, tạo baseline tự nhiên không cần "
       "mô hình đối chứng riêng:", align="justify")
table(doc, ["Phiên bản", "Mô tả", "Char-Acc", "CER"], [
    ["PA2 — sơ bộ", "Fine-tune sơ bộ, cấu hình huấn luyện ban đầu (ít epoch hơn/chưa tinh chỉnh siêu tham số)", "87.3%", "12.7%"],
    ["PA3 — hoàn chỉnh", "Fine-tune đầy đủ: 8 epochs, lr=3e-5, cosine LR, label-smoothing=0.1, fp16, early-stop theo CER", "93.9%", "6.1%"],
], widths=[1.6, 3.3, 0.8, 0.8])
P(doc, "So với PA2, phiên bản PA3 giảm CER từ 12,7% xuống 6,1% — giảm hơn 50% lỗi "
       "ký tự tuyệt đối, và giảm ~52% theo tỉ lệ tương đối. Đây là baseline so sánh "
       "hợp lệ vì cùng dataset (Manga109-s), cùng test split (14.130 mẫu), cùng "
       "base model gốc (kha-white/manga-ocr-base) — chỉ khác cấu hình huấn luyện.",
  align="justify")

H2(doc, "2.2. Base pretrained model (kha-white/manga-ocr-base) — thử tải sống")
P(doc, "PA4 CÓ thử tải trực tiếp mô hình pretrained gốc kha-white/manga-ocr-base "
       "(chưa fine-tune) từ HuggingFace Hub trên máy cục bộ để so sánh baseline "
       "\"live\". Lần tải đầu tiên mất khoảng 74 giây (bao gồm download trọng số qua "
       "mạng, log thật: 10:37:26 → 10:38:41), và những lần sau (đã cache local) chỉ "
       "mất 3–18 giây tuỳ cache OS. Việc tải THÀNH CÔNG (không như dự kiến ban đầu là "
       "có thể timeout offline) cho phép chạy một so sánh định tính thật — trình bày "
       "ở Mục 5.3 — trên MỘT mẫu chữ Nhật thật trích từ ảnh có sẵn trong repo (không "
       "phải trên toàn bộ test split 14.130 mẫu, vì dataset gốc không có mặt cục bộ).",
  align="justify")

H2(doc, "2.3. YOLOv8: fine-tuned vs stock — không chạy lại stock model")
P(doc, "Với detector, nhóm KHÔNG tải lại yolov8n.pt gốc (huấn luyện trên COCO, 80 lớp "
       "vật thể đời thường) để so sánh trực tiếp, vì COCO không có khái niệm \"bong "
       "bóng thoại\" — một so sánh mAP giữa 2 mô hình trên 2 tập nhãn khác nhau "
       "(1 lớp \"text\" vs 80 lớp COCO) sẽ không có ý nghĩa thống kê và dễ gây hiểu lầm. "
       "Baseline hợp lệ duy nhất là ablation trước/sau fine-tune trên CÙNG nhãn/test-set, "
       "nhưng PA3 chỉ lưu lại kết quả SAU fine-tune (không có checkpoint yolov8n gốc "
       "được đánh giá trên Manga109-s test-split để đối chiếu). Do đó Mục 2.3 chỉ dùng "
       "được ngưỡng chấp nhận tuyệt đối (mAP@0.5 ≥ 0.85) làm cơ sở so sánh, thay vì "
       "một ablation before/after như OCR — đây là một giới hạn được nêu rõ ở Mục 6.",
  align="justify")
page_break(doc)

# ============================== 3. METRICS ==============================
H1(doc, "3. Độ đo (Metrics)")

H2(doc, "3.1. Độ đo chất lượng (Accuracy)")
table(doc, ["Mô hình", "Độ đo", "Ý nghĩa"], [
    ["manga-ocr", "CER (Character Error Rate)", "Tỉ lệ lỗi ký tự (Levenshtein / độ dài tham chiếu) — càng thấp càng tốt."],
    ["manga-ocr", "Char-Accuracy", "1 − CER, độ chính xác ký tự trung bình."],
    ["manga-ocr", "Exact-Match", "Tỉ lệ dự đoán khớp 100% chuỗi tham chiếu — chỉ số tham khảo, nghiêm ngặt hơn CER."],
    ["YOLOv8", "mAP@0.5", "mean Average Precision tại IoU=0.5 — độ đo chính cho phát hiện đối tượng."],
    ["YOLOv8", "mAP@0.5:0.95", "Trung bình mAP trên nhiều ngưỡng IoU (0.5→0.95, bước 0.05) — nghiêm ngặt hơn."],
    ["YOLOv8", "Precision / Recall", "Tỉ lệ box đúng / tỉ lệ box thật được tìm thấy, trung bình theo lớp."],
], widths=[1.1, 1.7, 3.5])

H2(doc, "3.2. Độ đo chi phí (Cost) — sự thật hạ tầng, không suy diễn")
P(doc, "Ngoài chất lượng, PA4 đánh giá chi phí vận hành thực tế — lấy trực tiếp từ "
       "cấu hình triển khai trong repo (ai_module/Dockerfile, render.yaml, CLAUDE.md), "
       "không phải ước lượng lý thuyết:", align="justify")
table(doc, ["Hạng mục", "Sự thật hạ tầng (từ cấu hình thật)"], [
    ["Backend (Render)", "Free tier, 512 MB RAM, KHÔNG nạp mô hình ML (chỉ điều phối) — health check GET /health."],
    ["AI Module (HF Spaces)", "Docker SDK, Free CPU Basic (16 GB RAM, 2 vCPU), KHÔNG có GPU. "
     "ai_module/Dockerfile dòng 34-36 cài torch/torchvision bản CPU-only qua "
     "download.pytorch.org/whl/cpu (nhỏ hơn bản CUDA, không cần GPU driver)."],
    ["Kích thước ảnh Docker", "~4 GB (comment trong Dockerfile: detection ~295MB + LaMa ~217MB + OCR 48px ~196MB "
     "+ manga-ocr HF cache ~400MB + PyTorch CPU + hệ thống)."],
    ["Frontend (Vercel)", "Free tier — Next.js 16 build, không tính chi phí biến đổi theo request ML."],
    ["Gemini API", "Trả phí theo lượt gọi (pay-per-call); GEMINI_API_KEY hỗ trợ nhiều key phân tách bởi dấu phẩy "
     "để xoay vòng (key-rotation) khi một key hết quota — giảm rủi ro downtime do rate-limit."],
    ["Credit economics", "1 credit = 1 lượt dịch ảnh HOẶC 1 câu hỏi RAG Q&A. Gói FREE: 5 credit/ngày, reset "
     "00:00 giờ Việt Nam. Gói trả phí: credit theo tháng qua Stripe Checkout (nếu cấu hình)."],
    ["Cold-start", "HF Spaces free tier có thể sleep khi không hoạt động — request đầu tiên sau khi ngủ chậm "
     "hơn đáng kể (không đo được thời gian cụ thể từ máy cục bộ vì không có quyền truy cập Space runtime)."],
], widths=[1.5, 5.0])
page_break(doc)

# ============================== 4. ENVIRONMENT ==============================
H1(doc, "4. Môi trường (Environment Setup)")

H2(doc, "4.1. Môi trường huấn luyện gốc (Kaggle — theo SAD PA3)")
table(doc, ["Thuộc tính", "Giá trị"], [
    ["Nền tảng", "Kaggle Notebooks (GPU miễn phí)"],
    ["GPU (manga-ocr)", "Tesla T4 (fine-tune 8 epochs)"],
    ["GPU (YOLOv8)", "Tesla T4 — huấn luyện ~1,23 giờ cho 50 epochs, imgsz=640"],
    ["Model YOLO", "yolov8n (~3,0M tham số), 1 lớp \"text\", cos_lr=True, hsv/fliplr tắt (line-art đơn sắc)"],
    ["Model OCR", "kha-white/manga-ocr-base (VisionEncoderDecoderModel) fine-tune full"],
    ["Optimizer OCR", "AdamW, lr=3e-5, cosine schedule, warmup 5%, label_smoothing=0.1, weight_decay=0.01"],
    ["Precision", "fp16 (mixed precision) trên cả hai pipeline"],
    ["Chọn best checkpoint", "Theo CER nhỏ nhất trên tập val (greater_is_better=False), early-stop patience 3"],
], widths=[2.0, 4.5])

H2(doc, "4.2. Môi trường đánh giá cục bộ (PA4 — máy thực hiện báo cáo này)")
P(doc, "Các phiên bản package sau được truy vấn TRỰC TIẾP trên máy dùng để viết "
       "báo cáo này (không phải số liệu giả định):", align="justify")
table(doc, ["Thành phần", "Phiên bản (đo thật)"], [
    ["Python", "3.12.3"],
    ["ultralytics", "8.4.48"],
    ["manga-ocr", "0.1.14"],
    ["torch", "2.11.0"],
    ["transformers", "4.55.2"],
    ["matplotlib", "3.9.2"],
    ["Thiết bị inference cục bộ", "CPU only (không có GPU khả dụng trên máy đánh giá này)"],
], widths=[2.3, 4.2])
P(doc, "Vì máy đánh giá không có GPU, các con số độ trễ ở Mục 5.2 phản ánh inference "
       "CPU — gần với môi trường production thật (AI Module cũng chạy CPU-only trên "
       "HF Spaces free tier, xem Mục 3.2) hơn là mô phỏng GPU Kaggle.", align="justify", italic=True, size=11, color=GREY)
page_break(doc)

# ============================== 5. RESULTS ==============================
H1(doc, "5. Kết quả (Results)")

H2(doc, "5.1. Kết quả test-split gốc (Manga109-s) — xác minh lại từ artifact thật")
P(doc, "File metadata.json THẬT còn sót lại trong repo tại "
       "ai_module/models/manga_ocr/weights/metadata.json — do chính script "
       "03_train_ocr.py ghi ra khi chạy trên Kaggle lúc 2026-05-26T20:34:50 UTC — "
       "được dùng để XÁC MINH (không phải tạo mới) số liệu đã công bố ở SAD PA3:",
  align="justify")
table(doc, ["Độ đo", "metadata.json (thật)", "SAD PA3 Mục 7.5", "Khớp?"], [
    ["test_cer", "0.061090", "0.0611 (6.1%)", "✓ Khớp"],
    ["test_char_acc", "0.938910", "0.9389 (93.9%)", "✓ Khớp"],
    ["test_exact_match", "0.674805", "0.6748 (67.5%)", "✓ Khớp"],
    ["Số mẫu test", "14.130 (per_split.test)", "14.130", "✓ Khớp"],
], widths=[1.6, 1.8, 1.8, 1.0])
P(doc, "Với YOLOv8, KHÔNG tìm thấy metadata.json/results.csv tương ứng trong repo "
       "(xem Mục 4.3 báo cáo tìm kiếm artifact) — chỉ có best.pt được copy thủ công "
       "vào ai_module/models/manga_yolo/. Số liệu mAP dưới đây do đó được TÁI SỬ DỤNG "
       "nguyên văn từ SAD PA3 Mục 7.5 mà KHÔNG có artifact gốc để đối chiếu độc lập — "
       "đây là một giới hạn minh bạch được ghi nhận ở Mục 6.", align="justify")
table(doc, ["Độ đo (YOLOv8, test)", "Kết quả", "Ngưỡng chấp nhận", "Đạt?"], [
    ["mAP@0.5", "0.9525 (95.3%)", "≥ 0.85", "✓ Đạt"],
    ["mAP@0.5:0.95", "0.8440 (84.4%)", "— (tham chiếu)", "Tốt"],
    ["Precision (mean)", "0.9731 (97.3%)", "— (tham chiếu)", "Tốt"],
    ["Recall (mean)", "0.9379 (93.8%)", "— (tham chiếu)", "Tốt"],
], widths=[1.8, 1.4, 1.6, 1.0])
figure(doc, CHART_OCR, width=5.6, cap="Hình 5.1 — manga-ocr: PA2 sơ bộ vs PA3 hoàn chỉnh (Manga109-s test split).")
figure(doc, CHART_YOLO, width=5.6, cap="Hình 5.2 — YOLOv8 (manga_yolo): 4 độ đo trên test split (956 ảnh / 14.130 vùng chữ).")

H2(doc, "5.2. Thực nghiệm THẬT chạy cục bộ: độ trễ inference YOLOv8")
P(doc, "Script docs/PA/PA4-Group01/assets/inference_latency_bench.py nạp trọng số "
       "THẬT ai_module/models/manga_yolo/best.pt bằng ultralytics.YOLO() và chạy "
       ".predict() thật trên 3 ảnh phong cách manga duy nhất có sẵn trong repo "
       "(frontend/public/...). Đây là 3 ảnh minh hoạ marketing do AI tạo (KHÔNG phải "
       "trang Manga109-s hay manga scan thật) — vì vậy số liệu detection dưới đây CHỈ "
       "là smoke-test độ trễ, KHÔNG đại diện cho chất lượng box trên manga thật. Không "
       "có ảnh manga thật nào khác (fixture test, ảnh mẫu, v.v.) tồn tại trong repo "
       "backend/ hay frontend/ tại thời điểm viết báo cáo.", align="justify")
table(doc, ["Ảnh", "Độ trễ (s)", "Số bbox phát hiện", "Conf. trung bình"], [
    ["manga_hero_ja.png (có bong bóng chữ Nhật thật)", "0.141", "2", "0.576"],
    ["manga_hero_clean.png (bong bóng rỗng, không chữ)", "0.136", "0", "—"],
    ["manga_panel_samurai.png (SFX rời, không có khung bong bóng)", "0.133", "0", "—"],
], widths=[3.0, 1.2, 1.4, 1.2])
P(doc, "Thời gian nạp mô hình (model load, 1 lần khi container khởi động): 7,35 giây. "
       "Lượt inference \"warm-up\" đầu tiên: 0,44 giây; các lượt sau (steady-state, "
       "bảng trên) ổn định quanh 0,13–0,14 giây/ảnh trên CPU. Việc mô hình chỉ phát "
       "hiện bong bóng trên ảnh CÓ khung bong bóng thật (manga_hero_ja.png) và KHÔNG "
       "phát hiện gì trên ảnh không có khung bong bóng rõ ràng (dù có chữ SFX) khớp "
       "với thiết kế: manga_yolo chỉ học 1 lớp \"text\" từ nhãn <text> trong Manga109-s, "
       "vốn bao khung các câu thoại có bong bóng, không phải hiệu ứng âm thanh (SFX) rời.",
  align="justify")
figure(doc, CHART_LAT, width=5.6, cap="Hình 5.3 — Độ trễ inference thật (CPU, máy cục bộ) — smoke test, không đại diện chất lượng box trên manga thật.")

H2(doc, "5.3. Thực nghiệm THẬT chạy cục bộ: manga-ocr base vs fine-tuned")
P(doc, "Tải thành công CẢ HAI mô hình OCR trên máy cục bộ: (a) kha-white/manga-ocr-base "
       "(pretrained gốc, tải từ HuggingFace Hub) và (b) trọng số fine-tuned thật tại "
       "ai_module/models/manga_ocr/weights/ (áp dụng đúng cơ chế tương thích "
       "processor_config.json → preprocessor_config.json đã có sẵn trong "
       "ai_module/manga_translator/ocr/model_manga_ocr.py::_resolve_mocr_weights). "
       "Cả hai chạy inference thật trên MỘT crop bong bóng chữ Nhật thật, cắt từ vùng "
       "bong bóng của frontend/public/images/manga_hero_ja.png (văn bản gốc hiển thị "
       "trong ảnh: “俺は…絶対に…けない!!!”).", align="justify")
table(doc, ["Mô hình", "Load (s)", "Infer (s)", "Dự đoán (raw output)"], [
    ["Base pretrained (kha-white/manga-ocr-base)", "4.00", "0.964", "俺は絶対に．．．けない！！"],
    ["Fine-tuned (manga_ocr/weights, PA3)", "3.12", "0.646", "僕．．絶対に．．．けない！！！"],
], widths=[2.6, 0.9, 0.9, 2.2])
P(doc, "Đây là MỘT mẫu định tính duy nhất (n=1), không thay thế cho test-split "
       "14.130 mẫu ở Mục 5.1 — không dùng để tính CER/Char-Acc. Quan sát: cả hai mô "
       "hình đọc đúng phần giữa “絶対に…けない”; base model giữ đúng 2 ký tự đầu "
       "“俺は” nhưng thiếu 1 dấu “！” cuối so với văn bản gốc (3 dấu); bản fine-tune "
       "đọc đúng đủ 3 dấu “！！！” ở cuối nhưng đọc sai 2 ký tự đầu (“僕” thay vì “俺は”) "
       "— khả năng do bong bóng chữ dày/nghiêng trong ảnh minh hoạ phong cách khác "
       "với line-art Manga109-s mà mô hình được huấn luyện. Kết quả này nhất quán với "
       "giới hạn đã nêu trong SAD: mô hình được tối ưu cho phong cách Manga109-s, "
       "không đảm bảo tổng quát hoá tốt sang mọi phong cách vẽ.", align="justify")

H2(doc, "5.4. Tín hiệu chất lượng dịch Gemini — phương pháp luận (không có số liệu sống)")
P(doc, "SAD PA3 Mục 7.7 mô tả cơ chế giám sát chất lượng dịch: endpoint thật "
       "POST/GET /v1/pages/{page_id}/feedback (backend/app/routers/pages.py, dòng "
       "518-606) cho phép người dùng vote 👍/👎 kèm bình luận trên bản dịch mỗi trang, "
       "upsert vào bảng translation_feedback (degrade an toàn — trả 200 persisted=false "
       "nếu bảng chưa được migrate, không crash). Ngưỡng chấp nhận theo SAD: tỉ lệ 👍 "
       "≥ 80%. PA4 KHÔNG có quyền truy cập Supabase production (không có service-role "
       "key/kết nối DB từ môi trường viết báo cáo) nên KHÔNG thể truy vấn tỉ lệ 👍/👎 "
       "thật — báo cáo mô tả đúng cơ chế đã hiện thực thay vì suy diễn số liệu.",
  align="justify")
page_break(doc)

# ============================== 6. CONCLUSION ==============================
H1(doc, "6. Kết luận")

H2(doc, "6.1. Phù hợp với mục đích sử dụng?")
P(doc, "Có, với điều kiện. Cả hai mô hình tự huấn luyện đều vượt ngưỡng chấp nhận đề "
       "ra trong SAD (CER ≤ 10% & Char-Acc ≥ 90% cho OCR; mAP@0.5 ≥ 85% cho detection) "
       "trên test-split Manga109-s 14.130 mẫu — số liệu này được PA4 xác minh khớp "
       "chính xác với artifact metadata.json thật còn sót lại trong repo (Mục 5.1), "
       "tăng độ tin cậy rằng đây là kết quả huấn luyện thật, không phải số liệu ước "
       "lượng. Thực nghiệm định tính ở Mục 5.3 cho thấy cả bản gốc và bản fine-tune "
       "đều đọc đúng phần lớn nội dung trên một mẫu ngoài phân phối huấn luyện "
       "(minh hoạ AI-generated, không phải Manga109-s), gợi ý mô hình có khả năng "
       "tổng quát hoá ở mức chấp nhận được nhưng chưa hoàn hảo.", align="justify")

H2(doc, "6.2. Giới hạn thật (đã quan sát/đã biết, không suy diễn)")
bullet(doc, "manga_yolo chỉ học 1 lớp \"text\" bao quanh bong bóng thoại có khung — "
            "không phát hiện SFX rời không có khung bong bóng (quan sát thật ở Mục 5.2, "
            "ảnh manga_panel_samurai.png: 0 detections).", bold_lead="SFX ngoài phạm vi huấn luyện — ")
bullet(doc, "Bản dịch tiếng Việt thường dài hơn tiếng Nhật/Trung gốc — SAD không đo "
            "trực tiếp nhưng đây là rủi ro UX đã biết trong kiến trúc renderer (không "
            "kiểm chứng bằng số liệu trong phạm vi PA4 vì cần ảnh test thật kèm bbox).", bold_lead="Tràn chữ khi dịch sang tiếng Việt — ")
bullet(doc, "AI Module chạy CPU-only trên HF Spaces free tier (xác nhận từ Dockerfile "
            "dòng 34-36 và comment \"Free CPU Basic\") — không có GPU production, độ "
            "trễ theo Mục 5.2 (~0,13s/ảnh cho riêng bước detection, CPU) sẽ cộng dồn "
            "qua các bước OCR + inpaint + dịch Gemini trong pipeline đầy đủ.", bold_lead="Không có GPU production — ")
bullet(doc, "HF Spaces free tier có thể sleep khi không hoạt động → cold-start chậm "
            "cho request đầu tiên (không đo được từ môi trường viết báo cáo — không có "
            "quyền truy cập Space runtime).", bold_lead="Cold-start free tier — ")
bullet(doc, "Không có artifact huấn luyện gốc (results.csv/PR_curve/confusion_matrix) "
            "cho YOLOv8 trong repo để đối chiếu độc lập số liệu mAP — chỉ có best.pt. "
            "Số liệu mAP dựa hoàn toàn vào SAD PA3 (Mục 5.1).", bold_lead="Thiếu artifact gốc cho YOLO — ")
bullet(doc, "Không có quyền truy cập Supabase production trong môi trường viết PA4 → "
            "không thể lấy tỉ lệ 👍/👎 thật từ translation_feedback để đánh giá chất "
            "lượng dịch Gemini bằng số liệu người dùng thật (Mục 5.4).", bold_lead="Không có dữ liệu feedback sống — ")
bullet(doc, "So sánh base-vs-fine-tuned OCR (Mục 5.3) chỉ trên 1 mẫu (n=1) do không có "
            "dataset thật cục bộ — không thay thế cho test-split 14.130 mẫu.", bold_lead="Cỡ mẫu nhỏ cho so sánh sống — ")

H2(doc, "6.3. Cải tiến tương lai")
bullet(doc, "Thêm lớp \"sfx\" riêng (tách khỏi \"text\") cho YOLOv8 nếu cần dịch/ẩn hiệu "
            "ứng âm thanh — hiện ngoài phạm vi 1-lớp hiện tại.")
bullet(doc, "Đo tỉ lệ tràn chữ tiếng Việt thật bằng cách so sánh độ dài chuỗi dịch với "
            "diện tích bbox gốc trên một mẫu trang manga thật, dùng làm input tinh "
            "chỉnh renderer (font-size auto-shrink).")
bullet(doc, "Lưu lại results.csv/PR_curve/confusion_matrix khi train lại trên Kaggle "
            "(script save_artifacts() đã có sẵn cơ chế copy các file này — chỉ cần đảm "
            "bảo tải zip /kaggle/working/manga109_yolo/weights/ về sau mỗi lần train) "
            "để PA sau có thể đối chiếu độc lập mà không chỉ dựa vào SAD.")
bullet(doc, "Khi có quyền truy cập Supabase production, truy vấn thật bảng "
            "translation_feedback để tính tỉ lệ 👍 thật và đối chiếu ngưỡng 80% đã đề ra.")
bullet(doc, "Chạy lại so sánh base-vs-fine-tune OCR trên một tập lớn hơn (vài chục "
            "mẫu chữ Nhật thật) thay vì n=1, để có ước lượng CER/Char-Acc thô ngoài "
            "phân phối huấn luyện.")

hrule(doc)
P(doc, "Phụ lục kỹ thuật: script và dữ liệu thô của mọi thực nghiệm trong tài liệu này "
       "nằm tại docs/PA/PA4-Group01/assets/ — inference_latency_bench.py + "
       "inference_latency_results.json (Mục 5.2), make_ml_charts.py + chart_*.png "
       "(Hình 5.1–5.3), và log JSON so sánh OCR base/fine-tune (Mục 5.3), có thể chạy "
       "lại để tái tạo toàn bộ số liệu thật đã trích dẫn.", italic=True, size=10.5, color=GREY)

doc.save(OUT)
print(f"Saved -> {OUT}")
