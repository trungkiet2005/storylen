# 🏆 BỘ CÂU HỎI VẤN ĐÁP NÂNG CAO - STORYLENS
**Chuyên đề: Kiểm thử Phần mềm, Quy trình Quản lý (Scrum PM) & Đánh giá mô hình AI (Model Evaluation)**
*Tài liệu dành cho phần phản biện chuyên sâu với Hội đồng chấm thi Nhập môn CNPM (VNUHCM-US)*

---

## 📑 MỤC LỤC
1. [Chủ đề 1: Quy trình Quản lý & Ước lượng Dự án (Project Management)](#chủ-đề-1-quy-trình-quản-lý--ước-lượng-dự-án-project-management)
2. [Chủ đề 2: Kỹ thuật Kiểm thử chuyên sâu & Báo cáo Tự động (Software Testing & QA)](#chủ-đề-2-kỹ-thuật-kiểm-thự-chuyên-sâu--báo-cáo-tự-động-software-testing--qa)
3. [Chủ đề 3: Đánh giá & Giám sát mô hình AI (Model Evaluation & Metrics)](#chủ-đề-3-đánh-giá--giám-sát-mô-hình-ai-model-evaluation--metrics)
4. [Chủ đề 4: Phân tích Tĩnh bảo vệ Codebase (Linter & Typecheck)](#chủ-đề-4-phân-tích-tĩnh-bảo-vệ-codebase-linter--typecheck)
5. [Chủ đề 5: Observability & DevOps Monitor Loop (Sentry, OTel, Audit Log)](#chủ-đề-5-observability--devops-monitor-loop-sentry-otel-audit-log)
6. [Chủ đề 6: Đạo đức AI nâng cao — 11 vấn đề & StoryLens (AI Ethics — LN12)](#chủ-đề-6-đạo-đức-ai-nâng-cao--11-vấn-đề--storylens-ai-ethics--ln12)
7. [Chủ đề 7: Giám sát Hạ tầng vs Giám sát Mô hình AI — Thực trạng & Hướng phát triển](#chủ-đề-7-giám-sát-hạ-tầng-vs-giám-sát-mô-hình-ai--thực-trạng--hướng-phát-triển)


---

## Chủ đề 1: Quy trình Quản lý & Ước lượng Dự án (Project Management)

### 💬 Câu 1: Tại sao nhóm không sử dụng công thức COCOMO truyền thống để tính toán nỗ lực (Effort) mà lại chọn Planning Poker kết hợp Story Points?
* **Trả lời:**
  * **Hạn chế của COCOMO:** Mô hình COCOMO (Constructive Cost Model) đòi hỏi PM phải ước lượng được tương đối chính xác quy mô dự án thông qua số dòng code (KLOC - Kilo Lines of Code). Trong một dự án tích hợp nhiều công nghệ mới như AI, RAG và UI tương tác đè chữ, số lượng dòng code thực tế dao động rất lớn và không phản ánh đúng độ phức tạp của công việc (ví dụ: viết 10 dòng prompt cho Gemini API hoặc cấu hình 1 file DB schema có độ khó cao hơn hàng trăm dòng code HTML thuần túy).
  * **Giải pháp Agile (Story Points):** Nhóm sử dụng **Planning Poker** để cả 6 thành viên cùng thảo luận và thống nhất số **Story Points** (điểm câu chuyện) cho mỗi tính năng dựa trên 3 yếu tố: *độ phức tạp, độ bất định (rủi ro), và nỗ lực cần bỏ ra*.
  * **Cách lập lịch biểu:** Nhóm chia Product Backlog thành **tổng 135 Story Points / 31 task** (xem `docs/management/StoryLens_Project_Plan.xlsx`, sheet WBS + Burndown). Sau 2 Sprint đầu, nhóm đo được **Velocity (Vận tốc trung bình) khoảng 22–23 Story Points/Sprint** (số thật từ Burndown: 23 / 24 / 23 / 26 / 22 / 17 điểm qua 6 sprint, trung bình ≈ 22,5). Dựa vào tổng điểm Backlog và velocity đo được, PM (Duy Minh) dễ dàng lập kế hoạch phát hành và chia Sprint Backlog thực tế hơn nhiều so với COCOMO.
  * **⚠️ Lưu ý khi bảo vệ:** trả lời velocity là **"~22–23 SP/sprint, tổng 135 điểm"** — KHÔNG nói cứng "20", vì hội đồng có thể mở sheet Burndown thấy trung bình 22,5.

### 💬 Câu 2: Trong vai trò Project Manager, làm thế nào bạn theo dõi được năng suất (Capacity) và kiểm soát tiến độ thực tế của các thành viên?
* **Trả lời:**
  * **Sử dụng Bảng Kanban & Daily Standup:** Nhóm sử dụng công cụ quản lý bảng Kanban (Trello/GitHub Projects). Mọi task trong Sprint Backlog đều được chia nhỏ dưới dạng các thẻ (cards) không quá 8 tiếng thực hiện và gán nhãn trạng thái cụ thể: `To Do` $\to$ `In Progress` $\to$ `Reviewing` $\to$ `Done`.
  * **Giám sát biểu đồ Burndown Chart:** Biểu đồ hiển thị lượng công việc còn lại (tính bằng Story Points) theo số ngày của Sprint. Nếu đường thực tế dốc chậm hơn đường lý thuyết, PM sẽ nhận diện ngay nguy cơ chậm tiến độ để hỗ trợ thành viên kịp thời trong cuộc họp Daily/Weekly Scrum.
  * **Code Review chéo:** Không cho phép bất kỳ thành viên nào tự ý đưa code lên nhánh `main`. Phải qua Pull Request và được ít nhất 1 thành viên khác review duyệt để đảm bảo tính minh bạch và chia sẻ tri thức ngầm (tacit knowledge) trong nhóm.

---

## Chủ đề 2: Kỹ thuật Kiểm thử chuyên sâu & Báo cáo Tự động (Software Testing & QA)

### 💬 Câu 3: Hãy so sánh kiểm thử tự động bằng Playwright (Dev-centric) và Katalon Studio (QA-centric) trong đồ án StoryLens. Tại sao cần cả hai?
* **Trả lời:**
  * **Playwright (Developer-centric E2E):**
    * *Đặc điểm:* Code bằng mã nguồn (TypeScript) trực tiếp trong thư mục `frontend/e2e/`. Chạy ở chế độ không giao diện (headless) trên máy chủ ảo của GitHub Actions mỗi khi có code mới.
    * *Mục đích:* Dành cho lập trình viên chạy nhanh trong pipeline CI/CD để làm "gác cổng chất lượng tự động", phát hiện lập tức lỗi hồi quy (regression bugs) ngay khi code thay đổi.
  * **Katalon Studio (QA-centric & Academic Reporting):**
    * *Đặc điểm:* Sử dụng cơ chế kéo thả, ghi lại thao tác (Record & Playback) bởi QA của nhóm (bạn Phú Quý). 
    * *Mục đích:* Dùng để đáp ứng yêu cầu học thuật của môn học (mốc báo cáo PA5). Katalon tự động xuất ra video chạy thực tế, ảnh chụp từng bước và file báo cáo HTML (`StoryLens-Test-Report.html`) trực quan để nộp cho thầy cô chấm điểm.
  * **Kết luận:** Playwright giúp bảo vệ hệ thống tự động ở mức lập trình, còn Katalon giúp tạo lập báo cáo kiểm thử trực quan và chuẩn hóa theo quy trình kiểm thử của môn học.

### 💬 Câu 4: Nhóm bạn đã bao giờ chạy Kiểm thử Hồi quy (Regression Testing) chưa? Nó hoạt động thế nào trong pipeline CI/CD?
* **Trả lời:**
  * **Định nghĩa:** Kiểm thử hồi quy là chạy lại bộ test đã có để đảm bảo code mới sửa/thêm không làm hỏng các tính năng cũ đang chạy bình thường.
  * **Hoạt động thực tế:** Trong file [`ci.yml`](file:///d:/PhD_LetGoo/CLASS_Project/storylen/.github/workflows/ci.yml), nhóm thiết lập trigger tự động kích hoạt mỗi khi có thao tác `git push` hoặc `pull_request` đến nhánh `main`. GitHub Actions sẽ khởi chạy đồng thời:
    * Chạy lại toàn bộ **Vitest** (143 unit test frontend).
    * Chạy lại toàn bộ **pytest** (các API backend và mock server).
    * Khởi động server local ảo và chạy toàn bộ **Playwright** E2E test.
  * Chỉ khi bộ test hồi quy này báo xanh 100%, code mới được phép merge. Đây chính là cách nhóm duy trì chất lượng hệ thống ổn định mà không cần kiểm thử tay thủ công lại toàn bộ tính năng sau mỗi Sprint.

---

## Chủ đề 3: Đánh giá & Giám sát mô hình AI (Model Evaluation & Metrics)

### 💬 Câu 5: Hãy giải thích cách tính và ý nghĩa thực tế của IoU, Precision, và mAP@0.5 đối với mô hình phát hiện bong bóng thoại YOLOv8.
* **Trả lời:**
  * **IoU (Intersection over Union - Chỉ số giao trên hợp):**
    $$\text{IoU} = \frac{\text{Diện tích phần giao nhau giữa khung dự đoán và khung thật}}{\text{Diện tích phần hợp nhau giữa khung dự đoán và khung thật}}$$
    *Ý nghĩa:* Dùng để xác định xem một dự đoán có được coi là đúng hay không. Trong bài toán này, nhóm cấu hình ngưỡng IoU $\ge$ 0.5 (tức phần chung chiếm tối thiểu 50% diện tích).
  * **Precision (Độ chính xác):**
    $$\text{Precision} = \frac{TP}{TP + FP}$$
    *Ý nghĩa:* Tỷ lệ số khung bong bóng thoại mô hình đoán đúng ($TP$) trên tổng số khung mà mô hình tự vẽ ra ($TP + FP$). Precision đạt **97.3%** nghĩa là hệ thống cực kỳ chính xác, hầu như không bao giờ phát hiện nhầm các vật thể như cái cây, ô cửa sổ hay khuôn mặt nhân vật thành bong bóng thoại để đè chữ lên.
  * **mAP@0.5 (Mean Average Precision tại ngưỡng IoU=0.5):**
    * *Ý nghĩa:* Tính diện tích dưới đường cong Precision-Recall (PR Curve) của lớp "bong bóng thoại". Chỉ số đạt **95.3%** chứng minh mô hình hoạt động cực kỳ ổn định, vừa định vị khung chuẩn xác vừa không bỏ sót các khung thoại nhỏ hoặc mờ.

### 💬 Câu 6: Phân tích chỉ số CER của mô hình manga-ocr. Tỷ lệ lỗi 6.1% ảnh hưởng như thế nào đến bản dịch tiếng Việt cuối cùng?
* **Trả lời:**
  * **Công thức CER (Character Error Rate):**
    $$\text{CER} = \frac{S + D + I}{N}$$
    *(Với $S$: Ký tự thay thế sai, $D$: Ký tự bị xóa/bỏ sót, $I$: Ký tự chèn thêm, $N$: Tổng số ký tự chuẩn gốc).*
  * **Ảnh hưởng thực tế:** Tỷ lệ lỗi 6.1% nghĩa là khi quét 100 ký tự tiếng Nhật/Trung gốc, có thể có 6 chữ bị đọc sai nét hoặc mất nét. 
  * Tuy nhiên, vì chữ sau khi quét được chuyển qua **Gemini LLM** để dịch, Gemini có khả năng **tự động sửa lỗi chính tả dựa vào ngữ cảnh** của cả câu thoại và mạch truyện. Do đó, ngay cả khi OCR bị sai vài nét chữ gốc, bản dịch tiếng Việt cuối cùng của Gemini vẫn đảm bảo tính tự nhiên và chính xác cao nhờ cơ chế tự sửa sai của mô hình ngôn ngữ lớn.

### 💬 Câu 6b: (BẪY KHÓ) Bạn fine-tune manga-ocr cụ thể như thế nào? Chứng minh fine-tune thật sự tốt hơn model gốc?
* **Trả lời — có ablation hợp lệ + artifact xác minh (số liệu thật từ `model_evaluation.docx` PA4):**
  * **Cách fine-tune:** base là **`kha-white/manga-ocr-base`** (kiến trúc VisionEncoderDecoderModel), **fine-tune full** trên **Manga109-s**. Dataset OCR gồm **123.208 cặp** (crop bong bóng + nhãn chữ Nhật), chia **split-by-title (theo đầu truyện, chống rò rỉ dữ liệu), seed = 42** → Train 97.602 / Val 11.476 / **Test 14.130**. Cấu hình: **8 epochs, AdamW, lr = 3e-5, cosine schedule, warmup 5%, label-smoothing = 0.1, weight_decay = 0.01, fp16**, chọn checkpoint tốt nhất theo **CER val nhỏ nhất, early-stop patience 3**, huấn luyện trên **Kaggle Tesla T4**.
  * **Bằng chứng fine-tune có tác dụng (ablation 2 vòng — CÙNG dataset / CÙNG test split / CÙNG base, chỉ khác cấu hình):**

    | Phiên bản | Char-Acc | CER |
    |---|---|---|
    | PA2 (fine-tune sơ bộ, ít epoch) | 87,3% | **12,7%** |
    | PA3 (fine-tune hoàn chỉnh) | 93,9% | **6,1%** |

    → **CER giảm 12,7% → 6,1% ≈ giảm hơn 50% lỗi ký tự**. Con số này **khớp chính xác 4 chữ số** với artifact thật `ai_module/models/manga_ocr/weights/metadata.json` (test_cer = 0.061090, test_char_acc = 0.938910, test_exact_match = 0.674805) do chính script `03_train_ocr.py` ghi ra khi train → chứng minh đây là **output huấn luyện thật, không phải số gõ tay**.
  * **⚠️ HAI cái bẫy phải né:**
    1. **Đừng dùng demo n=1 để khoe fine-tune.** PA4 có 1 thực nghiệm sống base-vs-fine-tune trên **1 ảnh minh hoạ AI-generated ngoài phân phối** — ở mẫu đó bản fine-tune còn đọc sai 2 ký tự đầu. Nếu hội đồng chỉ vào đây, trả lời: *"Đó là 1 mẫu (n=1) ngoài phân phối Manga109-s, chỉ là smoke-test; bằng chứng chuẩn là test split 14.130 mẫu, CER 12,7% → 6,1%."*
    2. **YOLOv8 KHÔNG có artifact gốc** (chỉ có `best.pt`, không có `results.csv`/PR-curve). Số **mAP@0.5 = 95,3%** lấy từ SAD PA3, chưa đối chiếu độc lập được → thừa nhận thẳng là "giới hạn minh bạch đã ghi nhận, hướng khắc phục là lưu `results.csv` khi train lại". Đừng khẳng định là có artifact.

---

## Chủ đề 4: Phân tích Tĩnh bảo vệ Codebase (Linter & Typecheck)

### 💬 Câu 7: Tại sao nhóm lại đưa npx tsc --noEmit (Typecheck) và ESLint (Linter) vào CI/CD? Chúng giúp ích gì khi làm việc nhóm?
* **Trả lời:**
  * **ESLint (Linter):** Rà soát cú pháp và chuẩn định dạng. Khi 6 thành viên cùng viết code, mỗi người sẽ có thói quen viết khác nhau (ví dụ: dùng nháy đơn hay nháy kép, thụt lề 2 hay 4 khoảng trắng). ESLint ép tất cả về một chuẩn chung của dự án. Đồng thời bắt các lỗi như khai báo biến nhưng quên không dùng (gây tốn bộ nhớ).
  * **Typecheck (`npx tsc --noEmit`):** TypeScript giúp phát hiện các lỗi "bất khớp dữ liệu" trước khi chạy app (Static Type Checking). Cờ `--noEmit` ra lệnh cho TypeScript chỉ thực hiện kiểm tra lỗi kiểu dữ liệu trên toàn bộ project chứ không dịch code ra file `.js` thực tế.
  * **Ý nghĩa khi làm việc nhóm:** Đảm bảo khi một thành viên backend thay đổi cấu trúc dữ liệu trả về của API (ví dụ: đổi trường `credits` từ kiểu `number` sang `string`), hệ thống CI/CD ở nhánh frontend sẽ lập tức báo đỏ ở bước Typecheck vì phát hiện frontend vẫn đang gọi các hàm toán học trên trường này. Lỗi được chặn đứng ngay từ lúc merge code, không bao giờ lọt xuống môi trường Production.

---

## Chủ đề 5: Observability & DevOps Monitor Loop (Sentry, OTel, Audit Log)

> *Đây là phần kỹ thuật vận hành Production nâng cao tương ứng với vòng lặp **Operate → Monitor** trong DevOps (LN11). StoryLens có hệ thống 3 tầng observability hoàn chỉnh và chuyên nghiệp.*

### 💬 Câu 8: Giải thích kiến trúc 3 tầng Observability của StoryLens. Tại sao cần đến 3 tầng thay vì chỉ dùng `print()` để debug?
* **Trả lời:**
  * **Tầng 1 — Structured Logging (Python `logging` module):**
    * Mỗi module backend có `logger = logging.getLogger(__name__)`. Log được format theo chuẩn: `[timestamp] [level] [module] [request_id] message`.
    * **Request ID Middleware** (`middleware.py`): Mỗi HTTP request được gán UUID duy nhất `X-Request-ID`. UUID này đính kèm vào mọi dòng log trong suốt vòng đời request. Khi user báo lỗi, chỉ cần filter theo Request ID là tìm ra toàn bộ trace ngay lập tức.
  * **Tầng 2 — Audit Log (Database Postgres):**
    * Router `admin/audit.py` ghi cấu trúc vào bảng `admin_audit_log`: `{admin_id, action, target_id, timestamp, metadata}`.
    * Mục đích: **Accountability** — ai làm gì, lúc nào, trên dữ liệu nào. Dùng để điều tra tranh chấp và chứng minh compliance.
  * **Tầng 3 — Production Observability (Sentry + OpenTelemetry):**
    * **Sentry** (`observability.py → _init_sentry()`): Bắt exception runtime, gửi alert kèm full stack trace. Cấu hình `send_default_pii=False` — không log thông tin cá nhân người dùng. Filter thông minh: bỏ qua HTTP 4xx vì đó là lỗi client, không phải bug hệ thống.
    * **OpenTelemetry** (`observability.py → _init_otel()`): `FastAPIInstrumentor` trace mọi route handler, `HTTPXClientInstrumentor` trace mọi outgoing HTTP call đến AI Module và Supabase. Xuất trace theo chuẩn OTLP sang Grafana Tempo hoặc Jaeger.
  * **Tại sao không chỉ dùng `print()`?**
    * `print()` không có level (INFO/WARN/ERROR), không có timestamp, không có Request ID → không thể lọc theo request, không thể giám sát production, không thể tắt bớt khi cần hiệu năng cao.

### 💬 Câu 9: Trong vòng lặp DevOps, "Monitor" phát hiện vấn đề rồi thì làm gì tiếp? Kể ra một kịch bản cụ thể trong StoryLens.
* **Trả lời — Kịch bản: Pipeline AI xử lý chậm đột ngột (Latency spike):**
  1. **Monitor:** OpenTelemetry phát hiện endpoint `/v1/translate` đang có p95 latency > 30 giây (bình thường là 8-12 giây).
  2. **Alert:** Dashboard báo động.
  3. **Investigate (Develop):** PM/Dev dùng Trace Explorer của OTel để xem span nào kéo dài nhất. Phát hiện span `ai_module.inpaint` (bước LaMa xóa chữ) chiếm 22 giây do AI Module trên HuggingFace Spaces đang bị cold start (máy chủ ngủ sau 15 phút không dùng).
  4. **Fix:** Dev thêm ping mechanism (warm-up call) để giữ AI Module luôn awake trước khi người dùng gửi request thật.
  5. **Build → Test → Deploy:** CI/CD chạy lại, deploy fix.
  6. **Monitor lại:** OTel xác nhận latency trở về bình thường → vòng lặp khép kín.
  * **Ý nghĩa:** Đây là ví dụ điển hình của **Maintenance & Operating** trong ML Workflow (LN07) và **vòng lặp DevOps** (LN11) cùng hoạt động để cải thiện hệ thống liên tục (continuous improvement).

### 💬 Câu 10: Security Headers Middleware trong StoryLens là gì? Liên quan thế nào đến bảo mật của hệ thống?
* **Trả lời:**
  * `SecurityHeadersMiddleware` (`middleware.py`) tự động đính kèm các HTTP response header bảo mật vào mọi phản hồi của Backend API:

    | Header | Giá trị | Mục đích bảo vệ |
    |---|---|---|
    | `X-Content-Type-Options: nosniff` | Bắt buộc | Ngăn trình duyệt tự đoán MIME type → chống MIME sniffing attack |
    | `X-Frame-Options: DENY` | Bắt buộc | Cấm nhúng page vào iframe → chống Clickjacking |
    | `Strict-Transport-Security` | HSTS 2 năm | Bắt buộc HTTPS → chống downgrade attack |
    | `Content-Security-Policy` | Giới hạn nguồn script/style | Ngăn load script lạ → chống XSS nâng cao |
    | `Referrer-Policy: strict-origin-when-cross-origin` | Bắt buộc | Giới hạn thông tin Referer gửi cho bên thứ 3 |
    | `Permissions-Policy` | Camera/mic/geo = () | Cấm browser API nhạy cảm → chống fingerprinting |

  * Các header này là **Defense in Depth** — lớp bảo vệ thứ 2 kể cả khi tầng application code có lỗ hổng nhỏ.

---

## Chủ đề 6: Đạo đức AI nâng cao — 11 vấn đề & StoryLens (AI Ethics — LN12)

> *LN12 nhấn mạnh: "Principles alone cannot guarantee ethical AI." Không đủ nếu chỉ nói "chúng tôi cố gắng công bằng" — phải có thiết kế kỹ thuật cụ thể để kiểm soát các vấn đề đạo đức.*

### 💬 Câu 11: Giải thích sâu vấn đề "Opacity" (mờ đục) và "Artificial Stupidity" trong context của pipeline AI 4 bước của StoryLens.
* **Trả lời:**
  * **Artificial Stupidity (Sự "ngu" của máy) — thực tế trong StoryLens:**
    * *YOLO sai:* Phát hiện khuôn mặt nhân vật nhầm thành bong bóng thoại (False Positive) → LaMa xóa nhầm khuôn mặt nhân vật → trang truyện hỏng hoàn toàn.
    * *OCR sai (CER 6.1%):* manga-ocr đọc sai nét chữ → Gemini nhận input sai → có thể dịch sai nghĩa hoặc bịa đặt.
    * *LaMa inpaint kém:* Xóa chữ không sạch, để lại artifact ảnh xấu → ảnh hưởng chất lượng đọc.
  * **Cách xử lý "Artificial Stupidity":**
    * **Graceful degradation:** Nếu bước nào fail, hệ thống trả về partial result (ví dụ: nếu YOLO không tìm được bong bóng, vẫn trả về ảnh gốc thay vì báo lỗi 500).
    * **Human-in-the-loop:** Studio QC cho phép dịch giả can thiệp bất kỳ lúc nào.
    * **Gemini self-correction:** LLM tự suy diễn nghĩa từ ngữ cảnh câu thoại xung quanh để bù lỗi OCR.
  * **Opacity (Mờ đục) — thực tế trong StoryLens:**
    * Pipeline YOLO → OCR → LaMa → Gemini là hộp đen 4 tầng: mỗi tầng là một Deep Learning model với hàng chục triệu tham số, không thể giải thích vì sao tầng đó ra kết quả đó.
    * **Giải pháp Explainability:** Progress bar + status message mỗi bước (transparency với user), Structured log mỗi bước (transparency với dev), bounding box visualization trong Studio để user thấy YOLO đã phát hiện đúng chỗ chưa.

### 💬 Câu 12: Nguyên tắc "Principles alone cannot guarantee ethical AI" (LN12) áp dụng vào StoryLens như thế nào?
* **Trả lời:**
  * **Ý nghĩa nguyên tắc:** Chỉ tuyên bố "chúng tôi tôn trọng quyền riêng tư người dùng" là không đủ. Phải có **thiết kế kỹ thuật** cụ thể để enforce các nguyên tắc đó — vì nếu không có code cứng chặn, người dev khác có thể vô tình phá vỡ cam kết bảo mật.
  * **StoryLens áp dụng thế nào — từng nguyên tắc đi kèm thiết kế kỹ thuật:**

    | Nguyên tắc tuyên bố | Thiết kế kỹ thuật enforce |
    |---|---|
    | "Chúng tôi không rò rỉ dữ liệu người dùng" | **RLS** trên Supabase: `WHERE owner_id = auth.uid()` tự động enforce ở tầng DB |
    | "Chúng tôi bảo vệ phiên đăng nhập" | **HttpOnly Cookie + CSRF double-submit token** ở middleware layer |
    | "Chúng tôi không dùng dữ liệu nhạy cảm để debug" | **Sentry: `send_default_pii=False`** hard-coded trong `observability.py` |
    | "Chúng tôi không cho phép SSRF" | **Domain Allowlist** trong backend, từ chối mọi URL ngoài whitelist |
    | "Chúng tôi minh bạch về AI Bias" | **Ghi nhận bias trong docs**, trang sản phẩm liệt kê rõ giới hạn của mô hình |

  * **Kết luận:** Điểm mạnh của StoryLens về đạo đức AI không nằm ở việc "hứa hẹn" mà nằm ở hệ thống **kỹ thuật phòng ngừa nhiều tầng** — RLS, middleware, Sentry config — mà developer khác không thể bypass dù vô tình.

---

## Chủ đề 7: Giám sát Hạ tầng vs Giám sát Mô hình AI — Thực trạng & Hướng phát triển

> *Đây là một trong những câu hỏi phản biện "bẫy" nhất của Hội đồng: "Hệ thống của bạn có theo dõi chất lượng model AI sau khi deploy không?" Cần trả lời trung thực, tự tin và có định hướng.*

### 💬 Câu 13: StoryLens có hệ thống monitoring (giám sát) nào để kiểm tra trạng thái hoạt động của hệ thống? Liệt kê đầy đủ.
* **Trả lời — StoryLens có đủ 4 tầng giám sát hạ tầng:**

  | Tầng | Công cụ | Giám sát cái gì | Xem ở đâu |
  |---|---|---|---|
  | 1 | **Sentry** | Lỗi runtime JS/Python, crash app của người dùng | Cloud dashboard tại `sentry.io` |
  | 2 | **OpenTelemetry (OTel)** | Tốc độ API, latency từng bước pipeline, bottleneck | Jaeger UI `localhost:16686` (local) hoặc Grafana Cloud |
  | 3 | **Admin Health Dashboard** | Trạng thái UP/DOWN + latency ms của Supabase, AI Module, HF Space | Trang web `/admin/health` trong StoryLens — tự refresh mỗi 30 giây |
  | 4 | **Structured Logging + Request ID** | Mọi HTTP request với UUID trace end-to-end | Terminal log của uvicorn backend |

  * **Thực tế chạy:** Khi backend khởi động, log ghi rõ:
    ```
    Sentry: enabled (env=development, traces=0.10)
    OpenTelemetry: exporting traces to http://localhost:4318
    ```
  * **Deep Health Check API** công khai tại `GET /health/deep` trả về JSON chi tiết:
    ```json
    { "status": "healthy", "checks": {
        "supabase": { "status": "ok", "latency_ms": 289 },
        "gemini":   { "status": "ok", "key_count": 23 },
        "ai_module":{ "status": "ok", "latency_ms": 623 }
    }}
    ```

### 💬 Câu 14: Sentry và OpenTelemetry xem dashboard ở đâu? Có cần cài thêm gì không?
* **Trả lời:**
  * **Sentry Dashboard (Cloud, không cần cài gì thêm):**
    * Đăng ký tài khoản miễn phí tại [sentry.io](https://sentry.io), lấy `SENTRY_DSN` và điền vào `backend/.env` + `frontend/.env.local`.
    * Truy cập `https://sentry.io/<tên-tổ-chức>/<tên-dự-án>/` để xem dashboard đầy đủ:
      * **Issues:** Danh sách lỗi được gom nhóm theo loại, tần suất và số người dùng bị ảnh hưởng.
      * **Performance:** Biểu đồ tốc độ P50/P95 latency của từng trang web.
      * **Breadcrumbs:** Sơ đồ timeline các thao tác người dùng trước khi crash.
  * **OpenTelemetry / Jaeger (local, cần Docker):**
    * Chạy lệnh: `docker run -d -p 16686:16686 -p 4318:4318 jaegertracing/all-in-one:latest`
    * Mở trình duyệt tại `http://localhost:16686`.
    * Khi người dùng thao tác trên StoryLens, trace data tự động đổ về:
      * **Trace Timeline:** Biểu đồ Gantt hình thanh ngang hiển thị từng span (Backend → AI Module → Supabase).
      * **Dependency Graph:** Sơ đồ quan hệ giữa các dịch vụ.
      * **Latency heatmap:** Phân bố thời gian phản hồi của từng API endpoint.
  * **Admin Health Dashboard (có sẵn trong app, không cần cài gì):**
    * Đăng nhập Admin → vào menu **System Health** hoặc truy cập `/admin/health`.
    * Trang tự động ping kiểm tra sức khỏe của Supabase, AI Module và HuggingFace Space **mỗi 30 giây** và hiển thị màu xanh/đỏ + milliseconds latency ngay trên giao diện web.

### 💬 Câu 15: Hệ thống StoryLens có theo dõi chất lượng mô hình AI sau khi deploy không? (Model Monitoring / MLOps)
* **Trả lời trung thực + chuyên nghiệp:**
  * **Điểm mạnh đã có:** StoryLens có đầy đủ **giám sát hạ tầng** (Infrastructure Monitoring) theo chuẩn DevOps doanh nghiệp — Sentry bắt lỗi, OTel theo dõi latency, Admin Dashboard kiểm tra sức khỏe tất cả services theo thời gian thực.
  * **Điểm còn thiếu — Model Monitoring chuyên nghiệp (MLOps):** Hệ thống hiện chưa tích hợp công cụ theo dõi **chất lượng dự đoán của mô hình AI theo thời gian**, cụ thể:

    | Tính năng MLOps chuyên nghiệp | StoryLens hiện tại | Hướng phát triển |
    |---|---|---|
    | Theo dõi mAP/Precision của YOLOv8 theo thời gian (concept drift) | ❌ Chưa có | Tích hợp **Weights & Biases (W&B)** |
    | Theo dõi CER của manga-ocr trên dữ liệu thực | ❌ Chưa có | Logging prediction samples vào W&B |
    | Dashboard so sánh các phiên bản model (Model Registry) | ❌ Chưa có | **MLflow** Model Registry |
    | Alert khi model bị degradation (accuracy giảm) | ❌ Chưa có | W&B Alerts hoặc Evidently AI |
    | A/B testing giữa 2 phiên bản model | ❌ Chưa có | Feature flag + Shadow deployment |

  * **Lý do nhóm chưa triển khai:** Dự án ở giai đoạn MVP (Minimum Viable Product). Mô hình AI (YOLOv8, manga-ocr) đang chạy phiên bản tĩnh — không retrain tự động mà cần update thủ công qua pipeline training riêng. Model Monitoring chuyên nghiệp sẽ có ý nghĩa lớn hơn khi hệ thống đạt quy mô sản xuất (production scale) với lượng người dùng đủ lớn để phát hiện concept drift có ý nghĩa thống kê.
  * **Câu trả lời hoàn chỉnh cho Hội đồng:** *"Nhóm đã triển khai đầy đủ giám sát hạ tầng theo chuẩn DevOps. Về Model Monitoring theo chuẩn MLOps, đây là hướng phát triển tiếp theo mà nhóm đề xuất: tích hợp W&B để theo dõi mAP và CER theo thời gian thực, từ đó phát hiện concept drift sớm và trigger pipeline retrain tự động khi cần thiết."*

### 💬 Câu 16: Cụ thể CI/CD của StoryLens kiểm soát chất lượng Deploy như thế nào? (End-to-end deploy gate)
* **Trả lời — 3 chốt chặn tự động trước khi code đến tay người dùng:**
  1. **Chốt GitHub Actions (Pre-deploy gate):** Mỗi `git push` hoặc Pull Request kích hoạt 5 job song song:
     * `typecheck`: `npx tsc --noEmit` quét lỗi kiểu TypeScript.
     * `lint`: `eslint` quét cú pháp và chuẩn định dạng.
     * `build`: `npm run build` kiểm tra Next.js có build thành công không.
     * `test`: `vitest` chạy 143 unit test frontend.
     * `backend`: `pytest` chạy toàn bộ test case API.
     * `e2e`: `playwright` chạy test E2E mô phỏng trình duyệt.
     * ⛔ **Nếu bất kỳ job nào đỏ, toàn bộ luồng deploy bị chặn.**
  2. **Chốt Render Readiness Probe (During deploy):** Render tự động ping `/health` của container mới. Nếu container không khỏe $\to$ Render giữ nguyên bản cũ (**Zero-downtime rollback**).
  3. **Chốt Production Alerting (Post-deploy):** Sentry theo dõi 24/7. Nếu người dùng thực gặp lỗi sau deploy $\to$ Alert gửi ngay về email nhóm phát triển trong vòng vài giây.

---

*Tài liệu nâng cao — được tổng hợp từ phân tích mã nguồn thực tế của StoryLens. Phục vụ ôn tập phần phản biện chuyên sâu trong kỳ bảo vệ đồ án môn CSC13002 (VNUHCM-US).*

