# API Specification (OpenAPI/Swagger) - StoryLens

## 1. Introduction
### 1.1 Purpose
Tài liệu này mô tả các giao diện lập trình ứng dụng (API) cho hệ thống StoryLens, tuân thủ theo tiêu chuẩn OpenAPI/Swagger. Mục tiêu là cung cấp một tài liệu tham khảo rõ ràng cho các nhà phát triển frontend, backend và các hệ thống tích hợp khác để hiểu cách tương tác với các dịch vụ của StoryLens.

### 1.2 Scope
Tài liệu này bao gồm các API chính cho các chức năng cốt lõi của StoryLens, bao gồm upload ảnh manga, truy xuất kết quả dịch, quản lý lịch sử và hỏi đáp RAG. Các API được thiết kế theo phong cách RESTful.

### 1.3 Base URL
`https://api.storylens.com/v1` (ví dụ)

---

## 2. Authentication
Hiện tại, hệ thống sử dụng session-based authentication cho người dùng có đăng nhập. Đối với các tác vụ không yêu cầu đăng nhập (anonymous session), hệ thống sẽ tạo một session tạm thời.

---

## 3. API Endpoints

### 3.1 Upload Manga Image
Cho phép người dùng tải lên một hoặc nhiều ảnh manga để xử lý.

- **Endpoint:** `/upload`
- **Method:** `POST`
- **Description:** Tải lên ảnh manga để hệ thống tự động phát hiện bubble, OCR và dịch.
- **Request Body:**
    - `file`: (multipart/form-data) Một hoặc nhiều file ảnh (JPG, PNG, WebP).
- **Responses:**
    - **`202 OK` - Processing Started:**
        ```json
        {
          "message": "Upload successful, processing started.",
          "page_ids": ["page_123", "page_456"],
          "batch_id": "batch_789" (optional, if batch upload)
        }
        ```
    - **`400 Bad Request` - Invalid File:**
        ```json
        {
          "detail": "Invalid file format or size. Max 10MB per image."
        }
        ```

### 3.2 Get Processing Status
Truy xuất trạng thái xử lý của một trang hoặc một batch các trang.

- **Endpoint:** `/status/{page_id}` hoặc `/status/batch/{batch_id}`
- **Method:** `GET`
- **Description:** Lấy trạng thái xử lý hiện tại của một trang hoặc toàn bộ batch.
- **Parameters:**
    - `page_id`: (path) ID của trang cần kiểm tra trạng thái.
    - `batch_id`: (path) ID của batch cần kiểm tra trạng thái.
- **Responses:**
    - **`200 OK` - Status Retrieved:**
        ```json
        {
          "page_id": "page_123",
          "status": "translated", // pending, ocr_failed, translated, completed
          "progress": 80, // percentage
          "error": null // if any error occurred
        }
        ```
    - **`404 Not Found` - Page/Batch Not Found:**
        ```json
        {
          "detail": "Page or Batch not found."
        }
        ```

### 3.3 Get Translated Manga Page
Truy xuất dữ liệu của một trang manga đã được xử lý, bao gồm ảnh gốc, bounding boxes và bản dịch.

- **Endpoint:** `/page/{page_id}`
- **Method:** `GET`
- **Description:** Lấy dữ liệu của một trang manga đã dịch.
- **Parameters:**
    - `page_id`: (path) ID của trang manga.
- **Responses:**
    - **`200 OK` - Page Data Retrieved:**
        ```json
        {
          "page_id": "page_123",
          "original_image_url": "https://cdn.storylens.com/images/original/page_123.jpg",
          "processed_data": [
            {
              "bbox": [10, 20, 100, 50], // [x, y, width, height]
              "original_text": "こんにちは",
              "translated_text": "Xin chào",
              "confidence": 0.95
            },
            // ... more bubbles
          ],
          "metadata": {
            "series_id": "series_abc",
            "chapter_id": "chapter_xyz",
            "page_number": 1
          }
        }
        ```
    - **`404 Not Found` - Page Not Found:**
        ```json
        {
          "detail": "Page data not found or not yet processed."
        }
        ```

