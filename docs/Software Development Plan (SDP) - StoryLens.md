# Software Development Plan (SDP) - StoryLens

## 1. Introduction
### 1.1 Purpose
Tài liệu này mô tả kế hoạch phát triển phần mềm cho dự án StoryLens, bao gồm các giai đoạn phát triển, quy trình, tài nguyên, lịch trình và quản lý rủi ro. Mục tiêu là cung cấp một lộ trình rõ ràng cho đội ngũ phát triển để xây dựng hệ thống StoryLens một cách hiệu quả và có tổ chức.

### 1.2 Scope
Kế hoạch này áp dụng cho toàn bộ quá trình phát triển hệ thống StoryLens, từ giai đoạn thiết kế đến triển khai và bảo trì ban đầu. Các thành phần chính bao gồm frontend, backend, các module AI (OCR, Translation, RAG Q&A) và cơ sở dữ liệu.

### 1.3 Definitions, Acronyms, and Abbreviations
| Thuật ngữ | Định nghĩa |
| :--- | :--- |
| **SDP** | Software Development Plan - Kế hoạch phát triển phần mềm. |
| **SRS** | Software Requirements Specification - Đặc tả yêu cầu phần mềm. |
| **SAD** | Software Architecture Document - Tài liệu kiến trúc phần mềm. |
| **MVP** | Minimum Viable Product - Sản phẩm khả dụng tối thiểu. |
| **CI/CD** | Continuous Integration/Continuous Deployment - Tích hợp liên tục/Triển khai liên tục. |

---

## 2. Project Organization
### 2.1 Team Structure
Đội ngũ phát triển dự kiến bao gồm:
- **Project Lead:** Quản lý tổng thể dự án, điều phối các hoạt động, đảm bảo tiến độ và chất lượng.
- **Backend Developers:** Phát triển các API, tích hợp AI modules, quản lý cơ sở dữ liệu.
- **Frontend Developers:** Phát triển giao diện người dùng (UI/UX), tích hợp API backend.
- **AI/ML Engineers:** Tinh chỉnh và tích hợp các mô hình AI (YOLOv8, Manga-OCR, Gemini API, RAG).
- **QA Engineer:** Lập kế hoạch kiểm thử, thực hiện kiểm thử và báo cáo lỗi.

### 2.2 Roles and Responsibilities
| Vai trò | Trách nhiệm chính |
| :--- | :--- |
| **Project Lead** | Quản lý dự án, lập kế hoạch, giám sát tiến độ, quản lý rủi ro, giao tiếp với các bên liên quan. |
| **Backend Dev** | Thiết kế và triển khai API, xử lý logic nghiệp vụ, tích hợp cơ sở dữ liệu và các dịch vụ AI. |
| **Frontend Dev** | Thiết kế và triển khai giao diện người dùng, đảm bảo trải nghiệm người dùng tốt. |
| **AI/ML Engineer** | Nghiên cứu, phát triển và tích hợp các mô hình AI, tối ưu hiệu suất AI. |
| **QA Engineer** | Phát triển test cases, thực hiện kiểm thử chức năng và phi chức năng, đảm bảo chất lượng sản phẩm. |

---

## 3. Development Process
### 3.1 Methodology
Dự án sẽ áp dụng phương pháp phát triển **Agile (Scrum)**, với các sprint kéo dài 1-2 tuần. Mỗi sprint sẽ bao gồm các hoạt động lập kế hoạch, phát triển, kiểm thử và đánh giá.

### 3.2 Phases of Development
1.  **Giai đoạn 1: Khởi tạo & Lập kế hoạch (Inception & Planning)**
    - Thu thập yêu cầu, phân tích Vision Document.
    - Lập SRS, SDP, SAD ban đầu.
    - Thiết lập môi trường phát triển.

2.  **Giai đoạn 2: Thiết kế (Design)**
    - Thiết kế kiến trúc hệ thống chi tiết.
    - Thiết kế cơ sở dữ liệu.
    - Thiết kế API và giao diện người dùng.

3.  **Giai đoạn 3: Phát triển (Development)**
    - Triển khai Frontend (React/Vite).
    - Triển khai Backend (FastAPI).
    - Tích hợp các module AI (YOLOv8, Manga-OCR, Gemini API, RAG).
    - Phát triển các tính năng Batch Upload, History Management.

