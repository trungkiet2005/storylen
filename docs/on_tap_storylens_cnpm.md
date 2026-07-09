# TÀI LIỆU ÔN TẬP LÝ THUYẾT CNPM KÈM LIÊN HỆ ĐỒ ÁN THỰC TẾ (STORYLENS)
**Môn học: Nhập môn Công nghệ phần mềm (CSC13002) — VNUHCM-US**
**Biên soạn bám sát slide LN01 – LN12 và liên hệ trực tiếp đồ án StoryLens**

---

## 📑 MỤC LỤC
1. [LN01 - Giới thiệu Công nghệ Phần mềm](#ln01---giới-thiệu-công-nghệ-phần-mềm)
2. [LN02 - Quy trình Phần mềm (Software Processes)](#ln02---quy-trình-phần-mềm-software-processes)
3. [LN03 & LN03b - Quản lý Dự án & Tổ chức Nhóm](#ln03--ln03b---quản-lý-dự-án--tổ-chức-nhóm)
4. [LN04 & LN05 - Kỹ nghệ Yêu cầu (Requirements Engineering)](#ln04--ln05---kỹ-nghệ-yêu-cầu-requirements-engineering)
5. [LN06 - Kiến trúc Phần mềm (Software Architecture)](#ln06---kiến-trúc-phần-mềm-software-architecture)
6. [LN07 - Quy trình Học máy (ML Workflow)](#ln07---quy-trình-học-máy-ml-workflow)
7. [LN08 - Lập trình AI (Vibe Coding & Vibe Engineering)](#ln08---lập-trình-ai-vibe-coding--vibe-engineering)
8. [LN09 - Thiết kế Giao diện Người dùng (UI Design)](#ln09---thiết-kế-giao-diện-người-dùng-ui-design)
9. [LN10 & LN11 - Kiểm thử & Tự động hóa Kiểm thử (Test Automation & DevOps)](#ln10--ln11---kiểm-thử--tự-động-hóa-kiểm-thử-test-automation--devops)
10. [LN12 - Đạo đức AI & Bảo mật (AI Ethics & Security)](#ln12---đạo-đức-ai--bảo-mật-ai-ethics--security)

---

## LN01 - Giới thiệu Công nghệ Phần mềm

### 🎯 Tóm tắt Lý thuyết Trọng tâm
* **Khủng hoảng phần mềm (Software Crisis):** Xuất hiện khi phần mềm ngày càng lớn và phức tạp, dẫn đến: trễ hạn, vượt ngân sách, không đáp ứng yêu cầu khách hàng, chất lượng kém và khó bảo trì.
* **Định nghĩa CNPM (Software Engineering):** Một ngành kỹ thuật liên quan đến *tất cả các khía cạnh của sản xuất phần mềm*, từ pha bắt đầu đến bảo trì, áp dụng các lý thuyết, phương pháp và công cụ một cách có hệ thống, kỷ luật.
* **4 thuộc tính của một phần mềm tốt:**
  1. **Maintainability (Khả năng bảo trì):** Phần mềm phải dễ tiến hóa khi yêu cầu thay đổi.
  2. **Dependability & Security (Độ tin cậy và Bảo mật):** Tránh lỗi phá hủy, bảo vệ dữ liệu khỏi truy cập trái phép.
  3. **Efficiency (Hiệu quả):** Tối ưu tài nguyên hệ thống (CPU, RAM, băng thông).
  4. **Acceptability (Khả năng chấp nhận):** Giao diện thân thiện, dễ dùng, đáp ứng đúng kỳ vọng người dùng.

### ❓ Câu hỏi Liên hệ Đồ án StoryLens
> **Câu hỏi 1 (Tự luận):** Đồ án StoryLens giải quyết "khủng hoảng" thực tế nào của cộng đồng manga? Nhóm đã đảm bảo 4 thuộc tính của một phần mềm tốt như thế nào trong thiết kế hệ thống?
* **Trả lời:**
  * **Giải quyết khủng hoảng:** Bản dịch thủ công (fansub) ra rất chậm và chất lượng không đều; các công cụ dịch tự động như Google Lens dịch từng câu đơn lẻ làm mất ngữ cảnh và cấu trúc ngôi xưng; người đọc không có cách hỏi đáp thông tin sâu về cốt truyện. StoryLens tự động hóa toàn bộ pipeline nhưng tích hợp RAG để lưu giữ và giải đáp ngữ cảnh.
  * **Đảm bảo 4 thuộc tính tốt:**
    1. *Maintainability:* Tách biệt rõ ràng 3 service (Next.js frontend, FastAPI backend, AI Module trên HuggingFace). Sử dụng TypeScript và schema CSDL Supabase tường minh.
    2. *Dependability & Security:* Sử dụng cookie HttpOnly để tránh mất Session/Token Auth; bật Row Level Security (RLS) trên Supabase để cô lập dữ liệu người dùng.
    3. *Efficiency:* AI Module chứa model nặng (~4GB) được chạy độc lập trên HuggingFace Spaces. Sử dụng cache và pgvector cosine search giúp truy vấn RAG cực nhanh.
    4. *Acceptability:* Thiết kế UI đa nền tảng (Responsive), hỗ trợ 3 theme đọc truyện (Light/Dark/Sepia) và song ngữ Anh-Việt (i18n).

### 📝 Trắc nghiệm Minh họa
**Câu 1.** Điểm khác biệt cơ bản giữa Kỹ nghệ Phần mềm (Software Engineering) và Khoa học Máy tính (Computer Science) là gì?
A. Khoa học Máy tính tập trung vào thực tiễn phát triển phần mềm thương mại còn CNPM đi sâu vào lý thuyết và giải thuật cơ bản.  
B. CNPM liên quan đến tất cả các khía cạnh của việc sản xuất phần mềm thực tế một cách thực dụng, còn Khoa học Máy tính tập trung vào lý thuyết và nguyên lý nền tảng.  
C. CNPM chỉ tập trung vào viết code, còn Khoa học Máy tính tập trung vào thiết kế hệ thống phần cứng.  
D. Không có sự khác biệt, hai khái niệm này là một.  
* **Đáp án:** B

---

## LN02 - Quy trình Phần mềm (Software Processes)

### 🎯 Tóm tắt Lý thuyết Trọng tâm
* **5 Hoạt động cốt lõi:** Specification (Đặc tả) $\to$ Design (Thiết kế) $\to$ Coding (Lập trình) $\to$ Validation (Kiểm thử/Thẩm định) $\to$ Evolution (Tiến hóa).
* **Mô hình Thác nước (Waterfall):** Tuần tự, pha trước xong mới sang pha sau, nặng tính tài liệu (document-driven), khó thay đổi yêu cầu ở giai đoạn muộn.
* **Mô hình Agile (Scrum/XP):** Lặp ngắn (Sprint 1-4 tuần), giao sản phẩm chạy được liên tục, lấy con người và phản hồi làm trung tâm, tài liệu gọn nhẹ, thích ứng tốt với thay đổi.
* **AI-driven SDLC (Vòng đời phát triển phần mềm được hỗ trợ bởi AI):** Tăng cường tự động hóa ở mọi pha nhờ AI agents và LLM (code gen, auto testing, auto translation).

### ❓ Câu hỏi Liên hệ Đồ án StoryLens
> **Câu hỏi 1 (Tự luận):** So sánh việc áp dụng mô hình Thác nước (Waterfall) và mô hình Agile (Scrum) vào việc phát triển đồ án StoryLens. Tại sao nhóm bạn lại quyết định chọn mô hình Agile/Scrum?
* **Trả lời:**
  * *Nếu dùng Waterfall:* Nhóm phải đặc tả 100% tài liệu SRS, thiết kế toàn bộ schema và AI pipeline từ đầu. Nếu đến tuần thứ 10 phát hiện ra mô hình YOLOv8 nhận diện bong bóng thoại bị lệch hoặc thư viện RAG chạy quá chậm khi kết hợp Supabase, việc quay lại sửa thiết kế hệ thống và viết lại code sẽ rất tốn kém và nguy cơ trễ hạn báo cáo là cực cao.
  * *Chọn Agile/Scrum:* Do đồ án có độ bất định cao (đặc biệt ở phần AI), nhóm chia thành **7 Sprint (mỗi Sprint 2 tuần)**:
    * *Sprint 1:* Dựng Auth + Database Schema cơ bản.
    * *Sprint 2:* Xây dựng AI pipeline upload thô (YOLO + OCR).
    * *Sprint 3:* Dựng Reader UI (đọc đè text).
    * *Sprint 4:* RAG Q&A và lưu trữ vector.
    * *Sprint 5-7:* Forum, tích hợp Stripe, kiểm thử tự động.
  * Nhờ phát triển tăng dần (Incremental), nhóm luôn có "sản phẩm chạy được" để demo và kiểm định tính khả thi của các module ML ngay từ sớm.

### 📝 Trắc nghiệm Minh họa
**Câu 1.** Trong mô hình Agile/Scrum, một "Sprint" thường kéo dài trong bao lâu và cho ra kết quả gì?
A. 1 đến 2 năm; kết quả là toàn bộ phần mềm hoàn chỉnh và bàn giao cho khách hàng.  
B. 1 đến 4 tuần; kết quả là một phần tăng trưởng phần mềm hoạt động được (potentially shippable product increment).  
C. Không giới hạn thời gian; kết quả là bản thiết kế kiến trúc phần mềm chi tiết.  
D. 1 ngày; kết quả là một vài dòng code đã qua review.  
* **Đáp án:** B

---

## LN03 & LN03b - Quản lý Dự án & Tổ chức Nhóm

### 🎯 Tóm tắt Lý thuyết Trọng tâm
* **Quản lý rủi ro (Risk Management):** Nhận dạng rủi ro $\to$ Phân tích rủi ro $\to$ Lập kế hoạch phòng ngừa $\to$ Giám sát rủi ro.
* **Vai trò trong Scrum:** Product Owner (chủ sản phẩm, gom backlog), Scrum Master (giúp nhóm giải quyết trở ngại), Developers (lập trình, kiểm thử).
* **Mô hình tổ chức nhóm Flat Team (Mô hình phẳng):** Không phân cấp cứng nhắc, thảo luận tập thể, các thành viên chia sẻ vai trò linh hoạt dựa trên thế mạnh cá nhân.

### ❓ Câu hỏi Liên hệ Đồ án StoryLens
> **Câu hỏi 1 (Tự luận):** Là Project Manager kiêm AI Engineer của dự án StoryLens, bạn Đào Sỹ Duy Minh đã nhận diện những rủi ro kỹ thuật nào và lập kế hoạch giảm thiểu (mitigation strategies) ra sao?
* **Trả lời:**
  * *Rủi ro 1: Hết hạn mức gọi API (Quota limit) của Gemini:* LLM dịch thuật và RAG phụ thuộc vào Gemini API. Kế hoạch phòng ngừa: Nhóm cấu hình xoay vòng nhiều API key khác nhau, đồng thời hiện thực cơ chế cache các trang truyện đã dịch trong Supabase. Nếu cùng một trang được đọc lại, hệ thống sẽ lấy trực tiếp bản dịch cũ thay vì gọi API mới.
  * *Rủi ro 2: Khởi động lạnh (Cold start) của server backend:* Do deploy backend API trên Render (tier miễn phí) và AI Module trên HuggingFace Spaces, hệ thống sẽ tự ngủ sau khi không có truy cập. Kế hoạch phòng ngừa: Viết script ping định kỳ (keep-alive) và hiển thị UI thông báo "Hệ thống AI đang khởi động" rõ ràng để người dùng không cảm thấy ứng dụng bị treo.
  * *Rủi ro 3: Trùng lặp request khi người dùng bấm dịch liên tục (Retry/Network lag):* Kế hoạch phòng ngừa: Hiện thực cơ chế **Idempotency Key** trên endpoint `/upload` và `/scrape`. Khi nhận request trùng key, backend chỉ xử lý một lần và trả về kết quả cũ.

### 📝 Trắc nghiệm Minh họa
**Câu 1.** Công thức COCOMO cơ bản được sử dụng chủ yếu để ước lượng yếu tố nào của dự án phần mềm?
A. Số lượng lỗi (bugs) còn tồn tại trong hệ thống.  
B. Độ chính xác của các mô hình học máy được tích hợp.  
C. Nỗ lực (Person-Month) và thời gian phát triển dựa trên quy mô dòng code (KLOC).  
D. Mức độ hài lòng của khách hàng đối với UI/UX.  
* **Đáp án:** C

---

## LN04 & LN05 - Kỹ nghệ Yêu cầu (Requirements Engineering)

### 🎯 Tóm tắt Lý thuyết Trọng tâm
* **Yêu cầu chức năng (Functional - FR):** Hệ thống phải thực hiện hành vi cụ thể nào (Ví dụ: Đăng nhập, Upload file, Tìm kiếm).
* **Yêu cầu phi chức năng (Non-Functional - NFR):** Ràng buộc về chất lượng và vận hành (Ví dụ: Hiệu năng, Bảo mật, Độ sẵn sàng, Khả năng mở rộng).
* **Đặc tả Use Case:** Gồm tên use case, actor, tiền điều kiện (preconditions), hậu điều kiện (postconditions), luồng chính (basic flow), luồng thay thế (alternative flow), ngoại lệ (exceptions).

### ❓ Câu hỏi Liên hệ Đồ án StoryLens
> **Câu hỏi 1 (Tự luận):** Viết đặc tả Use Case cho tính năng cốt lõi của StoryLens: **"UC01 - Tải lên và dịch trang manga"**.
* **Trả lời:**
  * **Tên use case:** Tải lên và dịch trang manga.
  * **Actor chính:** Người đọc (Reader). **Actor phụ:** AI Module (YOLOv8 + manga-ocr), Gemini API.
  * **Tiền điều kiện:** Người dùng đã đăng nhập tài khoản và còn đủ số dư credit.
  * **Hậu điều kiện:** Trang manga được dịch đè chữ Việt thành công; văn bản được nhúng vector lưu vào `pgvector` phục vụ Q&A; tài khoản người dùng bị trừ 1 credit.
  * **Luồng chính (Basic Flow):**
    1. Người dùng kéo-thả ảnh manga vào khu vực tải lên.
    2. Backend lưu trữ ảnh vào Supabase Storage.
    3. Backend gọi AI Module để chạy pipeline (phát hiện bong bóng, chạy OCR, inpaint xóa chữ cũ).
    4. Backend gọi Gemini API để dịch chữ đã nhận dạng sang tiếng Việt có ngữ cảnh.
    5. Backend sinh file ảnh overlay chứa text tiếng Việt và lưu tọa độ bong bóng.
    6. Trả kết quả về cho frontend hiển thị.
  * **Luồng thay thế (Alternative Flow):**
    * *A1 - Dịch chương (Batch upload):* Người dùng tải lên nhiều file ảnh. Hệ thống đưa các trang vào hàng đợi xử lý tuần tự và cập nhật tiến trình qua WebSocket.
  * **Ngoại lệ (Exception Flow):**
    * *E1 - File không hợp lệ:* Ảnh tải lên không đúng định dạng hoặc chứa mã độc. Hệ thống cảnh báo "File không hợp lệ" và dừng xử lý.
    * *E2 - Hết credit:* Người dùng không đủ credit để chạy dịch. Hệ thống thông báo và dẫn hướng tới trang nạp credit (Stripe).
    * *E3 - Lỗi kết nối AI module:* HuggingFace Spaces bị sập hoặc quá tải. Hệ thống báo lỗi và hoàn lại credit cho người dùng.

### 📝 Trắc nghiệm Minh họa
**Câu 1.** Yêu cầu "Hệ thống phải xử lý và trả về bản dịch đè chữ của mỗi trang manga trong vòng dưới 30 giây ở điều kiện mạng bình thường" thuộc loại yêu cầu nào?
A. Yêu cầu chức năng (Functional Requirement).  
B. Yêu cầu phi chức năng (Non-Functional Requirement - Hiệu năng).  
C. Yêu cầu nghiệp vụ (Business Requirement).  
D. Yêu cầu thiết kế kiến trúc.  
* **Đáp án:** B

---

## LN06 - Kiến trúc Phần mềm (Software Architecture)

### 🎯 Tóm tắt Lý thuyết Trọng tâm
* **Kiến trúc 3 lớp (3-tier Architecture):** Presentation (Giao diện) $\leftrightarrow$ Application/Logic (Xử lý nghiệp vụ) $\leftrightarrow$ Data (Cơ sở dữ liệu).
* **Kiến trúc Đường ống - Bộ lọc (Pipe-and-Filter):** Dữ liệu đầu vào đi qua một chuỗi các bộ lọc xử lý tuần tự (filters), được truyền tải qua các đường ống dẫn (pipes). Rất phù hợp cho xử lý đa phương tiện, xử lý ảnh.
* **Database Vector (`pgvector`):** Lưu trữ và truy vấn tương đồng (cosine similarity) trên các vector embedding phục vụ bài toán RAG.

### ❓ Câu hỏi Liên hệ Đồ án StoryLens
> **Câu hỏi 1 (Tự luận):** Trình bày kiến trúc hệ thống của StoryLens. Phân tích cách nhóm bạn thiết kế Pipeline xử lý ảnh dựa trên phong cách kiến trúc **Pipe-and-Filter**.
* **Trả lời:**
  * **Kiến trúc tổng quát:** StoryLens sử dụng mô hình 3-tier kết hợp Microservices:
    * *Presentation Tier:* Next.js 16 + React 19 (Vercel).
    * *Logic Tier:* FastAPI Backend (Render) + AI Module Container (HuggingFace).
    * *Data Tier:* Supabase Postgres + pgvector + Supabase Storage.
  * **Kiến trúc Pipe-and-Filter của AI Pipeline:**
    ```
    [Ảnh gốc JP/CN] ──(pipe)──► [Filter 1: YOLOv8] (Phát hiện bong bóng)
                                      │
                                    (pipe) tọa độ bong bóng
                                      ▼
    [Text JP/CN]     ◄──(pipe)── [Filter 2: manga-ocr] (Nhận diện chữ gốc)
          │
        (pipe)
          ▼
    [Filter 3: Gemini] (Dịch thuật ngữ cảnh) ──(pipe)──► [Text tiếng Việt]
                                                               │
    [Ảnh sạch nền]    ◄──(pipe)── [Filter 4: LaMa] (Xóa chữ gốc) ◄──┘
          │
        (pipe)
          ▼
    [Filter 5: Rendering] ──(pipe)──► [Ảnh dịch hoàn chỉnh đè text Việt]
    ```
    *Mỗi filter nhận dữ liệu đầu vào cụ thể, thực hiện một phép biến đổi độc lập và đẩy kết quả sang filter tiếp theo.*

### 📝 Trắc nghiệm Minh họa
**Câu 1.** Tại sao StoryLens lại tách riêng AI Module thành một service độc lập trên HuggingFace thay vì tích hợp chung vào FastAPI Backend trên Render?
A. Vì Render không hỗ trợ ngôn ngữ Python.  
B. Do các thư viện AI (PyTorch, YOLOv8) và mô hình nặng (~4GB) đòi hỏi tài nguyên GPU/RAM rất lớn, vượt quá giới hạn của gói miễn phí trên Render.  
C. Để nâng cao tính bảo mật của mã nguồn Next.js.  
D. Vì Supabase bắt buộc phải kết nối qua HuggingFace.  
* **Đáp án:** B

---

## LN07 - Quy trình Học máy (ML Workflow)

### 🎯 Tóm tắt Lý thuyết Trọng tâm
* **8 bước ML Workflow:** Requirements $\to$ Data collection & preparation $\to$ Feature engineering $\to$ Model training $\to$ Model evaluation $\to$ Deployment $\to$ Operating & monitoring $\to$ Maintenance.
* **Feedback Loop (Vòng lặp phản hồi):** Khi kiểm thử hoặc vận hành thực tế không đạt, phải quay lại các bước trước (Data collection, Feature engineering) để huấn luyện lại.
* **Concept Drift / Data Drift:** Sự thay đổi phân phối của dữ liệu thực tế so với dữ liệu huấn luyện theo thời gian, khiến độ chính xác của mô hình suy giảm, đòi hỏi phải giám sát và cập nhật.

### ❓ Câu hỏi Liên hệ Đồ án StoryLens
> **Câu hỏi 1 (Tự luận):** Phân tích cách nhóm bạn thực hiện bước **Data Collection & Preparation** và **Model Evaluation** cho mô hình YOLOv8 phát hiện bong bóng thoại manga.
* **Trả lời:**
  * **Data Collection & Preparation:** Nhóm sử dụng bộ dữ liệu chuẩn **Manga109-s** (chứa các trang manga tiếng Nhật đa dạng phong cách). Tuy nhiên, vì font chữ và kích thước bong bóng truyện cổ điển khác truyện hiện đại nên nhóm phải tiến hành tiền xử lý: chuẩn hóa kích thước ảnh về $640 \times 640$, gán nhãn các hộp bong bóng thoại bằng định dạng YOLO và phân chia tập dữ liệu thành 3 phần: Training (70%), Validation (15%), và Testing (15%).
  * **Model Evaluation:** Nhóm đánh giá mô hình offline bằng hai độ đo chính: Precision (Độ chính xác dự báo bong bóng thoại) và mAP@0.5 (Mean Average Precision). Kết quả đạt được rất ấn tượng: **Precision đạt 97.3%** và **mAP@0.5 đạt 95.3%**, vượt qua ngưỡng chấp nhận thiết kế ban đầu là 85%.

### 📝 Trắc nghiệm Minh họa
**Câu 1.** Sự khác biệt cốt lõi nhất giữa kỹ nghệ phần mềm truyền thống (Software Engineering) và Kỹ nghệ hệ thống AI (AI Engineering) là gì?
A. Hệ thống AI không cần viết code mà tự sinh ra hoàn toàn từ dữ liệu.  
B. Phân mềm truyền thống tập trung vào logic lập trình (code-centric), trong khi hệ thống AI tập trung vào sự kết hợp giữa logic và biến động dữ liệu/mô hình (data-centric + model-centric) có tính bất định cao.  
C. Phần mềm truyền thống có chi phí bảo trì đắt hơn nhiều so với hệ thống AI.  
D. Phần mềm truyền thống không cần chạy kiểm thử.  
* **Đáp án:** B

---

## LN08 - Lập trình AI (Vibe Coding & Vibe Engineering)

### 🎯 Tóm tắt Lý thuyết Trọng tâm
* **Vibe Coding ("Programming by feel"):** Phong cách lập trình mà con người mô tả yêu cầu bằng ngôn ngữ tự nhiên để AI (LLM/Agent) tự sinh mã nguồn và thực thi, con người đóng vai trò điều hướng mà không cần viết cú pháp thủ công hay đọc kỹ từng dòng code.
* **Rủi ro của Vibe Coding:**
  * **Architectural Decay (Suy thoái kiến trúc):** AI giải quyết tốt cục bộ nhưng tích tụ nợ kỹ thuật, phá hỏng kiến trúc tổng thể.
  * **Whack-a-mole loop (Đập chuột chũi):** Fix được lỗi này thì lại sinh ra 2 lỗi khác do AI không nắm vững mô hình tư duy hệ thống.
  * **Security blind spots & Hallucinated dependencies:** AI ưu tiên chạy được chức năng, dễ bỏ qua SQL injection, validate input, hoặc bịa ra thư viện không tồn tại.
* **Vibe Engineering:** Sử dụng các rào chắn tự động (**Guardrails/Harness**) như CI/CD, viết test tự động, linter, static type check để kiểm soát chất lượng code do AI sinh ra.

### ❓ Câu hỏi Liên hệ Đồ án StoryLens
> **Câu hỏi 1 (Tự luận):** Trong quá trình xây dựng StoryLens, nhóm đã làm thế nào để tận dụng sức mạnh tốc độ của Vibe Coding nhưng vẫn kiểm soát được thảm họa nợ kỹ thuật (technical debt) và bảo mật?
* **Trả lời:**
  * Nhóm đã xây dựng một **"Harness" (khung kiểm soát)** cực kỳ chặt chẽ qua hệ thống CI/CD tự động bằng GitHub Actions:
    1. *Ràng buộc kiểu dữ liệu:* Ép kiểu chặt chẽ bằng TypeScript (`npx tsc --noEmit`) để bắt các lỗi gọi hàm sai tham số do AI sinh ra.
    2. *Lint tự động:* Dùng ESLint để quét lỗi định dạng và code mùi (code smell).
    3. *Hàng rào kiểm thử tự động (Automated Gates):* Viết bộ test phủ 3 tầng (Vitest cho logic frontend, pytest cho backend API, và đặc biệt là Playwright cho các luồng E2E phức tạp như đăng nhập, nạp tiền). Mỗi khi AI sinh mã mới và lập trình viên push lên GitHub, CI sẽ tự động chạy 5 job kiểm thử này. Nếu có bất kỳ lỗi "đập chuột chũi" nào xảy ra làm hỏng tính năng cũ, CI sẽ báo đỏ và chặn không cho merge vào nhánh chính `main`.

### 📝 Trắc nghiệm Minh họa
**Câu 1.** Khái niệm "Vibe Coding" phù hợp nhất cho ngữ cảnh nào sau đây?
A. Phát triển hệ thống lõi thanh toán cho ngân hàng lớn.  
B. Làm mẫu thử nhanh (Rapid Prototyping) ở giai đoạn khởi đầu dự án hoặc các script nhỏ dùng một lần.  
C. Phát triển phần mềm điều khiển thiết bị y tế.  
D. Bảo trì một hệ thống có tuổi đời hàng chục năm của doanh nghiệp.  
* **Đáp án:** B

---

## LN09 - Thiết kế Giao diện Người dùng (UI Design)

### 🎯 Tóm tắt Lý thuyết Trọng tâm
* **Các nguyên lý UI/UX cốt lõi:**
  * **Consistency (Nhất quán):** Các nút bấm, màu sắc, font chữ, hành vi phải đồng bộ trên toàn ứng dụng.
  * **User diversity (Sự đa dạng người dùng):** Giao diện phải phục vụ được từ người mới bắt đầu (novice) đến người dùng chuyên nghiệp (expert).
  * **Recoverability (Khả năng phục hồi):** Cho phép người dùng undo hành vi sai (ví dụ: bấm nút xóa nhầm).
* **Responsive Web Design:** Tự động co giãn theo kích thước màn hình (Desktop, Tablet, Mobile).

### ❓ Câu hỏi Liên hệ Đồ án StoryLens
> **Câu hỏi 1 (Tự luận):** Phân tích cách StoryLens áp dụng nguyên lý **User Diversity** và **Consistency** trong giao diện người dùng.
* **Trả lời:**
  * **User Diversity:**
    * *Với người đọc phổ thông (Novice):* Giao diện đọc truyện vô cùng tối giản, tự động dịch overlay đè lên bong bóng thoại. Họ chỉ cần kéo thả ảnh hoặc click đọc chương như một web truyện bình thường.
    * *Với người dịch/hiệu đính (Expert):* Hệ thống cung cấp **QC Studio** cho phép click vào từng bong bóng thoại để chỉnh sửa bản dịch thô của Gemini, thay đổi font chữ, cỡ chữ, căn lề và xem chi tiết từ điển tra cứu nhanh.
  * **Consistency:** 
    * Nhóm định nghĩa một Design System đồng bộ với hệ màu HSL (Sleek Dark Mode, Light Mode, Sepia Mode) sử dụng thống nhất font chữ từ Google Fonts.
    * Các nút bấm tương tác, hộp thoại thông báo (toast notifications) đều tuân thủ chung một thiết kế bo góc và animation mượt mà.

### 📝 Trắc nghiệm Minh họa
**Câu 1.** Nguyên lý UI nào khuyên nhà thiết kế nên tạo ra cơ chế giúp người dùng dễ dàng hủy bỏ (Undo) một thao tác vừa thực hiện sai?
A. User diversity.  
B. Recoverability.  
C. Familiarity.  
D. Consistency.  
* **Đáp án:** B

---

## LN10 & LN11 - Kiểm thử & Tự động hóa Kiểm thử (Test Automation & DevOps)

### 🎯 Tóm tắt Lý thuyết Trọng tâm
* **Verification vs Validation:**
  * *Verification (Thẩm tra):* "Are we building the product right?" (So sánh sản phẩm với đặc tả SRS).
  * *Validation (Thẩm định):* "Are we building the right product?" (So sánh sản phẩm với nhu cầu thực của khách hàng).
* **Các mức kiểm thử:** Unit Testing (Đơn vị) $\to$ Integration Testing (Tích hợp) $\to$ System Testing (Hệ thống) $\to$ Acceptance Testing (Chấp nhận).
* **Regression Testing (Kiểm thử hồi quy):** Chạy lại các ca kiểm thử cũ khi có thay đổi mã nguồn để đảm bảo không phát sinh lỗi mới trên tính năng cũ. Cực kỳ quan trọng trong CI/CD và DevOps.

### ❓ Câu hỏi Liên hệ Đồ án StoryLens
> **Câu hỏi 1 (Tự luận):** Hãy lập danh sách các ca kiểm thử (Test Cases) để kiểm thử tính năng **"Thanh toán nạp credit qua Stripe"** trong StoryLens. Hãy đảm bảo phủ đủ các trường hợp: Hợp lệ, Biên, và Ngoại lệ.
* **Trả lời:**

| Mã Test Case | Loại kiểm thử | Tiền điều kiện & Dữ liệu đầu vào | Các bước thực hiện | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- |
| **TC-PAY-01** | Hợp lệ (Happy path) | Khách hàng đã đăng nhập; Thẻ thanh toán demo của Stripe hợp lệ. | 1. Chọn gói Basic (100 credits).<br>2. Nhập thông tin thẻ và bấm "Thanh toán". | Giao dịch thành công; Tài khoản được cộng 100 credits; Cập nhật lịch sử giao dịch. |
| **TC-PAY-02** | Biên (Boundary value) | Số dư tài khoản Stripe demo vừa khít với giá trị gói cước cần mua. | 1. Chọn gói Premium.<br>2. Tiến hành thanh toán. | Giao dịch thành công; credits được cộng chính xác; không bị trừ âm tài khoản. |
| **TC-PAY-03** | Không hợp lệ | Nhập thẻ hết hạn hoặc sai mã CVC. | 1. Nhập thông tin thẻ hết hạn.<br>2. Bấm "Thanh toán". | Giao dịch bị từ chối; Hiển thị thông báo lỗi chi tiết từ Stripe; Không cộng credits. |
| **TC-PAY-04** | Ngoại lệ (Race Condition) | Nhấp đúp (Double-click) nút thanh toán hoặc mất mạng giữa chừng. | 1. Nhấp liên tục nút "Thanh toán". | Backend áp dụng **Idempotency Key**; chỉ tạo duy nhất 1 hóa đơn thanh toán trên Stripe; chỉ cộng credits 1 lần. |

### 📝 Trắc nghiệm Minh họa
**Câu 1.** Trong quy trình kiểm thử hệ thống AI (như YOLOv8 phát hiện bong bóng thoại), độ đo nào sau đây phản ánh tỷ lệ bong bóng thoại bị phát hiện sai vị trí (False Positive) trên tổng số phát hiện của mô hình?
A. Recall.  
B. Precision.  
C. Character Error Rate (CER).  
D. F1-Score.  
* **Đáp án:** B

---

## LN12 - Đạo đức AI & Bảo mật (AI Ethics & Security)

### 🎯 Tóm tắt Lý thuyết Trọng tâm
* **AI Ethics:** Đảm bảo tính công bằng (Fairness), minh bạch (Transparency), quyền riêng tư (Privacy) và tuân thủ pháp luật (bản quyền, bản quyền tác giả).
* **Quyền GDPR của người dùng:** Quyền được lãng quên (xóa tài khoản hoàn toàn) và Quyền được trích xuất dữ liệu cá nhân (GDPR data export).
* **SSRF (Server-Side Request Forgery):** Lỗ hổng bảo mật khi kẻ tấn công lừa server gọi request đến các địa chỉ nội bộ nhạy cảm. Phòng chống bằng danh sách whitelist IP/Domain cho phép.

### ❓ Câu hỏi Liên hệ Đồ án StoryLens
> **Câu hỏi 1 (Tự luận):** Các vấn đề về bản quyền truyện dịch và an toàn thông tin (Bảo mật) đã được StoryLens xử lý như thế nào để tuân thủ đạo đức AI và tiêu chuẩn công nghiệp?
* **Trả lời:**
  * **Xử lý Đạo đức AI & Bản quyền:**
    1. *Tôn trọng tác giả gốc:* StoryLens cung cấp trang **Copyright / DMCA Policy** công khai cho phép các họa sĩ/nhà xuất bản gửi yêu cầu gỡ bỏ nếu phát hiện truyện của họ bị dịch trái phép.
    2. *Tuân thủ GDPR:* Cho phép người dùng xuất toàn bộ lịch sử đọc truyện và thông tin cá nhân dưới dạng JSON (GDPR Data Export) và tính năng xóa tài khoản vĩnh viễn khỏi Supabase Auth.
  * **Bảo mật hệ thống:**
    1. *Chống tấn công SSRF:* Khi người dùng nhập URL nguồn ngoài để dịch truyện, backend áp dụng bộ lọc chỉ chấp nhận các tên miền được phép (Allowlisted domains như MangaDex) và chặn đứng các dải IP nội bộ (`127.0.0.1`, `10.0.0.0/8`).
    2. *Chống giả mạo file ảnh (Malicious uploads):* Sử dụng thư viện Pillow để phân tích cấu trúc header ảnh ngay khi tải lên, chặn các mã độc ẩn dưới định dạng file `.png` hay `.jpg`.
    3. *Phân quyền cơ sở dữ liệu:* Bật Row Level Security (RLS) để cô lập dữ liệu người dùng ở mức bảng Database.

### 📝 Trắc nghiệm Minh họa
**Câu 1.** Quyền nào của người dùng theo luật GDPR yêu cầu hệ thống phải cho phép họ tải xuống toàn bộ dữ liệu cá nhân và lịch sử hoạt động của mình dưới dạng một file có cấu trúc rõ ràng?
A. Quyền được lãng quên (Right to be forgotten).  
B. Quyền truy cập và di chuyển dữ liệu (Right to access & Data portability).  
C. Quyền phản đối quyết định tự động của AI.  
D. Quyền được bồi thường thiệt hại.  
* **Đáp án:** B