### 3.4 Ask Question (RAG Q&A)
Cho phép người dùng đặt câu hỏi về nội dung của một trang hoặc series manga đã được xử lý.

- **Endpoint:** `/qa`
- **Method:** `POST`
- **Description:** Gửi câu hỏi về nội dung truyện và nhận câu trả lời từ AI.
- **Request Body:**
    ```json
    {
      "question": "Nhân vật chính tên gì?",
      "page_id": "page_123", // Optional, if question is about a specific page
      "series_id": "series_abc" // Optional, if question is about a series
    }
    ```
- **Responses:**
    - **`200 OK` - Answer Retrieved:**
        ```json
        {
          "question": "Nhân vật chính tên gì?",
          "answer": "Nhân vật chính tên là [Tên nhân vật] theo nội dung truyện.",
          "source_chunks": [
            "chunk_id_1", "chunk_id_2"
          ] // Optional: IDs of chunks used for answer
        }
        ```
    - **`400 Bad Request` - Missing Context:**
        ```json
        {
          "detail": "Không đủ thông tin để trả lời câu hỏi này."
        }
        ```

### 3.5 Get History
Truy xuất lịch sử các trang hoặc series đã được xử lý bởi người dùng.

- **Endpoint:** `/history`
- **Method:** `GET`
- **Description:** Lấy danh sách các trang hoặc series đã được xử lý.
- **Parameters:**
    - `type`: (query) `page` hoặc `series` (mặc định: `page`)
    - `limit`: (query) Số lượng kết quả trả về tối đa (mặc định: 10)
    - `offset`: (query) Vị trí bắt đầu lấy kết quả (mặc định: 0)
- **Responses:**
    - **`200 OK` - History Retrieved:**
        ```json
        {
          "total": 50,
          "items": [
            {
              "id": "page_123",
              "type": "page",
              "title": "Manga Title - Chapter X - Page Y",
              "thumbnail_url": "https://cdn.storylens.com/thumbnails/page_123.jpg",
              "last_accessed": "2026-05-11T10:00:00Z"
            },
            // ... more history items
          ]
        }
        ```
    - **`401 Unauthorized` - Not Logged In:**
        ```json
        {
          "detail": "Authentication required."
        }
        ```

---

## 4. Error Handling

Các lỗi sẽ được trả về dưới dạng JSON với trường `detail` mô tả lỗi.

| HTTP Status Code | Mô tả |
| :--- | :--- |
| **`400 Bad Request`** | Yêu cầu không hợp lệ (ví dụ: thiếu tham số, định dạng sai). |
| **`401 Unauthorized`** | Yêu cầu xác thực. |
| **`403 Forbidden`** | Người dùng không có quyền truy cập tài nguyên. |
| **`404 Not Found`** | Tài nguyên không tồn tại. |
| **`429 Too Many Requests`** | Vượt quá giới hạn tần suất yêu cầu (rate limit). |
| **`500 Internal Server Error`** | Lỗi không xác định từ phía server. |
| **`503 Service Unavailable`** | Dịch vụ không khả dụng tạm thời. |

---

## 5. Data Models

### PageData
```json
{
  "page_id": "string",
  "original_image_url": "string",
  "processed_data": [
    {
      "bbox": [number, number, number, number], // [x, y, width, height]
      "original_text": "string",
      "translated_text": "string",
      "confidence": number // OCR/Translation confidence
    }
  ],
  "metadata": {
    "series_id": "string",
    "chapter_id": "string",
    "page_number": number
  }
}
```

### HistoryItem
```json
{
  "id": "string",
  "type": "string", // "page" or "series"
  "title": "string",
  "thumbnail_url": "string",
  "last_accessed": "string" // ISO 8601 format
}
```
