# Software Requirements Specification (SRS) - StoryLens

## 1. Introduction
### 1.1 Purpose
Tài liệu này đặc tả chi tiết các yêu cầu chức năng và phi chức năng cho hệ thống **StoryLens** - một nền tảng web hỗ trợ dịch manga bằng AI tích hợp RAG (Retrieval-Augmented Generation) để hỏi đáp nội dung. Tài liệu này phục vụ cho đội ngũ phát triển, kiểm thử và các bên liên quan để hiểu rõ cách thức hệ thống vận hành.

### 1.2 Scope
Hệ thống StoryLens bao gồm:
- Module xử lý ảnh (Bubble Detection & OCR).
- Module dịch thuật dựa trên ngữ cảnh (LLM-based Translation).
- Module hiển thị (Overlay Reader).
- Module hỏi đáp thông minh (RAG Q&A).
- Hệ thống quản lý lịch sử và batch upload.

### 1.3 Definitions, Acronyms, and Abbreviations
| Thuật ngữ | Định nghĩa |
| :--- | :--- |
| **OCR** | Optical Character Recognition - Nhận dạng ký tự quang học. |
| **RAG** | Retrieval-Augmented Generation - Kỹ thuật kết hợp tìm kiếm thông tin và sinh văn bản. |
| **LLM** | Large Language Model - Mô hình ngôn ngữ lớn (ví dụ: Gemini). |
| **Bbox** | Bounding Box - Khung bao quanh vùng chứa văn bản. |
| **CER** | Character Error Rate - Tỷ lệ lỗi ký tự trong OCR. |

---

## 2. Overall Description
### 2.1 Product Perspective
StoryLens là một hệ thống độc lập, tương tác với các API bên ngoài (Gemini API) và sử dụng các mô hình AI cục bộ (YOLOv8, Manga-OCR). Hệ thống được thiết kế theo kiến trúc Layered Architecture để dễ dàng mở rộng.

### 2.2 Product Functions
- **F01: Upload Manga:** Hỗ trợ tải ảnh đơn lẻ hoặc theo chương (batch).
- **F02: AI Processing:** Tự động phát hiện bubble và trích xuất chữ Nhật.
- **F03: Contextual Translation:** Dịch sang tiếng Việt giữ nguyên ngữ cảnh và xưng hô.
- **F04: Overlay Display:** Hiển thị bản dịch đè lên ảnh gốc tại đúng vị trí.
- **F05: RAG Q&A:** Cho phép người dùng hỏi về nội dung truyện dựa trên dữ liệu đã xử lý.
- **F06: History Management:** Lưu trữ và xem lại các trang đã dịch.

### 2.3 User Classes and Characteristics
- **Người đọc phổ thông:** Cần sự đơn giản, nhanh chóng.
- **Người học tiếng Nhật:** Cần độ chính xác cao, đối chiếu song ngữ.
- **Content Creator:** Cần xử lý số lượng lớn (batch upload).
- **Admin:** Quản lý hệ thống, theo dõi log và quota.

---

## 3. Functional Requirements

### 3.1 Module Xử lý Ảnh (Image Processing)
- **REQ-1.1:** Hệ thống phải phát hiện được các speech bubble trong ảnh manga với độ chính xác mAP >= 90%.
- **REQ-1.2:** Hệ thống phải trích xuất được văn bản tiếng Nhật từ các bubble đã phát hiện (CER <= 5%).
- **REQ-1.3:** Hệ thống phải lưu trữ tọa độ (x, y, w, h) của từng bubble để phục vụ overlay.

### 3.2 Module Dịch thuật (Translation)
- **REQ-2.1:** Hệ thống phải gửi văn bản gốc kèm ngữ cảnh (context) và glossary (nếu có) tới LLM.
- **REQ-2.2:** Bản dịch phải tự nhiên, phù hợp với văn phong manga và giữ đúng đại từ xưng hô.
- **REQ-2.3:** Hỗ trợ xử lý lỗi khi API dịch gặp sự cố hoặc hết quota.

### 3.3 Module RAG Q&A
- **REQ-3.1:** Hệ thống phải phân tách văn bản (chunking) và lưu vào Vector Database.
- **REQ-3.2:** Khi người dùng đặt câu hỏi, hệ thống phải tìm kiếm các đoạn văn bản liên quan nhất.
- **REQ-3.3:** Câu trả lời phải dựa trên dữ liệu thực tế từ truyện, không được "bịa" thông tin (hallucination).

### 3.4 Module Giao diện (UI/UX)
- **REQ-4.1:** Reader phải hỗ trợ bật/tắt lớp overlay bản dịch.
- **REQ-4.2:** Hiển thị tiến độ xử lý (progress bar) cho từng bước: Upload -> OCR -> Translate.
- **REQ-4.3:** Hỗ trợ xem lại lịch sử dịch theo session hoặc tài khoản.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- Thời gian phản hồi UI < 3 giây.
- Xử lý một trang đơn lẻ (OCR + Dịch) không quá 30 giây (tùy thuộc vào tốc độ API).

### 4.2 Scalability
- Hệ thống có thể mở rộng để hỗ trợ nhiều người dùng đồng thời bằng cách sử dụng hàng đợi (Queue) cho các tác vụ AI nặng.

### 4.3 Security
- Không lưu trữ API Key ở phía Client.
- Kiểm tra định dạng và dung lượng file upload (tối đa 10MB/ảnh).

### 4.4 Reliability
- Hệ thống phải có cơ chế retry khi gọi API thất bại.
- Nếu một file trong batch bị lỗi, các file khác vẫn phải được xử lý bình thường.

---

## 5. Use Case Diagrams & Descriptions
*(Chi tiết các Use Case đã được mô tả sơ bộ trong Vision Document và sẽ được cụ thể hóa trong tài liệu thiết kế chi tiết)*.
