# Security Policy - StoryLens

## 1. Introduction
### 1.1 Purpose
Tài liệu này định nghĩa các chính sách và quy trình bảo mật cho hệ thống StoryLens. Mục tiêu là bảo vệ thông tin nhạy cảm, đảm bảo tính toàn vẹn và khả dụng của hệ thống, đồng thời tuân thủ các quy định pháp luật liên quan đến quyền riêng tư và bảo mật dữ liệu.

### 1.2 Scope
Chính sách này áp dụng cho tất cả các thành phần của hệ thống StoryLens, bao gồm ứng dụng web (frontend và backend), cơ sở dữ liệu, các dịch vụ AI, hạ tầng triển khai và tất cả nhân sự có liên quan đến việc phát triển, vận hành và bảo trì hệ thống.

---

## 2. Information Classification

| Phân loại | Mô tả | Ví dụ |
| :--- | :--- | :--- |
| **Công khai (Public)** | Thông tin có thể được chia sẻ rộng rãi mà không gây rủi ro. | Mô tả sản phẩm, thông tin liên hệ chung. |
| **Nội bộ (Internal)** | Thông tin chỉ dành cho nhân viên và các bên liên quan được ủy quyền. | Mã nguồn, tài liệu thiết kế, kế hoạch phát triển. |
| **Bí mật (Confidential)** | Thông tin nhạy cảm, cần được bảo vệ nghiêm ngặt. | API Keys, thông tin xác thực người dùng, dữ liệu người dùng cá nhân, lịch sử dịch. |

---

## 3. Access Control

### 3.1 User Authentication
- Người dùng phải xác thực để truy cập các tính năng yêu cầu quyền (ví dụ: xem lịch sử dịch, batch upload).
- Mật khẩu phải được lưu trữ dưới dạng hash và salt, không lưu trữ dưới dạng văn bản rõ ràng.
- Khuyến khích sử dụng xác thực đa yếu tố (MFA) nếu có thể triển khai trong tương lai.

### 3.2 Authorization
- Hệ thống sẽ áp dụng mô hình kiểm soát truy cập dựa trên vai trò (Role-Based Access Control - RBAC) để phân quyền cho các loại người dùng khác nhau (ví dụ: người dùng thông thường, content creator, admin).
- Người dùng chỉ được phép truy cập vào dữ liệu và chức năng mà họ có quyền.

### 3.3 API Key Management
- Tất cả các API Keys (ví dụ: Gemini API Key) phải được lưu trữ an toàn trong biến môi trường hoặc dịch vụ quản lý bí mật (secret management service), không được hardcode trong mã nguồn.
- Quyền truy cập vào các biến môi trường này phải được giới hạn nghiêm ngặt.

---

## 4. Data Security

### 4.1 Data at Rest
- Dữ liệu nhạy cảm trong cơ sở dữ liệu (ví dụ: lịch sử dịch, thông tin cá nhân) phải được mã hóa.
- Dữ liệu được lưu trữ trên các dịch vụ cloud phải tuân thủ các tiêu chuẩn bảo mật của nhà cung cấp dịch vụ.

### 4.2 Data in Transit
- Tất cả các giao tiếp giữa frontend và backend, cũng như giữa các dịch vụ nội bộ, phải được mã hóa bằng HTTPS/TLS.

### 4.3 Data Retention and Deletion
- Dữ liệu người dùng sẽ được lưu trữ trong khoảng thời gian cần thiết cho mục đích sử dụng và tuân thủ quy định pháp luật.
- Người dùng có quyền yêu cầu xóa dữ liệu cá nhân của họ khỏi hệ thống.

### 4.4 Input Validation
- Tất cả các dữ liệu đầu vào từ người dùng (đặc biệt là file upload và các trường văn bản) phải được kiểm tra và làm sạch để ngăn chặn các cuộc tấn công như SQL Injection, Cross-Site Scripting (XSS), và tải lên file độc hại.
- Giới hạn định dạng và kích thước file upload (ví dụ: JPG, PNG, WebP, tối đa 10MB/ảnh).

---

## 5. System Security

### 5.1 Network Security
- Sử dụng tường lửa (firewall) để kiểm soát lưu lượng truy cập vào và ra khỏi hệ thống.
- Hạn chế các cổng (ports) mở chỉ những cổng cần thiết cho hoạt động của ứng dụng.

### 5.2 Vulnerability Management
- Thực hiện quét lỗ hổng bảo mật định kỳ cho ứng dụng và hạ tầng.
- Cập nhật các thư viện và phụ thuộc lên phiên bản mới nhất để vá các lỗ hổng đã biết.

### 5.3 Logging and Monitoring
- Hệ thống phải ghi lại các sự kiện bảo mật quan trọng (ví dụ: đăng nhập thành công/thất bại, truy cập trái phép, lỗi hệ thống).
- Các log phải được giám sát liên tục để phát hiện sớm các hoạt động đáng ngờ.

### 5.4 Incident Response
- Xây dựng kế hoạch ứng phó sự cố bảo mật để xử lý nhanh chóng và hiệu quả khi có sự cố xảy ra.
- Kế hoạch này bao gồm các bước phát hiện, phân tích, ngăn chặn, khắc phục và phục hồi.

---

## 6. Compliance
- Hệ thống sẽ tuân thủ các quy định về bảo vệ dữ liệu cá nhân (ví dụ: GDPR, CCPA) nếu áp dụng.
- Cảnh báo người dùng về việc sử dụng nội dung có bản quyền và không khuyến khích phát tán trái phép.

---

## 7. Employee Training and Awareness
- Tất cả nhân sự có quyền truy cập vào hệ thống hoặc dữ liệu nhạy cảm phải được đào tạo về các chính sách và quy trình bảo mật.
- Nâng cao nhận thức về các mối đe dọa bảo mật và các biện pháp phòng ngừa.
