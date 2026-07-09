# 🎓 BỘ CÂU HỎI VẤN ĐÁP BẢO VỆ ĐỒ ÁN - STORYLENS
**Môn học: Nhập môn Công nghệ phần mềm (CSC13002) — VNUHCM-US**
**Thiết kế dưới dạng câu hỏi - trả lời trực tiếp giữa Hội đồng chấm thi và Nhóm phát triển**

---

## 📑 MỤC LỤC
1. [Chủ đề 1: Quy trình Phát triển phần mềm (Agile/Scrum & RUP)](#chủ-đề-1-quy-trình-phát-triển-phần-mềm-agilescrum--rup)
2. [Chủ đề 2: Kỹ nghệ Yêu cầu (Requirements Engineering)](#chủ-đề-2-kỹ-nghệ-yêu-cầu-requirements-engineering)
3. [Chủ đề 3: Kiến trúc Phần mềm & Cơ sở dữ liệu (Architecture & DB)](#chủ-đề-3-kiến-trúc-phần-mềm--cơ-sở-dữ-liệu-architecture--db)
4. [Chủ đề 4: Quy trình Học máy & Tích hợp AI (ML Workflow)](#chủ-đề-4-quy-trình-học-máy--tích-hợp-ai-ml-workflow)
5. [Chủ đề 5: Lập trình thời AI (Vibe Coding & Guardrails)](#chủ-đề-5-lập-trình-thời-ai-vibe-coding--guardrails)
6. [Chủ đề 6: Thiết kế Giao diện (UI/UX Design)](#chủ-đề-6-thiết-kế-giao-diện-uiux-design)
7. [Chủ đề 7: Kiểm thử phần mềm & Đảm bảo Chất lượng (Testing & QA)](#chủ-đề-7-kiểm-thự-phần-mềm--đảm-bảo-chất-lượng-testing--qa)
8. [Chủ đề 8: Bảo mật & Đạo đức AI (Security & AI Ethics)](#chủ-đề-8-bảo-mật--đạo-đức-ai-security--ai-ethics)

---

## Chủ đề 1: Quy trình Phát triển phần mềm (Agile/Scrum & RUP)

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

---

## Chủ đề 2: Kỹ nghệ Yêu cầu (Requirements Engineering)

### 💬 Câu 4: Hãy phân biệt Yêu cầu chức năng (FR) và Yêu cầu phi chức năng (NFR) trong StoryLens. Cho ví dụ cụ thể.
* **Trả lời:**
  * **Yêu cầu chức năng (FR):** Mô tả những hành vi hay chức năng cụ thể mà hệ thống bắt buộc phải thực hiện.
    * *Ví dụ:* Người dùng có thể kéo thả ảnh manga lên để hệ thống tự động nhận dạng và dịch; Người dùng có thể nhập câu hỏi để AI giải đáp về cốt truyện thông qua ô chat RAG.
  * **Yêu cầu phi chức năng (NFR):** Mô tả các ràng buộc về chất lượng, vận hành và hiệu năng của hệ thống.
    * *Ví dụ:* 
      * *Hiệu năng (Performance):* Thời gian xử lý AI cho mỗi trang truyện (YOLO + OCR + LaMa + Gemini) phải dưới 30 giây trong điều kiện mạng ổn định.
      * *Bảo mật (Security):* Token/Session đăng nhập của người dùng phải được lưu trữ trong Cookie HttpOnly để chống tấn công XSS đánh cắp token.
      * *Độ sẵn sàng (Availability):* Hệ thống có cơ chế keep-alive để hạn chế cold start của các service chạy trên cloud miễn phí dưới 5 giây.

### 💬 Câu 5: Trong sơ đồ Use Case của nhóm, mối quan hệ `<<include>>` và `<<extend>>` được thể hiện như thế nào? Hãy lấy ví dụ thực tế.
* **Trả lời:**
  * **`<<include>>` (Bắt buộc):** Dùng khi một use case luôn chứa hành vi của một use case khác.
    * *Ví dụ:* Use case **"Dịch một chương truyện (Batch)"** luôn bắt buộc phải gọi use case **"Trừ credit tài khoản"** và use case **"Dịch một trang truyện"** liên tiếp. Không thể dịch truyện mà không qua bước kiểm tra/trừ credit.
  * **`<<extend>>` (Tùy chọn/Có điều kiện):** Dùng để mô tả hành vi chỉ xảy ra dưới một số điều kiện nhất định.
    * *Ví dụ:* Use case **"Hiệu đính bản dịch (Studio QC)"** mở rộng use case **"Đọc truyện (Reader)"**. Người dùng đang đọc truyện thông thường, chỉ khi họ phát hiện lỗi dịch và có quyền chỉnh sửa, họ mới kích hoạt tính năng mở Studio QC để sửa text đè lên bong bóng thoại.

### 💬 Câu 6: Giải thích kịch bản ngoại lệ (Exception Flow) của use case "Đặt dịch vụ/Thanh toán gói credit" khi Stripe bị lỗi hoặc kết nối mạng bị ngắt giữa chừng.
* **Trả lời:**
  * Khi người dùng nhấn "Thanh toán" ở frontend, hệ thống sẽ gửi request kèm theo một **Idempotency Key (Khóa bất biến)**.
  * Nếu Stripe phản hồi lỗi hoặc mạng bị ngắt đột ngột:
    * *Ngoại lệ xử lý:* Backend nhận diện được kết nối bị đứt. Nhờ Idempotency Key, nếu người dùng bấm nút retry nhiều lần, backend chỉ thực hiện gọi giao dịch đến Stripe đúng một lần, tránh việc trừ tiền 2 lần của khách hàng (Double-spending).
    * *Phản hồi UI:* Frontend nhận mã lỗi ngoại lệ, hiển thị toast thông báo "Giao dịch đang được xác thực, vui lòng không tải lại trang" và hoàn lại giao diện an toàn nếu giao dịch thất bại.

---

## Chủ đề 3: Kiến trúc Phần mềm & Cơ sở dữ liệu (Architecture & DB)

### 💬 Câu 7: Tại sao nhóm chọn kiến trúc tách rời (Microservice) giữa Frontend, Backend và AI Module? Nó có ưu nhược điểm gì?
* **Trả lời:**
  * **Lý do chọn:** Các thư viện AI như PyTorch, các model YOLOv8 và manga-ocr có kích thước rất nặng (~4GB Docker Image) và tiêu tốn nhiều tài nguyên RAM/GPU khi inference. Backend API (FastAPI) và Frontend (Next.js) thì nhẹ và cần phản hồi nhanh. Nếu gộp chung, việc deploy lên các nền tảng đám mây sẽ rất đắt và chậm.
  * **Ưu điểm:**
    * Cô lập lỗi: Nếu AI Module bị sập do tràn RAM khi chạy batch, server backend và frontend vẫn hoạt động bình thường, người dùng vẫn đọc được các truyện đã dịch sẵn và thảo luận trên forum.
    * Scale độc lập: Có thể dễ dàng đem AI Module lên chạy GPU trên HuggingFace Spaces/Kaggle, trong khi backend API chạy CPU giá rẻ trên Render.
  * **Nhược điểm:** Tăng độ trễ (latency) do phải giao tiếp qua mạng giữa Backend API và AI Module qua giao thức HTTP. Nhóm khắc phục bằng cách thiết lập giao tiếp **WebSocket** truyền trạng thái tiến trình thời gian thực (ví dụ: *Đang nhận diện chữ... 30%*, *Đang dịch... 60%*) để người dùng không có cảm giác phải chờ đợi vô định.

### 💬 Câu 8: Tại sao nhóm nói Pipeline xử lý ảnh manga là kiến trúc "Đường ống và bộ lọc" (Pipe-and-Filter)?
* **Trả lời:**
  * Mỗi bước xử lý ảnh trong pipeline hoạt động như một **Bộ lọc (Filter)** độc lập nhận dữ liệu vào, biến đổi và xuất dữ liệu ra:
    1. *Filter 1 (YOLOv8):* Nhận ảnh gốc $\to$ Xuất tọa độ bong bóng thoại.
    2. *Filter 2 (manga-ocr):* Nhận vùng ảnh bong bóng thoại $\to$ Xuất văn bản tiếng Nhật/Trung gốc.
    3. *Filter 3 (LaMa Inpainting):* Nhận ảnh gốc + tọa độ bong bóng $\to$ Xuất ảnh sạch nền (đã xóa chữ).
    4. *Filter 4 (Gemini):* Nhận text gốc + ngữ cảnh toàn trang $\to$ Xuất text tiếng Việt.
    5. *Filter 5 (Render Engine):* Nhận ảnh sạch nền + text tiếng Việt $\to$ Xuất ảnh manga đã dịch hoàn chỉnh.
  * Dữ liệu được truyền tải tuần tự giữa các bộ lọc này thông qua các **Đường ống (Pipes)** là các API request/response nội bộ.

### 💬 Câu 9: Tính năng hỏi đáp RAG hoạt động thế nào trên Cơ sở dữ liệu? Làm sao đảm bảo người dùng A không truy vấn được nội dung truyện riêng tư của người dùng B?
* **Trả lời:**
  * **Cách thức hoạt động:** Các đoạn hội thoại tiếng Việt sau khi dịch được chuyển thành vector embedding (768 chiều) bằng mô hình embedding của Gemini và lưu vào bảng CSDL Postgres hỗ trợ extension `pgvector`. Khi người dùng đặt câu hỏi, câu hỏi cũng được vector hóa, sau đó backend thực hiện tìm kiếm độ tương đồng Cosine (Cosine Similarity) để lấy ra các đoạn hội thoại liên quan nhất làm ngữ cảnh (context) đưa vào Gemini sinh câu trả lời.
  * **Bảo mật phân quyền:** Nhóm thiết lập chính sách **Row Level Security (RLS)** trên Supabase Postgres. Mỗi bảng lưu trữ thông tin trang truyện và vector embedding đều có trường `owner_id`. Câu lệnh query SQL luôn tự động ép thêm điều kiện `WHERE owner_id = auth.uid()` hoặc sử dụng policy của Supabase, ngăn chặn tuyệt đối việc rò rỉ dữ liệu chéo giữa các tài khoản.

---

## Chủ đề 4: Quy trình Học máy & Tích hợp AI (ML Workflow)

### 💬 Câu 10: Hãy nêu 8 bước của ML Workflow mà nhóm đã áp dụng khi tích hợp mô hình phát hiện bong bóng thoại YOLOv8.
* **Trả lời:**
  1. **Requirements:** Xác định bài toán phát hiện bong bóng thoại manga, đầu ra là các bounding box, mục tiêu độ chính xác mAP@0.5 đạt trên 85%.
  2. **Data Collection & Preparation:** Thu thập dữ liệu từ bộ Manga109-s, chuẩn hóa ảnh về kích thước $640 \times 640$, gán nhãn bong bóng thoại dạng YOLO.
  3. **Feature Engineering:** Trích xuất đặc trưng hình ảnh tự động qua các tầng Convolutional của backbone YOLOv8.
  4. **Model Training:** Tiến hành huấn luyện mô hình YOLOv8 trên GPU.
  5. **Model Evaluation:** Đánh giá độ chính xác trên tập test offline (đạt mAP@0.5 = 95.3% và Precision = 97.3%).
  6. **Model Deployment:** Đóng gói mô hình thành Docker Image chạy FastAPI server và deploy lên HuggingFace Spaces.
  7. **Model Operating & Monitoring:** Backend giám sát thời gian xử lý của mô hình, lưu log các ca lỗi nhận diện bong bóng để phân tích.
  8. **Model Maintenance:** Từ các ca lỗi (bong bóng dị hình, truyện cổ điển), nhóm thu thập thêm dữ liệu khó để gán nhãn bổ sung và tiến hành huấn luyện lại (retrain) mô hình.

### 💬 Câu 11: Làm thế nào nhóm đánh giá chất lượng của mô hình OCR và Dịch thuật LLM?
* **Trả lời:**
  * **Mô hình OCR (manga-ocr):** Nhóm sử dụng độ đo **CER (Character Error Rate - Tỷ lệ lỗi ký tự)** trên tập dữ liệu test gồm 500 mẫu bong bóng thoại có nhãn chuẩn (ground truth). Kết quả sau fine-tune đạt CER là **6.1%** (tương đương độ chính xác nhận dạng ký tự đạt gần 94%).
  * **Mô hình dịch thuật (Gemini):** Vì dịch thuật ngôn ngữ rất khó đánh giá tự động bằng các metric cứng như BLEU/ROUGE (do ngôn ngữ dịch linh hoạt), nhóm áp dụng phương pháp **Human-in-the-loop (Đánh giá có con người tham gia)**. Nhóm xây dựng giao diện Studio QC để lập trình viên và người dùng thử nghiệm tự chấm điểm bản dịch theo thang điểm từ 1-5 về độ tự nhiên, đúng xưng hô và giữ ngữ cảnh. Điểm trung bình đạt **4.2/5** (trên 80% hài lòng).

---

## Chủ đề 5: Lập trình thời AI (Vibe Coding & Guardrails)

### 💬 Câu 12: Nhóm bạn đã dùng AI Assistant để sinh code (Vibe Coding). Vậy làm thế nào nhóm kiểm soát chất lượng code để tránh lỗi "đập chuột chũi" (Whack-a-mole loop)?
* **Trả lời:**
  * Lạm dụng AI sinh code dễ dẫn đến suy thoái kiến trúc phần mềm và lỗi lan truyền (sửa A hỏng B). Để kiểm soát, nhóm áp dụng triết lý **Vibe Engineering** bằng cách dựng sẵn một bộ khung bảo vệ tự động (**Guardrails/Harness**):
    1. *Phân tích tĩnh:* Ép kiểu chặt chẽ bằng TypeScript (`tsc --noEmit`) kết hợp ESLint để phát hiện ngay lập tức các đoạn code AI sinh bị thiếu import, sai tên hàm hoặc sai kiểu dữ liệu.
    2. *Hệ thống kiểm thử tự động (CI/CD Gates):* Thiết lập GitHub Actions tự động chạy **5 job song song** mỗi khi có commit mới. Hệ thống sẽ tự động chạy toàn bộ unit test (Vitest ở frontend, pytest ở backend) và E2E test (Playwright) để quét lỗi. Nếu AI sinh code làm hỏng bất kỳ tính năng cũ nào, hệ thống CI sẽ báo đỏ và chặn không cho merge code.

### 💬 Câu 6: Theo bạn, Vibe Coding có làm lập trình viên bị "teo kỹ năng" (Skill atrophy) không? Nhóm bạn khắc phục thế nào?
* **Trả lời:**
  * Có rủi ro đó nếu lập trình viên chỉ copy-paste prompt mà không đọc hiểu code.
  * Nhóm khắc phục bằng nguyên tắc: *"Chỉ chấp nhận đoạn code mình thực sự hiểu"* và *"Viết prompt như viết tài liệu đặc tả (specification)"*. Thay vì bắt AI tự mò giải pháp, thành viên nhóm phải thiết kế cấu trúc dữ liệu và giải thuật trước, sau đó mô tả rõ ràng ràng buộc và đầu vào/đầu ra để AI sinh mã boilerplate, giúp tiết kiệm thời gian gõ cú pháp mà vẫn nắm quyền kiểm soát kiến trúc hệ thống.

---

## Chủ đề 6: Thiết kế Giao diện (UI/UX Design)

### 💬 Câu 13: Hãy trình bày cách StoryLens ứng dụng các nguyên lý UI/UX: Nhất quán (Consistency) và Sự đa dạng người dùng (User Diversity).
* **Trả lời:**
  * **Tính nhất quán (Consistency):** Nhóm xây dựng một Design System đồng nhất bằng Tailwind/CSS Variable. Toàn bộ các trang từ Library, Forum đến Studio đều sử dụng chung bảng màu HSL, chung kiểu bo góc nút bấm (rounded corners) và font chữ không chân (Inter/Outfit). Trạng thái tải (loading skeletons) và thông báo lỗi (toasts) đều hoạt động đồng bộ.
  * **Sự đa dạng người dùng (User Diversity):**
    * *Người dùng phổ thông (Novice):* Giao diện đọc truyện tối giản cực kỳ trực quan, hỗ trợ vuốt chạm trên mobile, phóng to thu nhỏ ảnh, chuyển đổi nhanh giữa các theme đọc (Light/Dark/Sepia) để chống mỏi mắt.
    * *Người dùng nâng cao/Dịch giả (Expert):* Hệ thống cung cấp giao diện **Studio QC**. Giao diện này cung cấp phím tắt, bảng công cụ điều chỉnh tọa độ bong bóng thoại, thay đổi trực tiếp font chữ, cỡ chữ của text dịch và tích hợp bộ từ điển tra cứu nhanh từng từ vựng tiếng Nhật.

---

## Chủ đề 7: Kiểm thử phần mềm & Đảm bảo Chất lượng (Testing & QA)

### 💬 Câu 14: Phân biệt Verification và Validation trong thực tế kiểm thử đồ án StoryLens.
* **Trả lời:**
  * **Verification (Thẩm tra - "Làm sản phẩm đúng đặc tả"):** Nhóm viết các bộ kiểm thử đơn vị (Unit test) và kiểm thử tích hợp (Integration test) để đối chiếu hành vi của code với tài liệu SRS.
    * *Ví dụ:* Chạy test case kiểm tra xem khi gọi API `/api/v1/auth/register` với mật khẩu dưới 6 ký tự thì hệ thống có trả về đúng mã lỗi `422 Unprocessable Entity` như đặc tả SRS thiết kế hay không.
  * **Validation (Thẩm định - "Làm đúng sản phẩm khách hàng cần"):** Nhóm thực hiện chạy các bài kiểm thử E2E bằng Playwright trên các luồng nghiệp vụ thực tế và tổ chức các buổi demo thực tế cho người dùng đọc thử manga để xem bản dịch tiếng Việt có mượt mà, dễ hiểu và giao diện đọc có trực quan trên các thiết bị di động hay không.

### 💬 Câu 15: Tại sao nhóm cần đến 3 thư viện kiểm thử khác nhau (Vitest, pytest, Playwright)? Có trùng lặp công sức không?
* **Trả lời:**
  * Không trùng lặp vì mỗi công cụ phục vụ một tầng kiểm thử khác nhau trong kim tự tháp kiểm thử (Testing Pyramid):
    1. **Vitest + React Testing Library:** Chạy kiểm thử đơn vị (Unit test) cực nhanh cho các hàm logic frontend và các React component độc lập trên Node.js (không cần mở trình duyệt thật).
    2. **pytest + respx:** Chạy kiểm thử đơn vị và tích hợp cho Backend API viết bằng FastAPI (Python). Mock các request gọi sang Gemini hoặc HuggingFace để kiểm tra tính đúng đắn của logic backend độc lập với môi trường mạng.
    3. **Playwright:** Chạy kiểm thử đầu-cuối (End-to-End). Playwright sẽ tự khởi động một trình duyệt Chromium/Webkit thật, giả lập người dùng click vào giao diện, điền form đăng nhập, tải ảnh lên và kiểm tra xem ảnh dịch có hiển thị đúng trên màn hình không. Đây là chốt chặn cuối cùng kiểm tra sự phối hợp của cả Frontend, Backend và Database.

---

## Chủ đề 8: Bảo mật & Đạo đức AI (Security & AI Ethics)

### 💬 Câu 16: Lỗ hổng SSRF là gì? Tại sao StoryLens có nguy cơ bị SSRF và nhóm đã phòng chống như thế nào?
* **Trả lời:**
  * **SSRF (Server-Side Request Forgery)** xảy ra khi kẻ tấn công gửi một URL nội bộ (ví dụ: `http://127.0.0.1:8000/admin` hoặc `http://192.168.1.1`) và lừa server backend thực hiện request tải dữ liệu từ địa chỉ đó, từ đó kẻ tấn công có thể quét cổng nội bộ hoặc đánh cắp thông tin nhạy cảm phía sau tường lửa.
  * **Nguy cơ của StoryLens:** Hệ thống có tính năng "Import from source" cho phép người dùng nhập link ảnh manga từ các trang web khác để dịch. Server backend bắt buộc phải tải ảnh từ link người dùng nhập về.
  * **Cách phòng chống:** Backend áp dụng cơ chế **Domain Allowlist (Danh sách miền cho phép)**. Backend chỉ thực hiện tải ảnh từ các domain truyện lớn đã được kiểm duyệt an toàn (như MangaDex). Mọi URL trỏ về IP nội bộ hoặc domain lạ ngoài whitelist đều bị chặn ngay lập tức ở tầng kiểm định.

### 💬 Câu 17: Hãy giải thích cách StoryLens bảo vệ thông tin đăng nhập của người dùng khỏi tấn công XSS.
* **Trả lời:**
  * Nếu lưu Token đăng nhập (JWT) trong `LocalStorage` hoặc `SessionStorage`, kẻ tấn công có thể dùng mã độc JavaScript (XSS) để đọc và đánh cắp token dễ dàng.
  * Nhóm giải quyết bằng cách lưu JWT token vào **HttpOnly Cookie** ở phía Backend gửi về. Thuộc tính `HttpOnly` ngăn chặn hoàn toàn JavaScript tiếp cận cookie này. Đồng thời nhóm bật thuộc tính `Secure` (chỉ gửi qua HTTPS) và `SameSite=Strict` để phòng chống tấn công giả mạo yêu cầu chéo trang (CSRF).

### 💬 Câu 18: Về mặt đạo đức AI (AI Ethics), làm thế nào đồ án StoryLens giải quyết vấn đề bản quyền tác giả truyện manga?
* **Trả lời:**
  * Bản quyền là vấn đề nhạy cảm nhất đối với các ứng dụng dịch thuật. StoryLens giải quyết bằng hai cơ chế:
    1. *Cô lập thư viện đọc:* Mặc định các chương truyện do người dùng tải lên dịch đều ở chế độ **riêng tư (Private)**, chỉ tài khoản đó được đọc và hỏi đáp RAG. Hệ thống không tự động chia sẻ công khai.
    2. *Quy trình DMCA/Copyright Take-down:* Nhóm xây dựng trang chính sách bản quyền công khai. Các tác giả hoặc nhà phát hành có bản quyền có thể gửi yêu cầu gỡ bỏ trực tiếp qua biểu mẫu báo cáo. Admin hệ thống có quyền khóa/xóa ngay lập tức các chương truyện vi phạm bản quyền khỏi thư viện công cộng.
