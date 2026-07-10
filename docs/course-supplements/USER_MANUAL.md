# StoryLens — Hướng dẫn sử dụng (User Manual)

> Hướng dẫn cho **người dùng cuối** (khác `Deployment Guide` dành cho vận hành). Đáp ứng yêu cầu
> *user manual & training materials* của LN02 (giai đoạn Deployment/Maintenance).

## 1. StoryLens là gì
Web app **dịch manga tự động** (Nhật/Trung → Việt) + đọc có overlay bản dịch, **hỏi‑đáp AI** về nội
dung, **nghe truyện** bằng giọng AI, và **xuất bản** chương ra thư viện công khai.

## 2. Bắt đầu
1. Mở web → **Đăng ký** (email + mật khẩu) hoặc **Đăng nhập**. (Quên mật khẩu → *Forgot password*.)
2. Mỗi tài khoản **FREE** có **5 credit/ngày** (nạp lại 00:00 giờ VN). 1 credit = 1 lần dịch **hoặc** 1
   câu hỏi **hoặc** 1 trang nghe.

## 3. Dịch & đọc truyện
1. Vào **Upload** → kéo‑thả ảnh trang manga (`jpg/png/webp`, ≤ 20 MB/ảnh).
2. Chờ thanh tiến độ (dịch chạy nền, cập nhật realtime). Trang xong → mở **Reader**.
3. Trong Reader:
   - **Overlay** bản dịch trên bong bóng; phím **O** bật/tắt, **+/‑** phóng to/thu nhỏ.
   - **Sửa bản dịch:** bấm vào bong bóng để chỉnh (lưu lịch sử, hoàn tác được).
   - **Từ điển:** double‑click bong bóng để xem nghĩa từng từ + romaji + cách dịch khác.
   - **★ Bookmark** để lưu trang; **"Tiếp tục đọc"** ở trang chủ đưa bạn về chỗ đang đọc.

## 4. Hỏi‑đáp AI (Q&A)
- Vào **Q&A**, nhập câu hỏi về nội dung truyện → nhận câu trả lời **kèm trích dẫn** (bấm vào trích
  dẫn để nhảy tới đúng trang). Trừ 1 credit/câu.

## 5. Nghe truyện (Listen mode) 🔊
1. Trong Reader, bấm **"Nghe"** (cạnh nút bookmark).
2. Chọn **engine giọng** (Microsoft / Offline / XTTS) + **giọng** (nam/nữ VN…).
3. Bấm **"Tạo & nghe trang này"** → AI kể lại diễn biến trang + đọc thoại; nghe bằng trình phát tích hợp.
   - Nếu AI mô tả tạm ngưng, hệ thống **đọc thẳng lời thoại** (gắn nhãn "đọc thoại").

## 6. Thư viện & cộng đồng
- **Publish** chương đã dịch để mọi người đọc ở **/library**; người khác có thể **comment**.
- **Forum**: thảo luận, hỏi đáp, đề xuất; vote & mention `@user`.

## 7. Tài khoản & quyền riêng tư
- **Hồ sơ/Bảo mật:** đổi mật khẩu, đổi email, **xuất toàn bộ dữ liệu (GDPR export)**, **xoá tài khoản**
  vĩnh viễn.
- Ảnh bạn tải lên để **riêng tư** (chỉ bạn xem qua liên kết ký hạn chế).

## 8. Nâng cấp
- Hết credit? Nâng gói **Basic/Pro/Premium** (nhiều credit hơn) ở **/plans** (nếu bật thanh toán), hoặc
  đợi nạp lại ngày hôm sau.

## 9. Xử lý sự cố nhanh
| Hiện tượng | Cách xử lý |
|---|---|
| "Không đủ credit" (402) | Đợi 00:00 nạp lại, hoặc nâng gói |
| Ảnh bị từ chối | Kiểm định dạng (`jpg/png/webp`) và dung lượng (≤ 20 MB) |
| Trang tải chậm lần đầu | Backend free‑tier có thể "ngủ" ~30–60 s (cold start), thử lại |
| Nghe truyện không ra tiếng | Bấm nút play của trình phát; thử đổi engine giọng |