4.  **Giai đoạn 4: Kiểm thử (Testing)**
    - Kiểm thử đơn vị (Unit Testing).
    - Kiểm thử tích hợp (Integration Testing).
    - Kiểm thử hệ thống (System Testing).
    - Kiểm thử chấp nhận người dùng (User Acceptance Testing - UAT).

5.  **Giai đoạn 5: Triển khai & Bảo trì (Deployment & Maintenance)**
    - Triển khai hệ thống lên môi trường production (Railway/Render).
    - Giám sát hiệu suất và lỗi.
    - Cập nhật và bảo trì hệ thống.

### 3.3 Tools and Technologies
- **Frontend:** React, Vite, TypeScript, TailwindCSS.
- **Backend:** FastAPI, Python.
- **Database:** ChromaDB/FAISS (in-memory cho MVP, có thể nâng cấp persisted storage).
- **AI/ML:** YOLOv8, Manga-OCR, Gemini API, Sentence Transformers.
- **Version Control:** Git, GitHub.
- **Project Management:** Jira/Trello (hoặc công cụ tương đương).
- **CI/CD:** GitHub Actions (hoặc công cụ tương đương).

---

## 4. Schedule
*(Lịch trình chi tiết sẽ được xây dựng dựa trên các sprint cụ thể và nguồn lực thực tế. Dưới đây là ước tính sơ bộ cho MVP)*

| Giai đoạn | Thời gian ước tính |
| :--- | :--- |
| **Khởi tạo & Lập kế hoạch** | 1 tuần |
| **Thiết kế** | 2 tuần |
| **Phát triển** | 6-8 tuần |
| **Kiểm thử** | 2 tuần |
| **Triển khai & Bảo trì** | Liên tục |

---

## 5. Resource Management
### 5.1 Human Resources
- Đội ngũ phát triển như đã mô tả ở mục 2.1.

### 5.2 Software and Hardware Resources
- **Phần mềm:** Các công cụ và công nghệ đã liệt kê ở mục 3.3.
- **Phần cứng:** Máy tính cá nhân cho các thành viên, môi trường cloud (Railway/Render) cho triển khai.
- **AI/ML:** Ưu tiên CPU/free-tier cho MVP; Kaggle GPU dùng cho training/evaluation.

---

## 6. Risk Management
| Rủi ro | Mức độ | Biện pháp giảm thiểu |
| :--- | :--- | :--- |
| **API Quota/Chi phí LLM** | Cao | Giám sát chặt chẽ việc sử dụng API, tối ưu hóa prompt, triển khai hàng đợi cho các tác vụ nặng, xem xét các giải pháp LLM thay thế. |
| **Độ chính xác AI thấp** | Trung bình | Thu thập thêm dữ liệu huấn luyện, tinh chỉnh mô hình, triển khai cơ chế cảnh báo chất lượng và fallback. |
| **Thay đổi yêu cầu** | Trung bình | Áp dụng phương pháp Agile, thường xuyên giao tiếp với các bên liên quan, quản lý thay đổi chặt chẽ. |
| **Vấn đề bản quyền** | Trung bình | Cảnh báo người dùng về việc sử dụng nội dung có bản quyền, không lưu trữ nội dung gốc lâu dài, không phát tán bản dịch. |
| **Hiệu suất hệ thống** | Trung bình | Tối ưu hóa code, sử dụng caching, triển khai load balancing (khi cần), giám sát hiệu suất liên tục. |

---

## 7. Quality Assurance
- Thực hiện review code định kỳ.
- Áp dụng các quy trình kiểm thử đã nêu ở mục 3.2.
- Sử dụng các công cụ phân tích tĩnh code.
- Đảm bảo tuân thủ các tiêu chuẩn mã hóa và thiết kế.

---

## 8. Configuration Management
- Sử dụng Git để quản lý mã nguồn.
- Mọi thay đổi đều phải thông qua pull request và code review.
- Đánh số phiên bản cho các bản phát hành.

---

## 9. Documentation Plan
- **Vision Document:** Đã hoàn thành.
- **SRS:** Đã hoàn thành.
- **SDP:** Đang thực hiện.
- **SAD:** Sẽ được tạo trong giai đoạn tiếp theo.
- **API Specification:** Sẽ được tạo sau khi thiết kế API.
- **Use Case Descriptions:** Chi tiết hóa các use case.
- **Deployment Guide:** Hướng dẫn triển khai hệ thống.
- **Security Policy:** Chính sách bảo mật.
- **QA Checklist & Demo Script:** Hỗ trợ kiểm thử và demo.
