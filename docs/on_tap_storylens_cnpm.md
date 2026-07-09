# 🎓 BỘ CÂU HỎI VẤN ĐÁP BẢO VỆ ĐỒ ÁN - STORYLENS
**Môn học: Nhập môn Công nghệ phần mềm (CSC13002) — VNUHCM-US**
**Thiết kế dưới dạng câu hỏi - trả lời trực tiếp giữa Hội đồng chấm thi và Nhóm phát triển**

---

## 📑 MỤC LỤC
1. [Chủ đề 1: Quy trình Phát triển phần mềm & Quản lý (Scrum PM)](#chủ-đề-1-quy-trình-phát-triển-phần-mềm--quản-lý-scrum-pm)
2. [Chủ đề 2: Kỹ nghệ Yêu cầu (Requirements Engineering)](#chủ-đề-2-kỹ-nghệ-yêu-cầu-requirements-engineering)
3. [Chủ đề 3: Kiến trúc Phần mềm & Cơ sở dữ liệu (Architecture & DB)](#chủ-đề-3-kiến-trúc-phần-mềm--cơ-sở-dữ-liệu-architecture--db)
4. [Chủ đề 4: Quy trình Học máy & Đánh giá mô hình AI (ML Workflow & Evaluation)](#chủ-đề-4-quy-trình-học-máy--đánh-giá-mô-hình-ai-ml-workflow--evaluation)
5. [Chủ đề 5: Lập trình thời AI (Vibe Coding, Linter & Typecheck)](#chủ-đề-5-lập-trình-thời-ai-vibe-coding-linter--typecheck)
6. [Chủ đề 6: Thiết kế Giao diện (UI/UX Design)](#chủ-đề-6-thiết-kế-giao-diện-uiux-design)
7. [Chủ đề 7: Quy trình Kiểm thử & Báo cáo chất lượng (Testing & QA)](#chủ-đề-7-quy-trình-kiểm-thử--báo-cáo-chất-lượng-testing--qa)
8. [Chủ đề 8: Bảo mật & Đạo đức AI (Security & AI Ethics)](#chủ-đề-8-bảo-mật--đạo-đức-ai-security--ai-ethics)
9. [Chủ đề 9: Vận hành & Giám sát hệ thống (DevOps Monitoring — LN11)](#chủ-đề-9-vận-hành--giám-sát-hệ-thống-devops-monitoring--ln11)
10. [Chủ đề 10: Đạo đức AI chuyên sâu (AI Ethics — LN12)](#chủ-đề-10-đạo-đức-ai-chuyên-sâu-ai-ethics--ln12)

---

## Giải thích nhanh: Linter & Typecheck là gì?

* **Linter (Trình phân tích tĩnh/Định dạng code):**
  * *Là gì:* Một công cụ tự động đọc mã nguồn mà không cần chạy chương trình, nhằm phát hiện ra các lỗi cú pháp, đoạn code dư thừa (biến khai báo nhưng không dùng), hoặc vi phạm quy ước viết code (naming convention, thụt lề).
  * *Thực tế:* Nhóm dùng **ESLint** cho frontend JavaScript/TypeScript. Linter giúp đồng bộ định dạng mã nguồn giữa cả 6 thành viên trong nhóm, giúp code trông thống nhất như do một người viết.
* **Typecheck (Kiểm tra kiểu dữ liệu tĩnh):**
  * *Là gì:* Quá trình rà soát xem lập trình viên có sử dụng đúng kiểu dữ liệu của biến hay không (ví dụ: một hàm yêu cầu truyền vào "chuỗi kí tự" nhưng lập trình viên lại truyền vào "số"). Nếu sai kiểu, chương trình có thể bị crash khi chạy thực tế (Runtime Error).
  * *Thực tế:* Nhóm dùng TypeScript và chạy lệnh `npx tsc --noEmit` ở CI/CD. Cờ `--noEmit` nghĩa là chỉ chạy trình biên dịch của TypeScript để rà lỗi kiểu dữ liệu chứ không xuất ra file `.js` thực tế, giúp tốc độ kiểm tra cực nhanh.

---

## Chủ đề 1: Quy trình Phát triển phần mềm & Quản lý (Scrum PM)

### 💬 Câu 1: Tại sao nhóm lại chọn mô hình Agile/Scrum để phát triển StoryLens mà không dùng mô hình Thác nước (Waterfall)?
* **Trả lời:** 
  * Dự án StoryLens có **độ bất định rất lớn về mặt công nghệ**, đặc biệt là phần tích hợp AI (pipeline YOLOv8 phát hiện bong bóng, manga-ocr và RAG). 
  * Nếu dùng Waterfall, nhóm phải chốt toàn bộ yêu cầu và kiến trúc từ đầu. Nếu đến tuần thứ 10 mới chạy thử pipeline AI và phát hiện mô hình OCR bị sai lệch nhiều hoặc thời gian xử lý quá lâu, việc sửa lại kiến trúc sẽ vô cùng tốn kém và nguy cơ sập tiến độ là cực kỳ cao.
  * Chọn **Agile/Scrum** cho phép nhóm phát triển theo hướng **lặp và tăng dần (Iterative & Incremental)**. Nhóm chia dự án làm **7 Sprint (mỗi Sprint 2 tuần)**. Ngay từ Sprint 2, nhóm đã có một pipeline AI thô chạy được (tuy độ chính xác chưa cao) để thử nghiệm tích hợp với database. Việc này giúp giảm thiểu rủi ro công nghệ sớm và luôn có sản phẩm chạy được (shippable increment) ở cuối mỗi Sprint để lấy phản hồi từ thầy cô hoặc người dùng thử nghiệm.

### 💬 Câu 2: Nhóm bạn tổ chức họp hành thế nào? Có sinh tài liệu trong Agile không?
* **Trả lời:**
  * Nhóm áp dụng **RUP rút gọn kết hợp Scrum**. Hằng tuần, nhóm tổ chức họp **Weekly Scrum** trực tiếp/online để cập nhật 3 câu hỏi kinh điển: *(1) Tuần qua đã làm được gì? (2) Tuần này sẽ làm gì? (3) Có khó khăn hay trở ngại gì không?*
  * Tuy theo tinh thần Agile "Working software over comprehensive documentation", nhóm vẫn tuân thủ các mốc báo cáo bằng việc xây dựng tài liệu **SRS (Đặc tả yêu cầu)** ở giai đoạn đầu (Pha Inception/Elaboration) và **SAD (Tài liệu kiến trúc)** ở giai đoạn thiết kế lõi hệ thống. Các tài liệu này đóng vai trò là "hợp đồng kỹ thuật" giúp 6 thành viên làm việc ăn ý, không bị lệch pha giữa các phần Frontend, Backend và AI.

### 💬 Câu 3: Vai trò của bạn Đào Sỹ Duy Minh trong Scrum Team là gì và bạn ấy quản lý dự án như thế nào?
* **Trả lời:**
  * Bạn Duy Minh đóng vai trò là **Project Manager kiêm AI/ML Engineer**.
  * Với vai trò PM, Minh điều phối tiến độ dựa trên Product Backlog, phân chia các đầu việc cho các Sprint backlog, tổ chức họp Scrum và quản trị rủi ro kỹ thuật. Minh quản lý chất lượng code bằng việc bắt buộc cấu hình **Code Review qua Pull Request** trên GitHub. Mỗi Pull Request phải được ít nhất 1 thành viên review và hệ thống CI báo xanh mới được merge vào nhánh chính.

### 💬 Câu 4: Là Manager, bạn ước lượng nỗ lực (effort) và thời gian (schedule) cho dự án bằng cách nào? Có dùng COCOMO không?
* **Trả lời:**
  * Do dự án là phi thương mại và phát triển theo mô hình Agile, nhóm sử dụng kỹ thuật **Planning Poker** kết hợp với **Story Points** để ước lượng nỗ lực một cách tương đối thay vì dùng COCOMO thuần túy (vì COCOMO yêu cầu biết trước số dòng code KLOC, thứ cực kỳ khó đoán định ở giai đoạn đầu của dự án AI).
  * Nhóm lấy tính năng "Auth (Đăng nhập/Đăng ký)" làm mốc chuẩn (độ khó = 2 Story Points). Sau đó các thành viên so sánh tính năng khác với mốc này để gán điểm (ví dụ: "Pipeline AI" có độ khó gấp nhiều lần $\to$ 8 Story Points).
  * Sau Sprint 1 và 2, nhóm đo được **Velocity (Vận tốc của nhóm)** khoảng 20 Story Points/Sprint, từ đó PM dễ dàng dự báo được các tính năng trong Product Backlog cần bao nhiêu Sprint để hoàn thành và lập lịch biểu thực tế.

---

## Chủ đề 2: Kỹ nghệ Yêu cầu (Requirements Engineering)

### 💬 Câu 5: Hãy phân biệt Yêu cầu chức năng (FR) và Yêu cầu phi chức năng (NFR) trong StoryLens. Cho ví dụ cụ thể.
* **Trả lời:**
  * **Yêu cầu chức năng (FR):** Mô tả những hành vi hay chức năng cụ thể mà hệ thống bắt buộc phải thực hiện.
    * *Ví dụ:* Người dùng có thể kéo thả ảnh manga lên để hệ thống tự động nhận dạng và dịch; Người dùng có thể nhập câu hỏi để AI giải đáp về cốt truyện thông qua ô chat RAG.
  * **Yêu cầu phi chức năng (NFR):** Mô tả các ràng buộc về chất lượng, vận hành và hiệu năng của hệ thống.
    * *Ví dụ:* 
      * *Hiệu năng (Performance):* Thời gian xử lý AI cho mỗi trang truyện (YOLO + OCR + LaMa + Gemini) phải dưới 30 giây trong điều kiện mạng ổn định.
      * *Bảo mật (Security):* Token/Session đăng nhập của người dùng phải được lưu trữ trong Cookie HttpOnly để chống tấn công XSS đánh cắp token.
      * *Độ sẵn sàng (Availability):* Hệ thống có cơ chế keep-alive để hạn chế cold start của các service chạy trên cloud miễn phí dưới 5 giây.

### 💬 Câu 6: Trong sơ đồ Use Case của nhóm, mối quan hệ `<<include>>` và `<<extend>>` được thể hiện như thế nào? Hãy lấy ví dụ thực tế.
* **Trả lời:**
  * **`<<include>>` (Bắt buộc):** Dùng khi một use case luôn chứa hành vi của một use case khác.
    * *Ví dụ:* Use case **"Dịch một chương truyện (Batch)"** luôn bắt buộc phải gọi use case **"Trừ credit tài khoản"** và use case **"Dịch một trang truyện"** liên tiếp. Không thể dịch truyện mà không qua bước kiểm tra/trừ credit.
  * **`<<extend>>` (Tùy chọn/Có điều kiện):** Dùng để mô tả hành vi chỉ xảy ra dưới một số điều kiện nhất định.
    * *Ví dụ:* Use case **"Hiệu đính bản dịch (Studio QC)"** mở rộng use case **"Đọc truyện (Reader)"**. Người dùng đang đọc truyện thông thường, chỉ khi họ phát hiện lỗi dịch và có quyền chỉnh sửa, họ mới kích hoạt tính năng mở Studio QC để sửa text đè lên bong bóng thoại.

### 💬 Câu 7: Giải thích kịch bản ngoại lệ (Exception Flow) của use case "Đặt dịch vụ/Thanh toán gói credit" khi Stripe bị lỗi hoặc kết nối mạng bị ngắt giữa chừng.
* **Trả lời:**
  * Khi người dùng nhấn "Thanh toán" ở frontend, hệ thống sẽ gửi request kèm theo một **Idempotency Key (Khóa bất biến)**.
  * Nếu Stripe phản hồi lỗi hoặc mạng bị ngắt đột ngột:
    * *Ngoại lệ xử lý:* Backend nhận diện được kết nối bị đứt. Nhờ Idempotency Key, nếu người dùng bấm nút retry nhiều lần, backend chỉ thực hiện gọi giao dịch đến Stripe đúng một lần, tránh việc trừ tiền 2 lần của khách hàng (Double-spending).
    * *Phản hồi UI:* Frontend nhận mã lỗi ngoại lệ, hiển thị toast thông báo "Giao dịch đang được xác thực, vui lòng không tải lại trang" và hoàn lại giao diện an toàn nếu giao dịch thất bại.

---

## Chủ đề 3: Kiến trúc Phần mềm & Cơ sở dữ liệu (Architecture & DB)

### 💬 Câu 8: Tại sao nhóm chọn kiến trúc tách rời (Microservice) giữa Frontend, Backend và AI Module? Nó có ưu nhược điểm gì?
* **Trả lời:**
  * **Lý do chọn:** Các thư viện AI như PyTorch, các model YOLOv8 và manga-ocr có kích thước rất nặng (~4GB Docker Image) và tiêu tốn nhiều tài nguyên RAM/GPU khi inference. Backend API (FastAPI) và Frontend (Next.js) thì nhẹ và cần phản hồi nhanh. Nếu gộp chung, việc deploy lên các nền tảng đám mây sẽ rất đắt và chậm.
  * **Ưu điểm:**
    * Cô lập lỗi: Nếu AI Module bị sập do tràn RAM khi chạy batch, server backend và frontend vẫn hoạt động bình thường, người dùng vẫn đọc được các truyện đã dịch sẵn và thảo luận trên forum.
    * Scale độc lập: Có thể dễ dàng đem AI Module lên chạy GPU trên HuggingFace Spaces/Kaggle, trong khi backend API chạy CPU giá rẻ trên Render.
  * **Nhược điểm:** Tăng độ trễ (latency) do phải giao tiếp qua mạng giữa Backend API và AI Module qua giao thức HTTP. Nhóm khắc phục bằng cách thiết lập giao tiếp **WebSocket** truyền trạng thái tiến trình thời gian thực (ví dụ: *Đang nhận diện chữ... 30%*, *Đang dịch... 60%*) để người dùng không có cảm giác phải chờ đợi vô định.

### 💬 Câu 9: Tại sao nhóm nói Pipeline xử lý ảnh manga là kiến trúc "Đường ống và bộ lọc" (Pipe-and-Filter)?
* **Trả lời:**
  * Mỗi bước xử lý ảnh trong pipeline hoạt động như một **Bộ lọc (Filter)** độc lập nhận dữ liệu vào, biến đổi và xuất dữ liệu ra:
    1. *Filter 1 (YOLOv8):* Nhận ảnh gốc $\to$ Xuất tọa độ bong bóng thoại.
    2. *Filter 2 (manga-ocr):* Nhận vùng ảnh bong bóng thoại $\to$ Xuất văn bản tiếng Nhật/Trung gốc.
    3. *Filter 3 (LaMa Inpainting):* Nhận ảnh gốc + tọa độ bong bóng $\to$ Xuất ảnh sạch nền (đã xóa chữ).
    4. *Filter 4 (Gemini):* Nhận text gốc + ngữ cảnh toàn trang $\to$ Xuất text tiếng Việt.
    5. *Filter 5 (Render Engine):* Nhận ảnh sạch nền + text tiếng Việt $\to$ Xuất ảnh manga đã dịch hoàn chỉnh.
  * Dữ liệu được truyền tải tuần tự giữa các bộ lọc này thông qua các **Đường ống (Pipes)** là các API request/response nội bộ.

### 💬 Câu 10: Tính năng hỏi đáp RAG hoạt động thế nào trên Cơ sở dữ liệu? Làm sao đảm bảo người dùng A không truy vấn được nội dung truyện riêng tư của người dùng B?
* **Trả lời:**
  * **Cách thức hoạt động:** Các đoạn hội thoại tiếng Việt sau khi dịch được chuyển thành vector embedding (768 chiều) bằng mô hình embedding của Gemini và lưu vào bảng CSDL Postgres hỗ trợ extension `pgvector`. Khi người dùng đặt câu hỏi, câu hỏi cũng được vector hóa, sau đó backend thực hiện tìm kiếm độ tương đồng Cosine (Cosine Similarity) để lấy ra các đoạn hội thoại liên quan nhất làm ngữ cảnh (context) đưa vào Gemini sinh câu trả lời.
  * **Bảo mật phân quyền:** Nhóm thiết lập chính sách **Row Level Security (RLS)** trên Supabase Postgres. Mỗi bảng lưu trữ thông tin trang truyện và vector embedding đều có trường `owner_id`. Câu lệnh query SQL luôn tự động ép thêm điều kiện `WHERE owner_id = auth.uid()` hoặc sử dụng policy của Supabase, ngăn chặn tuyệt đối việc rò rỉ dữ liệu chéo giữa các tài khoản.

---

## Chủ đề 4: Quy trình Học máy & Đánh giá mô hình AI (ML Workflow & Evaluation)

### 💬 Câu 11: Hãy nêu 8 bước của ML Workflow mà nhóm đã áp dụng khi tích hợp mô hình phát hiện bong bóng thoại YOLOv8.
* **Trả lời:**
  1. **Requirements:** Xác định bài toán phát hiện bong bóng thoại manga, đầu ra là các bounding box, mục tiêu độ chính xác mAP@0.5 đạt trên 85%.
  2. **Data Collection & Preparation:** Thu thập dữ liệu từ bộ Manga109-s, chuẩn hóa ảnh về kích thước $640 \times 640$, gán nhãn bong bóng thoại dạng YOLO.
  3. **Feature Engineering:** Trích xuất đặc trưng hình ảnh tự động qua các tầng Convolutional của backbone YOLOv8.
  4. **Model Training:** Tiến hành huấn luyện mô hình YOLOv8 trên GPU.
  5. **Model Evaluation:** Đánh giá độ chính xác trên tập test offline (đạt mAP@0.5 = 95.3% và Precision = 97.3%).
  6. **Model Deployment:** Đóng gói mô hình thành Docker Image chạy FastAPI server và deploy lên HuggingFace Spaces.
  7. **Model Operating & Monitoring:** Backend giám sát thời gian xử lý của mô hình, lưu log các ca lỗi nhận diện bong bóng để phân tích.
  8. **Model Maintenance:** Từ các ca lỗi (bong bóng dị hình, truyện cổ điển), nhóm thu thập thêm dữ liệu khó để gán nhãn bổ sung và tiến hành huấn luyện lại (retrain) mô hình.

### 💬 Câu 12: Hãy giải thích ý nghĩa toán học của các metric Precision và mAP@0.5 dùng để đánh giá YOLOv8.
* **Trả lời:**
  * **Precision (Độ chính xác):** Đo tỷ lệ số bong bóng thoại dự đoán đúng trên tổng số bong bóng hệ thống phát hiện ra:
    $$\text{Precision} = \frac{TP}{TP + FP}$$
    *(Với TP là phát hiện đúng bong bóng thật, FP là phát hiện nhầm các vùng ảnh không phải bong bóng).* Precision đạt **97.3%** nghĩa là hệ thống cực kỳ ít khi vẽ nhầm khung dịch vào các chi tiết phong cảnh.
  * **mAP@0.5 (Mean Average Precision tại ngưỡng IoU = 0.5):** 
    * Đầu tiên, tính chỉ số **IoU (Intersection over Union)**: diện tích phần giao nhau chia cho diện tích phần hợp của khung dự đoán và khung thật. Nếu IoU $\ge$ 0.5 thì tính là dự đoán đúng.
    * mAP@0.5 là trung bình cộng của Average Precision trên toàn bộ các lớp (ở đây lớp duy nhất là "bong bóng thoại") tại ngưỡng IoU này. Chỉ số đạt **95.3%** chứng minh mô hình định vị khung thoại cực kỳ sát và bao phủ trọn vẹn văn bản gốc.

### 💬 Câu 13: Mô hình manga-ocr được đánh giá thế nào? Chỉ số CER hoạt động ra sao?
* **Trả lời:**
  * Mô hình nhận dạng ký tự tiếng Nhật/Trung (**manga-ocr**) được nhóm đánh giá bằng chỉ số **CER (Character Error Rate - Tỷ lệ lỗi ký tự)**:
    $$\text{CER} = \frac{S + D + I}{N}$$
    *Trong đó: $S$ là số ký tự bị thay thế sai, $D$ là số ký tự bị bỏ sót (xóa), $I$ là số ký tự bị chèn thừa, và $N$ là tổng số ký tự của nhãn chuẩn gốc.*
  * Chỉ số CER đạt **6.1%** nghĩa là trong 100 chữ tiếng Nhật gốc, mô hình chỉ nhận diện sai khoảng 6 ký tự. Đây là tỷ lệ cực kỳ nhỏ và hoàn toàn có thể được bù đắp bởi khả năng tự suy luận ngữ cảnh khi đưa vào Gemini dịch ở bước sau.

---

## Chủ đề 5: Lập trình thời AI (Vibe Coding, Linter & Typecheck)

### 💬 Câu 14: Nhóm bạn đã dùng AI Assistant để sinh code (Vibe Coding). Vậy làm thế nào nhóm kiểm soát chất lượng code để tránh lỗi "đập chuột chũi" (Whack-a-mole loop)?
* **Trả lời:**
  * Lạm dụng AI sinh code dễ dẫn đến suy thoái kiến trúc phần mềm và lỗi lan truyền (sửa A hỏng B). Để kiểm soát, nhóm áp dụng triết lý **Vibe Engineering** bằng cách dựng sẵn một bộ khung bảo vệ tự động (**Guardrails/Harness**):
    1. *Phân tích tĩnh:* Ép kiểu chặt chẽ bằng TypeScript (`tsc --noEmit`) kết hợp ESLint để phát hiện ngay lập tức các đoạn code AI sinh bị thiếu import, sai tên hàm hoặc sai kiểu dữ liệu.
    2. *Hệ thống kiểm thử tự động (CI/CD Gates):* Thiết lập GitHub Actions tự động chạy **5 job song song** mỗi khi có commit mới. Hệ thống sẽ tự động chạy toàn bộ unit test (Vitest ở frontend, pytest ở backend) và E2E test (Playwright) để quét lỗi. Nếu AI sinh code làm hỏng bất kỳ tính năng cũ nào, hệ thống CI sẽ báo đỏ và chặn không cho merge code.

### 💬 Câu 15: Phân biệt vai trò của Linter và Typecheck trong quá trình phát triển dự án StoryLens.
* **Trả lời:**
  * **Linter (ESLint):** Đóng vai trò là "người sửa lỗi hành vi và định dạng". Nó bắt các lỗi như: biến khai báo nhưng không dùng, thiếu dấu ngoặc, hoặc code viết không đúng chuẩn Clean Code. Giúp mã nguồn sạch và đồng bộ.
  * **Typecheck (TypeScript Compiler - `tsc`):** Đóng vai trò là "người gác cổng tính đúng đắn của kiểu dữ liệu". Nó đảm bảo cấu trúc dữ liệu truyền qua lại giữa các hàm hoặc gọi API từ backend gửi lên frontend phải khớp 100%. Ví dụ, nếu backend đổi kiểu trả về của API credits từ `number` thành `string`, Typecheck ở frontend sẽ lập tức báo lỗi đỏ ngay khi build, ngăn chặn lỗi crash trang web.

---

## Chủ đề 6: Thiết kế Giao diện (UI/UX Design)

### 💬 Câu 16: Hãy trình bày cách StoryLens ứng dụng các nguyên lý UI/UX: Nhất quán (Consistency) và Sự đa dạng người dùng (User Diversity).
* **Trả lời:**
  * **Tính nhất quán (Consistency):** Nhóm xây dựng một Design System đồng nhất bằng Tailwind/CSS Variable. Toàn bộ các trang từ Library, Forum đến Studio đều sử dụng chung bảng màu HSL, chung kiểu bo góc nút bấm (rounded corners) và font chữ không chân (Inter/Outfit). Trạng thái tải (loading skeletons) và thông báo lỗi (toasts) đều hoạt động đồng bộ.
  * **Sự đa dạng người dùng (User Diversity):**
    * *Người dùng phổ thông (Novice):* Giao diện đọc truyện tối giản cực kỳ trực quan, hỗ trợ vuốt chạm trên mobile, phóng to thu nhỏ ảnh, chuyển đổi nhanh giữa các theme đọc (Light/Dark/Sepia) để chống mỏi mắt.
    * *Người dùng nâng cao/Dịch giả (Expert):* Hệ thống cung cấp giao diện **Studio QC**. Giao diện này cung cấp phím tắt, bảng công cụ điều chỉnh tọa độ bong bóng thoại, thay đổi trực tiếp font chữ, cỡ chữ của text dịch và tích hợp bộ từ điển tra cứu nhanh từng từ vựng tiếng Nhật.

---

## Chủ đề 7: Quy trình Kiểm thử & Báo cáo chất lượng (Testing & QA)

### 💬 Câu 17: Phân biệt Verification và Validation trong thực tế kiểm thử đồ án StoryLens. Nhóm bạn đã làm gì cho mỗi phần?
* **Trả lời:**
  * **Verification (Thẩm tra - "Làm sản phẩm đúng đặc tả"):**
    * *Thực tế:* Nhóm cài đặt CI chạy tự động kiểm tra code. Viết unit test bằng Vitest và pytest để đảm bảo các module hoạt động đúng đặc tả chức năng thiết kế (ví dụ: đăng ký mật khẩu yếu bị chặn, nạp tiền đúng thì cộng credits đúng).
  * **Validation (Thẩm định - "Làm đúng sản phẩm khách hàng cần"):**
    * *Thực tế:* Nhóm chạy các kịch bản kiểm thử E2E bằng **Playwright** mô phỏng hành trình người dùng thực tế và trực tiếp mở các đợt chạy thử nghiệm (Beta testing) mời bạn bè, những người đam mê đọc manga trải nghiệm hệ thống và góp ý để tinh chỉnh UI/UX.

### 💬 Câu 18: Hãy so sánh kiểm thử tự động E2E bằng Playwright và kịch bản chạy trên Katalon Studio trong đồ án. Tại sao nhóm dùng cả hai?
* **Trả lời:**
  * **Playwright:** Được tích hợp trực tiếp vào **CI/CD** của nhóm trên GitHub Actions. Playwright chạy ở chế độ không giao diện (headless) cực kỳ nhanh trên máy chủ ảo của GitHub mỗi khi push code để đảm bảo code không có lỗi hồi quy (regression) và giữ vững tính ổn định kỹ thuật của sản phẩm.
  * **Katalon Studio:** Dùng để hiện thực **báo cáo kiểm thử tự động của môn học (PA5)**. QA của nhóm dùng Katalon Studio để kéo thả, ghi lại kịch bản (record/playback) cho hai use case cốt lõi là `UC01` và `UC02`. Nó xuất ra các tài liệu kiểm thử trực quan bằng hình ảnh, video và file HTML báo cáo phục vụ cho việc chấm điểm học thuật của môn học Công nghệ Phần mềm.
  * **Sự bổ trợ:** Playwright giúp đội dev bảo vệ code ở môi trường phát triển (CI/CD), còn Katalon giúp QA tạo lập báo cáo kiểm thử tự động chuyên nghiệp cho môn học.

---

## Chủ đề 8: Bảo mật & Đạo đức AI (Security & AI Ethics)

### 💬 Câu 19: Lỗ hổng SSRF là gì? Tại sao StoryLens có nguy cơ bị SSRF và nhóm đã phòng chống như thế nào?
* **Trả lời:**
  * **SSRF (Server-Side Request Forgery)** xảy ra khi kẻ tấn công gửi một URL nội bộ (ví dụ: `http://127.0.0.1:8000/admin` hoặc `http://192.168.1.1`) và lừa server backend thực hiện request tải dữ liệu từ địa chỉ đó, từ đó kẻ tấn công có thể quét cổng nội bộ hoặc đánh cắp thông tin nhạy cảm phía sau tường lửa.
  * **Nguy cơ của StoryLens:** Hệ thống có tính năng "Import from source" cho phép người dùng nhập link ảnh manga từ các trang web khác để dịch. Server backend bắt buộc phải tải ảnh từ link người dùng nhập về.
  * **Cách phòng chống:** Backend áp dụng cơ chế **Domain Allowlist (Danh sách miền cho phép)**. Backend chỉ thực hiện tải ảnh từ các domain truyện lớn đã được kiểm duyệt an toàn (như MangaDex). Mọi URL trỏ về IP nội bộ hoặc domain lạ ngoài whitelist đều bị chặn ngay lập tức ở tầng kiểm định.

### 💬 Câu 20: Hãy giải thích cách StoryLens bảo vệ thông tin đăng nhập của người dùng khỏi tấn công XSS.
* **Trả lời:**
  * Nếu lưu Token đăng nhập (JWT) trong `LocalStorage` hoặc `SessionStorage`, kẻ tấn công có thể dùng mã độc JavaScript (XSS) để đọc và đánh cắp token dễ dàng.
  * Nhóm giải quyết bằng cách lưu JWT token vào **HttpOnly Cookie** ở phía Backend gửi về. Thuộc tính `HttpOnly` ngăn chặn hoàn toàn JavaScript tiếp cận cookie này. Đồng thời nhóm bật thuộc tính `Secure` (chỉ gửi qua HTTPS) và `SameSite=Strict` để phòng chống tấn công giả mạo yêu cầu chéo trang (CSRF).

### 💬 Câu 21: Về mặt đạo đức AI (AI Ethics), làm thế nào đồ án StoryLens giải quyết vấn đề bản quyền tác giả truyện manga?
* **Trả lời:**
  * Bản quyền là vấn đề nhạy cảm nhất đối với các ứng dụng dịch thuật. StoryLens giải quyết bằng hai cơ chế:
    1. *Cô lập thư viện đọc:* Mặc định các chương truyện do người dùng tải lên dịch đều ở chế độ **riêng tư (Private)**, chỉ tài khoản đó được đọc và hỏi đáp RAG. Hệ thống không tự động chia sẻ công khai.
    2. *Quy trình DMCA/Copyright Take-down:* Nhóm xây dựng trang chính sách bản quyền công khai. Các tác giả hoặc nhà phát hành có bản quyền có thể gửi yêu cầu gỡ bỏ trực tiếp qua biểu mẫu báo cáo. Admin hệ thống có quyền khóa/xóa ngay lập tức các chương truyện vi phạm bản quyền khỏi thư viện công cộng.

---

## Chủ đề 9: Vận hành & Giám sát hệ thống (DevOps Monitoring — LN11)

> *Tương ứng LN11 — Test Automation & DevOps. Vòng lặp DevOps không dừng ở bước "Deploy" mà tiếp tục sang **Operate → Monitor** rồi quay lại Develop. Đây là phần StoryLens thực thi đầy đủ nhưng chưa được đề cập trong các câu hỏi trước.*

### 💬 Câu 22: Vòng lặp DevOps của StoryLens trông như thế nào? Sau khi Deploy lên Vercel/Render, nhóm giám sát hệ thống bằng cách nào?
* **Trả lời:**
  * Vòng lặp DevOps của nhóm: **Develop → Build → Test → Deploy → Operate → Monitor → (quay lại Develop)**.
  * Sau khi code được merge và CI báo xanh, Vercel (Frontend) và Render (Backend) tự động deploy phiên bản mới. Đây là bước **Operate**.
  * Ở bước **Monitor**, nhóm triển khai 3 tầng giám sát song song:
    1. **Sentry (Error Monitoring):** Tự động bắt mọi exception runtime trên cả Frontend (Next.js server, browser, Edge runtime) và Backend (FastAPI). Khi người dùng gặp lỗi crash màn hình, Sentry gửi alert ngay về dashboard của nhóm kèm stack trace đầy đủ, giúp dev debug mà không cần tái hiện lỗi thủ công.
    2. **OpenTelemetry (Distributed Tracing):** Theo dõi toàn bộ luồng xử lý của một request từ khi vào Backend → gọi AI Module → truy vấn Supabase → trả kết quả. Khi một request xử lý ảnh chậm bất thường, PM có thể dùng OTel để xác định cổ chai (bottleneck) nằm ở đoạn nào trong pipeline.
    3. **Structured Logging + Request ID:** Mỗi HTTP request được middleware gán một UUID duy nhất (`X-Request-ID`). UUID này xuất hiện trong mọi dòng log liên quan → khi cần debug một request cụ thể của người dùng, chỉ cần filter log theo Request ID là ra toàn bộ trace.

### 💬 Câu 23: Audit Log là gì? Tại sao StoryLens cần lưu Audit Log riêng cho admin?
* **Trả lời:**
  * **Audit Log (Nhật ký kiểm toán)** là bản ghi cấu trúc ghi lại *ai đã làm gì, lúc mấy giờ, trên dữ liệu nào* — thường dùng để điều tra sự cố bảo mật và chứng minh tuân thủ quy định (compliance).
  * **Trong StoryLens:** Module `backend/app/routers/admin/` có router `audit.py` và hàm `audit()` trong `deps.py`. Mỗi khi admin thực hiện hành động nhạy cảm (khóa tài khoản, xóa nội dung vi phạm, điều chỉnh credits), một row được ghi vào bảng **`admin_audit_log`** trong Supabase Postgres bao gồm: `admin_user_id`, `action`, `target_id`, `timestamp`.
  * **Tại sao cần?** Vì admin có quyền năng rất cao (xóa dữ liệu người dùng, thay đổi số credits). Audit Log đảm bảo nếu có tranh chấp ("Ai đã xóa chương truyện của tôi?"), nhóm phát triển có bằng chứng điều tra cụ thể theo từng hành động và thời điểm thực hiện.

### 💬 Câu 24: Sentry và OpenTelemetry đều nói về "giám sát hệ thống". Hai công cụ này khác nhau thế nào?
* **Trả lời:**

  | Tiêu chí | Sentry (Error Monitoring) | OpenTelemetry (Distributed Tracing) |
  |---|---|---|
  | **Tập trung vào** | *Lỗi (Errors & Exceptions)* — bắt khi hệ thống bị crash | *Hiệu năng (Performance)* — theo dõi luồng xử lý bình thường |
  | **Câu hỏi trả lời** | "Hệ thống đang bị lỗi gì? Ở dòng code nào?" | "Request này chạy mất bao lâu? Chậm ở bước nào?" |
  | **Dữ liệu sinh ra** | Stack trace, breadcrumb, context người dùng | Span (đoạn thời gian), Trace (chuỗi span), Metrics |
  | **Trong StoryLens** | Frontend: 3 config (server/client/edge). Backend: `observability.py` | Backend: `observability.py` dùng `FastAPIInstrumentor` và `HTTPXClientInstrumentor` |
  | **Bật khi nào** | Có `SENTRY_DSN` env var | Có `OTEL_EXPORTER_OTLP_ENDPOINT` env var |

  * **Tóm lại:** Sentry là "bác sĩ cấp cứu" — bắt sự cố ngay khi xảy ra. OpenTelemetry là "bác sĩ chẩn đoán" — phân tích hiệu năng hệ thống tổng thể.

---

## Chủ đề 10: Đạo đức AI chuyên sâu (AI Ethics — LN12)

> *Tương ứng LN12 — AI Ethics. Môn học đặt ra 11 vấn đề đạo đức của AI. Câu hỏi phản biện thường yêu cầu nhóm liên hệ từng vấn đề đạo đức vào sản phẩm cụ thể của nhóm.*

### 💬 Câu 25: Liệt kê 11 vấn đề đạo đức AI theo LN12 và cho biết StoryLens liên quan đến những vấn đề nào? Nhóm đã giải quyết chúng ra sao?
* **Trả lời — 11 vấn đề đạo đức AI (theo Sommerville & slide LN12):**

  | # | Vấn đề | Liên quan StoryLens? | Giải pháp nhóm |
  |---|---|---|---|
  | 1 | **Privacy & Surveillance** (Riêng tư & Giám sát) | ✅ **Có** | Trang `privacy/page.tsx` công khai rõ data nào được thu. Sentry cấu hình `send_default_pii=False` — không log thông tin cá nhân. Thư viện mặc định **Private**. |
  | 2 | **Unemployment** (Thất nghiệp) | ⚠️ Tiềm năng | Dịch tự động có thể ảnh hưởng dịch giả cộng đồng. Nhóm định vị StoryLens là **công cụ hỗ trợ dịch giả** (assistive tool), không phải thay thế. Studio QC cho phép dịch giả chỉnh sửa tay. |
  | 3 | **Inequality** (Bất bình đẳng) | ⚠️ Nhẹ | Hệ thống credits trả phí có thể tạo bất bình đẳng. Nhóm có gói free tier và giới hạn credits miễn phí cho người dùng mới. |
  | 4 | **Manipulation of Human Behavior** (Thao túng) | ✅ **Có** | AI dịch tự động không chèn quảng cáo hay nội dung lệch hướng vào bản dịch. RAG chỉ trả lời câu hỏi về nội dung truyện, không gợi ý mua hàng. |
  | 5 | **Artificial Stupidity** (Sự "ngu" của máy) | ✅ **Có** | OCR (manga-ocr) có CER 6.1%, có thể đọc sai chữ. Nhóm dùng Gemini LLM để tự sửa lỗi theo ngữ cảnh. Giao diện Studio QC cho dịch giả kiểm tra và chỉnh sửa thủ công. |
  | 6 | **Opacity** (Mờ đục/Hộp đen) | ✅ **Có** | Pipeline AI (YOLO → OCR → LaMa → Gemini) là hộp đen với người dùng. Nhóm giải quyết bằng **transparency**: mỗi bước xử lý đều có status log rõ ràng trả về frontend, hiển thị cho người dùng theo dõi tiến trình. |
  | 7 | **AI Bias** (Thiên lệch AI) | ✅ **Có** | Dữ liệu huấn luyện YOLO chủ yếu là manga Nhật bản và Manga109. Có thể hoạt động kém hơn với manhwa Hàn hoặc manhua Trung. Nhóm ghi nhận đây là hạn chế và hướng cải thiện trong tương lai (fine-tune thêm dataset đa dạng). |
  | 8 | **Security** (An ninh) | ✅ **Có** | HttpOnly Cookie chống XSS, CSRF middleware, RLS chống data leak, SSRF Domain Allowlist, Security Headers middleware. |
  | 9 | **Evil Genies** (Hậu quả ngoài ý muốn) | ⚠️ Nhẹ | Tính năng dịch có thể bị lạm dụng để dịch và phát tán nội dung vi phạm bản quyền hàng loạt. Nhóm phòng chống bằng rate limiting, credits system và quy trình DMCA take-down. |
  | 10 | **Robot Rights** (Quyền của Robot) | ❌ Không áp dụng | Không liên quan trực tiếp đến đồ án này. |
  | 11 | **Singularity & Superintelligence** | ❌ Không áp dụng | Không liên quan trực tiếp đến đồ án này. |

### 💬 Câu 26: Vấn đề "Opacity" (mờ đục) của AI là gì? StoryLens giải quyết thế nào để người dùng tin tưởng vào kết quả dịch của hệ thống?
* **Trả lời:**
  * **Opacity (Sự mờ đục):** AI, đặc biệt là Deep Learning, hoạt động như "hộp đen" — người dùng đưa ảnh vào, nhận bản dịch ra nhưng không biết tại sao hệ thống dịch như vậy, không biết bước nào gặp vấn đề nếu kết quả sai. Điều này gây ra thiếu **transparency** và **accountability** — không ai chịu trách nhiệm nếu bản dịch sai nghĩa.
  * **StoryLens giải quyết bằng 3 cơ chế:**
    1. **Progress Tracking (Theo dõi tiến trình):** Frontend hiển thị rõ trạng thái từng bước pipeline: "Đang phát hiện bong bóng thoại...", "Đang nhận diện ký tự...", "Đang dịch bằng AI..." — người dùng biết hệ thống đang làm gì, không bị mù thông tin.
    2. **Studio QC (Kiểm soát chất lượng thủ công):** Toàn bộ kết quả dịch của AI đều có thể được dịch giả xem lại và chỉnh sửa trực tiếp trong giao diện Studio trước khi lưu. AI không có quyền phán quyết cuối cùng — con người mới là người quyết định.
    3. **Structured Logging:** Mọi hành động của hệ thống đều được ghi log có cấu trúc. Nếu kết quả sai, dev có thể trace lại chính xác bước nào trong pipeline AI đã gặp vấn đề.

### 💬 Câu 27: Vấn đề AI Bias (thiên lệch AI) trong StoryLens là gì? Nhóm nhận ra và xử lý thế nào?
* **Trả lời:**
  * **Bias xuất hiện ở đâu:** Mô hình YOLOv8 được fine-tune chủ yếu trên dataset **Manga109** — một bộ dữ liệu manga Nhật Bản. Điều này tạo ra **historical bias / distribution bias** trong dữ liệu huấn luyện: hệ thống giỏi phát hiện bong bóng thoại kiểu Nhật (thường tròn, nét rõ, nền trắng) nhưng hoạt động kém hơn với phong cách bong bóng thoại kiểu Hàn (manhwa) hoặc Trung (manhua) có thiết kế bố cục khác biệt.
  * **Hậu quả thực tế:** Người dùng manhwa Hàn Quốc sẽ thấy hệ thống bỏ sót nhiều hộp thoại hoặc phát hiện sai vùng, dẫn đến bản dịch thiếu sót — đây là bất bình đẳng dịch vụ dựa trên nguồn gốc nội dung.
  * **Cách nhóm xử lý:**
    * *Ngắn hạn:* Ghi nhận giới hạn rõ ràng trong tài liệu và trang sản phẩm để người dùng biết trước.
    * *Dài hạn:* Hướng phát triển tương lai là bổ sung thêm dữ liệu manhwa và manhua vào tập huấn luyện để giảm bias phân phối, hướng đến mô hình đa ngôn ngữ và đa phong cách thực sự công bằng.
  * **Nguyên tắc:** Theo LN12, nguyên tắc "Principles alone cannot guarantee ethical AI" — nhóm không chỉ nói "chúng tôi cố gắng công bằng" mà phải có **thiết kế kỹ thuật** (ghi nhận bias, đo lường kết quả trên tập test đa dạng) để thực sự kiểm soát bias.

---

*Tài liệu được tổng hợp và bổ sung bởi team StoryLens — phục vụ ôn tập bảo vệ đồ án môn CSC13002 (VNUHCM-US).*

