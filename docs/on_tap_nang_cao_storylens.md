# 🏆 BỘ CÂU HỎI VẤN ĐÁP NÂNG CAO - STORYLENS
**Chuyên đề: Kiểm thử Phần mềm, Quy trình Quản lý (Scrum PM) & Đánh giá mô hình AI (Model Evaluation)**
*Tài liệu dành cho phần phản biện chuyên sâu với Hội đồng chấm thi Nhập môn CNPM (VNUHCM-US)*

---

## 📑 MỤC LỤC
1. [Chủ đề 1: Quy trình Quản lý & Ước lượng Dự án (Project Management)](#chủ-đề-1-quy-trình-quản-lý--ước-lượng-dự-án-project-management)
2. [Chủ đề 2: Kỹ thuật Kiểm thử chuyên sâu & Báo cáo Tự động (Software Testing & QA)](#chủ-đề-2-kỹ-thuật-kiểm-thự-chuyên-sâu--báo-cáo-tự-động-software-testing--qa)
3. [Chủ đề 3: Đánh giá & Giám sát mô hình AI (Model Evaluation & Metrics)](#chủ-đề-3-đánh-giá--giám-sát-mô-hình-ai-model-evaluation--metrics)
4. [Chủ đề 4: Phân tích Tĩnh bảo vệ Codebase (Linter & Typecheck)](#chủ-đề-4-phân-tích-tĩnh-bảo-vệ-codebase-linter--typecheck)

---

## Chủ đề 1: Quy trình Quản lý & Ước lượng Dự án (Project Management)

### 💬 Câu 1: Tại sao nhóm không sử dụng công thức COCOMO truyền thống để tính toán nỗ lực (Effort) mà lại chọn Planning Poker kết hợp Story Points?
* **Trả lời:**
  * **Hạn chế của COCOMO:** Mô hình COCOMO (Constructive Cost Model) đòi hỏi PM phải ước lượng được tương đối chính xác quy mô dự án thông qua số dòng code (KLOC - Kilo Lines of Code). Trong một dự án tích hợp nhiều công nghệ mới như AI, RAG và UI tương tác đè chữ, số lượng dòng code thực tế dao động rất lớn và không phản ánh đúng độ phức tạp của công việc (ví dụ: viết 10 dòng prompt cho Gemini API hoặc cấu hình 1 file DB schema có độ khó cao hơn hàng trăm dòng code HTML thuần túy).
  * **Giải pháp Agile (Story Points):** Nhóm sử dụng **Planning Poker** để cả 6 thành viên cùng thảo luận và thống nhất số **Story Points** (điểm câu chuyện) cho mỗi tính năng dựa trên 3 yếu tố: *độ phức tạp, độ bất định (rủi ro), và nỗ lực cần bỏ ra*.
  * **Cách lập lịch biểu:** Sau 2 Sprint đầu tiên, nhóm đo được **Velocity (Vận tốc trung bình)** là **20 Story Points/Sprint**. Dựa vào tổng số điểm của Product Backlog, PM (Duy Minh) dễ dàng lập kế hoạch phát hành và chia Sprint Backlog một cách thực tế và khoa học hơn rất nhiều so với COCOMO.

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

---

## Chủ đề 4: Phân tích Tĩnh bảo vệ Codebase (Linter & Typecheck)

### 💬 Câu 7: Tại sao nhóm lại đưa npx tsc --noEmit (Typecheck) và ESLint (Linter) vào CI/CD? Chúng giúp ích gì khi làm việc nhóm?
* **Trả lời:**
  * **ESLint (Linter):** Rà soát cú pháp và chuẩn định dạng. Khi 6 thành viên cùng viết code, mỗi người sẽ có thói quen viết khác nhau (ví dụ: dùng nháy đơn hay nháy kép, thụt lề 2 hay 4 khoảng trắng). ESLint ép tất cả về một chuẩn chung của dự án. Đồng thời bắt các lỗi như khai báo biến nhưng quên không dùng (gây tốn bộ nhớ).
  * **Typecheck (`npx tsc --noEmit`):** TypeScript giúp phát hiện các lỗi "bất khớp dữ liệu" trước khi chạy app (Static Type Checking). Cờ `--noEmit` ra lệnh cho TypeScript chỉ thực hiện kiểm tra lỗi kiểu dữ liệu trên toàn bộ project chứ không dịch code ra file `.js` thực tế.
  * **Ý nghĩa khi làm việc nhóm:** Đảm bảo khi một thành viên backend thay đổi cấu trúc dữ liệu trả về của API (ví dụ: đổi trường `credits` từ kiểu `number` sang `string`), hệ thống CI/CD ở nhánh frontend sẽ lập tức báo đỏ ở bước Typecheck vì phát hiện frontend vẫn đang gọi các hàm toán học trên trường này. Lỗi được chặn đứng ngay từ lúc merge code, không bao giờ lọt xuống môi trường Production.
