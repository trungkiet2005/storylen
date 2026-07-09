# Script thuyết trình — StoryLens (PA5)

**Môn CSC10011 – Công nghệ phần mềm cho hệ thống Trí tuệ Nhân tạo · HCMUS · GVHD: GS.TS Nguyễn Văn Vũ, ThS. Trương Phước Lộc, ThS. Ngô Ngọc Đăng Khoa**
**Nhóm 1 · Ngày báo cáo: 10/07/2026**

> Kịch bản đọc thuyết trình cho **6 thành viên**, mỗi bạn một phần (PA5 yêu cầu ai cũng phải trình bày ≥ 3 phút).
> Phần lời để **đọc gần như nguyên văn** in trong khung `>` ; phần `[…]` là chỉ dẫn (không đọc).
> **Tổng thời lượng mục tiêu ≈ 15 phút (gồm demo) + ~10 phút Q&A.** Bản này đã được viết **chi tiết đầy đủ hơn**, bám sát số liệu và nội dung từng slide (28 slide) — các ý đánh dấu *có thể lược* cho phép co giãn nếu vượt 15 phút; nếu thầy cho thêm thời gian, đọc hết sẽ khớp ~17–18 phút. In A4, mỗi thành viên giữ trang của mình.

## Bảng phân công

| Thành viên | MSSV | Vai trò | Slide | Thời lượng |
| --- | --- | --- | --- | --- |
| **Đào Sỹ Duy Minh** | 23122041 | Project Manager & AI/ML (fine-tune OCR, prompt dịch) — mở đầu, định vị | 1 – 5 | ~2,5–3 phút |
| **Nguyễn Lâm Phú Quý** | 23122048 | QA & Business Analyst — người dùng, use case, yêu cầu | 6 – 10 | ~2,5–3 phút |
| **Phạm Phú Hòa** | 23122030 | AI/ML Engineer (RAG) — kiến trúc & lõi AI | 11 – 14 | ~3 phút |
| **Trần Chí Nguyên** | 23122044 | Frontend Developer — công nghệ, tính năng & demo | 15 – 19 | ~3,5 phút |
| **Nguyễn Đình Hà Dương** | 23122002 | AI/ML Engineer (OCR) — quy trình, tổ chức nhóm, kiểm thử, bảo mật | 20 – 23 | ~2,5–3 phút |
| **Huỳnh Trung Kiệt** | 23122039 | Backend Developer — triển khai, hạn chế & tổng kết | 24 – 28 | ~2,5–3 phút |

> **Có thể hoán đổi:** cặp AI (Phú Hòa ↔ Hà Dương) có thể đổi khối slide 11–14 và 20–23, hoặc cùng đứng trả lời phần AI khi Q&A. Ai làm phần nào nắm chắc phần đó — vì đây đúng là mảng bạn đó trực tiếp code.

## Mẹo trình bày chung
- Nói **chậm, rõ**, nhìn về phía thầy và khán giả — script để trấn an, đừng cúi đọc liên tục.
- Khi chuyển người: bước sang một bên, người kế tiếp bước lên; đọc đúng **câu chuyển tiếp (➡️)**.
- Con số là điểm mạnh của nhóm — nhấn giọng ở **95,3%**, **6,1%**, **3 dịch vụ**, **CI 5 job**, **768 chiều**, **9 nhóm yêu cầu**.
- Nếu quá giờ: các ý đánh dấu *có thể lược* được phép bỏ để giữ nhịp 15 phút; ưu tiên giữ lại số liệu và câu chuyển tiếp.
- Mỗi slide trong script đều ghi rõ **[Slide N — Tên slide]** để bạn lật đúng slide khi nói, tránh nói lố sang slide sau.

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## 👤 Đào Sỹ Duy Minh — Project Manager & AI/ML · Slide 1–5 · ~2,5–3 phút

### [Slide 1 — Trang bìa]
> Em xin kính chào thầy và các bạn. Nhóm 1 chúng em xin trình bày đồ án cuối kỳ môn Công nghệ phần mềm cho hệ thống Trí tuệ Nhân tạo. Đề tài của nhóm là **StoryLens — nền tảng AI dịch và hỏi–đáp manga theo ngữ cảnh**. Sản phẩm cho phép người dùng **tải trang truyện lên → hệ thống tự động phát hiện bong bóng thoại, đọc chữ, xoá nền, dịch từ tiếng Nhật/Trung sang tiếng Việt → rồi đọc bằng giao diện overlay và hỏi–đáp bằng AI**. Em là Đào Sỹ Duy Minh, nhóm trưởng kiêm phụ trách AI/ML, sẽ mở đầu phần trình bày.

### [Slide 2 — Nội dung]
> Bài trình bày gồm **5 phần**: phần **I** là bối cảnh và vấn đề; phần **II** là người dùng, use case và yêu cầu hệ thống; phần **III** là kiến trúc và phần lõi AI; phần **IV** là hiện thực, tính năng, demo và chất lượng phần mềm; và phần **V** là kết quả, hạn chế và hướng phát triển. Toàn bộ khoảng **15 phút**, sau đó nhóm xin sẵn sàng cho phần hỏi–đáp khoảng **10 phút**. Mỗi thành viên trong nhóm sẽ trình bày ít nhất một phần. Em xin bắt đầu với phần một.

### [Slide 3 — Bối cảnh & Vấn đề]
> Cộng đồng đọc manga ở Việt Nam, chủ yếu **độ tuổi 15–28**, rất lớn, nhưng đang gặp ba rào cản chính. Một là **bản dịch fan-sub ra chậm và chất lượng không đều**, nhiều bộ truyện bị bỏ dở giữa chừng vì nhóm dịch không đủ nhân lực. Hai là các công cụ dịch tự động như Google Lens **dịch từng câu, mất ngữ cảnh** — không giữ được xưng hô của nhân vật hay mạch truyện, còn DeepL hay ChatGPT thì phải thao tác thủ công từng ảnh. Ba là người đọc **không có cách nào hỏi ngay về nội dung** truyện — ví dụ muốn hỏi "nhân vật này là ai" nhưng không có kênh tra cứu tức thời. Nói gọn lại bằng một câu: thị trường **thiếu một nền tảng dịch manga tự động vừa hiểu ngữ cảnh, vừa hỏi–đáp thông minh**.

### [Slide 4 — Giải pháp]
> StoryLens giải quyết đúng ba điểm đau đó. Tuyên ngôn định vị của nhóm là: cho **người đọc manga Việt 15–28 tuổi** muốn đọc truyện Nhật chưa có bản dịch chính thức, StoryLens cho phép **tải trang truyện lên, tự động dịch sang tiếng Việt có ngữ cảnh, và hỏi AI bất kỳ điều gì về nội dung**. Bốn giá trị cốt lõi là: **một**, dịch giữ ngữ cảnh — xưng hô, mạch truyện và sắc thái được xử lý theo cả trang chứ không phải từng câu rời rạc; **hai**, đọc overlay liền mạch — bản dịch phủ đúng vào bong bóng, bật/tắt được để so sánh với bản gốc; **ba**, hỏi–đáp bằng kỹ thuật RAG — hỏi về nội dung và AI trả lời kèm nguồn trích; và **bốn**, một hệ sinh thái cộng đồng — thư viện xuất bản, chia sẻ link, diễn đàn thảo luận.

### [Slide 5 — So sánh cạnh tranh]
> So với các lựa chọn hiện có: **Google Lens** dịch ảnh nhanh nhưng không hiểu ngữ cảnh, không hỏi–đáp, không có chế độ đọc overlay; **DeepL hay ChatGPT** thì phải thao tác thủ công từng ảnh, chỉ hiểu ngữ cảnh một phần và không hỏi–đáp thời gian thực; còn **fan-sub thủ công** tuy giữ ngữ cảnh tốt nhưng chậm và không hỏi–đáp được. **Chỉ StoryLens có đủ cả bốn tiêu chí: dịch tự động, hiểu ngữ cảnh cả trang, hỏi–đáp bằng RAG, và đọc overlay.** Bài học của nhóm là kết hợp tốc độ của máy với độ chính xác giữ ngữ cảnh, cộng thêm khả năng hỏi–đáp mà chưa đối thủ nào có.
>
> ➡️ Để nói rõ hơn về người dùng và yêu cầu hệ thống, em xin mời bạn Nguyễn Lâm Phú Quý.

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## 👤 Nguyễn Lâm Phú Quý — QA & Business Analyst · Slide 6–10 · ~2,5–3 phút

### [Slide 6 — Người dùng mục tiêu]
> Em xin chào thầy và các bạn, em là Nguyễn Lâm Phú Quý, phụ trách tài liệu và kiểm thử. Nhóm xác định ba nhóm người dùng chính. Một là **sinh viên đại học, 18–25 tuổi**, muốn đọc manga Nhật, kiểm tra bản dịch và tìm hiểu nội dung sâu — họ mong đợi **dịch chính xác** và AI trả lời chi tiết về nhân vật, cốt truyện. Hai là **học sinh THPT, 15–18 tuổi**, đọc truyện mới và thảo luận với bạn bè — cần **giao diện dễ dùng, dịch nhanh** và hỏi được về cốt truyện. Ba là **content creator, 25–35 tuổi**, làm video review manga, cần xử lý **cả chương một lúc** và sẵn sàng trả phí gói premium. Điểm chung của cả ba nhóm là: cần **dịch chính xác** và **hỏi được về nội dung**.

### [Slide 7 — Use case chính]
> Hệ thống có sáu use case chính. **UC01 – Upload và dịch trang**: tải một trang, pipeline AI phát hiện, đọc chữ, xoá nền, dịch, và render chữ Việt vào bong bóng. **UC02 – Đọc overlay**: xem bản dịch phủ đúng bong bóng, bật/tắt so sánh, sao chép văn bản, mở từ điển bong bóng, nhiều chế độ đọc. **UC03 – Xử lý batch cả chương**: chọn nhiều trang cùng lúc, xử lý tuần tự, tiến trình cập nhật thời gian thực qua WebSocket. Ngoài ba use case trọng tâm đó, còn có **UC04 – Hỏi–đáp RAG**: đặt câu hỏi, tìm ngữ nghĩa trong pgvector rồi Gemini trả lời; **UC05 – Xuất bản và chia sẻ**: đăng chương lên thư viện công khai, chia sẻ link có hạn thời gian; và **UC06 – Quản trị**: phân tích, kiểm duyệt, giám sát sức khoẻ hệ thống. Phần demo lát nữa sẽ tập trung vào UC01, UC02 và UC03 — đã đủ yêu cầu tối thiểu hai use case của PA5.

### [Slide 8 — Sơ đồ use case]
> Đây là sơ đồ use case tổng quát. Có hai **tác nhân chính**: **Người đọc** thực hiện năm use case từ UC01 đến UC05 — tải lên, đọc, batch, hỏi–đáp, xuất bản; và **Quản trị viên** phụ trách UC06 — quản trị hệ thống. Ngoài ra còn một **tác nhân phụ, được ký hiệu «hệ phụ», là AI Module cùng Gemini**, hỗ trợ cho UC01 khi cần dịch và UC04 khi cần trả lời hỏi–đáp. Sơ đồ này chính là khung để nhóm đặc tả yêu cầu chức năng ở slide sau.

### [Slide 9 — Yêu cầu chức năng]
> Về yêu cầu chức năng, nhóm đặc tả **chín nhóm, từ F01 đến F09**. **F01** xác thực và hồ sơ — đăng ký/đăng nhập, cookie HttpOnly, đổi mật khẩu/email, xuất dữ liệu GDPR. **F02** upload ảnh — một ảnh hoặc batch, kiểm tra định dạng và kích thước. **F03** — pipeline AI: detect, OCR, inpaint, dịch, embedding, có trạng thái và phần trăm tiến trình. **F04** reader và overlay — xem, so sánh, sửa từng bong bóng, lưu lịch sử hiệu đính. **F05** hỏi–đáp RAG — hỏi theo trang hoặc cả series, trả lời kèm nguồn trích. **F06** series và chapter — tạo, sắp thứ tự trang, ảnh bìa tự động. **F07** lịch sử — danh sách đã xử lý, lọc, tiếp tục đọc. **F08** credit và gói — free 5 lượt/ngày, các gói basic/pro/premium, ledger giao dịch, tích hợp Stripe. **F09** quản trị — phân tích, quản lý người dùng, kiểm duyệt, giám sát sức khoẻ, audit log. Trong đó **F03 – pipeline AI** và **F05 – hỏi–đáp RAG** là phần lõi trí tuệ nhân tạo của hệ thống. *[có thể lược: đọc lướt F06–F09, chỉ nhấn F03 và F05]*

### [Slide 10 — Yêu cầu phi chức năng]
> Về phi chức năng, nhóm đặt các mục tiêu đo được: giao diện phản hồi **dưới 3 giây**, xử lý AI mỗi trang **dưới 30 giây**, trả lời hỏi–đáp **dưới 10 giây**, và batch xử lý được **từ 5 đến 100 trang tuỳ theo gói**. Về bảo mật: dùng cookie HttpOnly để không lộ token cho JavaScript, phân quyền RBAC kèm RLS trên Supabase, rate-limit và kiểm tra input chặt, không hardcode secret, cùng security headers và CSP chặt, có captcha Turnstile. Về vận hành và toàn vẹn: frontend phục vụ qua CDN Vercel, backend Docker co giãn được; **semaphore giới hạn luồng AI** để tránh tràn bộ nhớ; **ledger credit chỉ ghi thêm** (append-only) để đảm bảo toàn vẹn giao dịch; và hệ thống **tự đánh dấu "failed"** cho trang bị treo khi restart.
>
> ➡️ Tiếp theo, về kiến trúc hệ thống và phần lõi AI, em xin mời bạn Phạm Phú Hòa.

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## 👤 Phạm Phú Hòa — AI/ML (RAG) · Slide 11–14 · ~3 phút

### [Slide 11 — Kiến trúc hệ thống]
> Em chào thầy và các bạn, em là Phạm Phú Hòa, phụ trách phần hỏi–đáp RAG và vector database. StoryLens gồm **ba dịch vụ triển khai độc lập**. **Frontend** dùng Next.js 16, chạy trên Vercel, có các trang Upload, Reader, Q&A, Library, Admin, và một lớp `api.ts` xử lý retry khi backend mới thức dậy (cold start). **Backend** dùng FastAPI, chạy trên Render tại Singapore, gồm các router như auth, upload, qa, series, admin, và các service như ai_pipeline, rag, credit, captcha. **AI Module** — nơi đặt các mô hình nặng khoảng 4GB — chạy trên HuggingFace Spaces, gồm YOLOv8, manga-ocr, LaMa và bước render, đồng thời sinh embedding câu cho pgvector. Ba dịch vụ dùng chung **Supabase** — PostgreSQL với pgvector và pg_trgm, xác thực, và lưu trữ ảnh gốc/thumbnail. Xuyên suốt cả ba là **Google Gemini API**, vừa dịch có ngữ cảnh vừa sinh câu trả lời RAG, xoay vòng nhiều API key. Điểm thiết kế quan trọng: **tách AI Module ra riêng** vì các mô hình nặng tới vài GB, không thể nhét chung vào backend chạy tier miễn phí 512MB.

### [Slide 12 — Pipeline dịch AI]
> Đây là phần lõi. Khi một trang được tải lên — ảnh JPG/PNG/WebP tối đa 10MB — nó đi qua **sáu bước**: **một, YOLOv8** phát hiện bong bóng thoại; **hai, manga-ocr** đọc chữ Nhật trong từng bounding box; **ba, LaMa** xoá chữ gốc khỏi ảnh bằng kỹ thuật inpainting; **bốn, Gemini** dịch có ngữ cảnh sang tiếng Việt; **năm, bước render** vẽ chữ Việt vào đúng khung, dùng kỹ thuật binary-search để chọn cỡ chữ vừa khít bong bóng; và **sáu, sinh embedding** câu lưu vào pgvector để phục vụ hỏi–đáp sau này. Đầu ra là ảnh PNG đã dịch lưu ở bucket manga-thumbnails, kèm bubble_data và embeddings. Toàn bộ chạy nền có **semaphore giới hạn số luồng**, tiến trình cập nhật thời gian thực qua WebSocket, người dùng có thể **huỷ giữa chừng**, và có **fallback sang M2M100/NLLB** nếu Gemini gặp lỗi.

### [Slide 13 — Hỏi–đáp RAG]
> Phần hỏi–đáp là mảng em trực tiếp xây dựng, dùng kỹ thuật **RAG** qua bốn bước. **Một**, người dùng đặt câu hỏi bằng ngôn ngữ tự nhiên về một trang hoặc cả series. **Hai**, câu hỏi được vector hoá bằng Gemini embedding **768 chiều**. **Ba**, hệ thống tìm **cosine similarity top-k** trong pgvector để lấy các đoạn thoại liên quan nhất — chỉ trong phạm vi truyện của đúng người dùng đó. **Bốn**, những đoạn đó cùng câu hỏi được đưa vào Gemini — có xoay vòng key — để **sinh câu trả lời kèm nguồn trích**. Nhờ vậy AI trả lời **dựa trên đúng nội dung truyện**, chứ không bịa. Mỗi câu trả lời thành công trừ **một credit**.

### [Slide 14 — Mô hình ML & kết quả]
> Về kết quả huấn luyện — đây là số liệu thật của nhóm, đánh giá trên bộ **Manga109-s**, tập test 956 ảnh với hơn 14.130 bounding box, ngưỡng đặt ra là 85%. **YOLOv8** phát hiện bong bóng đạt **mAP@0.5 là 95,3%**, mAP@0.5:0.95 đạt 84,4%, precision **97,3%**, recall 93,8% — **đều vượt ngưỡng 85%**. **manga-ocr** sau khi fine-tune, kiểm tra trên cùng 14.130 mẫu, đạt **tỉ lệ lỗi ký tự CER chỉ 6,1%**, tức độ chính xác ký tự **93,9%**, và tỉ lệ khớp chính xác toàn câu 67,5%. Còn **Gemini 2.5 Flash**, nhóm đánh giá bằng human-in-the-loop, đạt trên **80%** mức hài lòng người đánh giá, dùng embedding 768 chiều đồng bộ với phần RAG.
>
> ➡️ Phần công nghệ, các tính năng và demo trực tiếp, em xin mời bạn Trần Chí Nguyên.

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## 👤 Trần Chí Nguyên — Frontend · Slide 15–19 · ~3,5 phút

### [Slide 15 — Ngăn xếp công nghệ]
> Em chào thầy và các bạn, em là Trần Chí Nguyên, phụ trách frontend. Về công nghệ: **frontend** dùng Next.js 16 App Router, React 19, TypeScript, Tailwind kết hợp Framer Motion, và hỗ trợ **PWA đọc offline**. **Backend** dùng FastAPI, Python 3.11, Uvicorn/Gunicorn, giới hạn tần suất bằng SlowAPI, và giám sát bằng **Sentry cùng OpenTelemetry**. Phần **AI/ML** gồm YOLOv8, manga-ocr đã fine-tune, LaMa inpaint và Gemini 2.5 Flash. **Dữ liệu và hạ tầng** dùng Supabase Postgres với pgvector và pg_trgm, triển khai trên Vercel, Render, HuggingFace, tích hợp **CI bằng GitHub Actions**. Điểm đáng nói là hệ thống chạy chủ yếu trên **tier miễn phí hoặc rất rẻ** nhưng vẫn đạt chuẩn một sản phẩm **production thật sự**.

### [Slide 16 — Tính năng nổi bật]
> Ngoài lõi dịch, StoryLens là một hệ sinh thái đầy đủ sáu nhóm tính năng. **Một, Reader nâng cao**: nhiều chế độ đọc, phím tắt, vuốt trên mobile, từ điển bong bóng, cảnh báo khi độ tin cậy OCR thấp. **Hai, Studio QC**: hiệu đính từng bong bóng — duyệt hoặc từ chối — tìm–thay thế hàng loạt, và cơ chế phản hồi tốt/xấu. **Ba, thư viện và chia sẻ**: xuất bản chương công khai, đọc ẩn danh, chia sẻ link có hạn thời gian kèm ảnh OG. **Bốn, cộng đồng**: diễn đàn có nhắc tên bằng @, đính kèm ảnh/video, vote, bình luận chương, và hồ sơ cá nhân dạng /u/username. **Năm, gamification** — nhóm gọi là Wibu: bookmark, đánh giá, danh sách đọc, mục tiêu đọc, cấp độ XP và thành tựu kèm thông báo. **Sáu, credit và thanh toán**: free 5 credit mỗi ngày, các gói basic/pro/premium, thanh toán qua Stripe, và điểm danh streak.

### [Slide 17 — Demo A: Trang chủ & Upload]
> Bây giờ em xin demo trực tiếp. [*Mở trang chủ, rồi vào Upload*] Trang chủ có nền anime động và mục "Tiếp tục đọc". Em đăng nhập tài khoản, vào mục Upload và **kéo–thả một trang manga tiếng Nhật**, chọn cấu hình AI nếu cần. Ngay khi tải lên, pipeline bắt đầu chạy: hệ thống phát hiện bong bóng bằng YOLOv8, đọc chữ bằng manga-ocr, xoá nền bằng LaMa và dịch bằng Gemini — tiến trình hiển thị thời gian thực.

### [Slide 18 — Demo A: Reader & Studio]
> [*Mở Reader*] Sau khi xử lý xong, em mở **Reader**: bản dịch tiếng Việt được **phủ đúng vào từng bong bóng**. Em có thể bật/tắt để so sánh với bản gốc, và mở **từ điển bong bóng** để xem giải nghĩa. Nếu bản dịch cần chỉnh, em vào **Studio QC** để hiệu đính từng bong bóng, tìm–thay thế hàng loạt nếu cần — thao tác này chính là human-in-the-loop mà bạn Phú Hòa vừa nhắc tới.

### [Slide 19 — Demo B: Batch & Hỏi–đáp]
> [*Mở Upload batch, rồi Q&A, Library, Admin*] Với **cả một chương**, em chọn nhiều trang cùng lúc; hệ thống xử lý **tuần tự** và báo tiến trình *x trên N trang* theo thời gian thực. Ở mục **Hỏi–đáp**, em đặt một câu hỏi về nội dung truyện và AI **trả lời kèm nguồn trích**. Chương sau khi dịch có thể **xuất bản lên thư viện** cho người khác đọc, và em cũng xin giới thiệu nhanh bảng điều khiển **Admin** cho phần quản trị.
>
> ➡️ Về quy trình phát triển, tổ chức nhóm và chất lượng phần mềm, em xin mời bạn Nguyễn Đình Hà Dương.

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## 👤 Nguyễn Đình Hà Dương — AI/ML (OCR) · Slide 20–23 · ~2,5–3 phút

### [Slide 20 — Quy trình phát triển]
> Em chào thầy và các bạn, em là Nguyễn Đình Hà Dương, phụ trách dataset và đánh giá độ chính xác OCR. Nhóm áp dụng **RUP rút gọn kết hợp Scrum**, mỗi sprint hai tuần, đi qua bốn pha: **Inception** — xây dựng vision, kế hoạch, weekly report; **Elaboration** — đặc tả use case, kiến trúc, prototype giao diện, test plan; **Construction** — viết source code, test case, ghi nhận defect, báo cáo tiến độ; và **Transition** — triển khai, demo, nộp bài cuối kỳ — chính là giai đoạn hiện tại. Về vai trò mẫu theo RUP, nhóm phân theo năm vai trò: Team Lead/PM lo kế hoạch và weekly report; Business Analyst thu thập và rà soát yêu cầu; Designer phụ trách kiến trúc, UI và tài liệu SAD; ba bạn Implementer viết source code, unit test và review lẫn nhau; và Tester lo test plan, test case, system test. Mỗi tuần nhóm họp **weekly scrum** trả lời ba câu hỏi quen thuộc — tuần trước đã làm gì, đang vướng gì, tuần tới sẽ làm gì — và **mọi pull request đều được review trước khi merge, chỉ merge khi CI xanh**. Còn phân công thực tế cho từng thành viên, em xin trình bày ngay ở slide sau.

### [Slide 21 — Tổ chức nhóm & phân công]
> Nhóm StoryLens gồm **sáu thành viên, tổ chức theo mô hình phẳng** — không phân cấp cứng nhắc, mọi quyết định kỹ thuật quan trọng đều thảo luận tập thể. Cụ thể: **Đào Sỹ Duy Minh** (23122041) là Project Manager kiêm kỹ sư AI/ML, quản lý tiến độ và điều phối nhóm, đồng thời fine-tune OCR cho manga tiếng Nhật và làm prompt engineering cho dịch LLM. **Em — Hà Dương** (23122002) là AI/ML Engineer phần OCR, chuẩn bị và xử lý dataset manga, hỗ trợ fine-tune OCR, đánh giá accuracy và phân tích lỗi. **Huỳnh Trung Kiệt** (23122039) là Backend Developer, xây dựng FastAPI backend, thiết kế cơ sở dữ liệu, tích hợp pipeline OCR/dịch vào server. **Phạm Phú Hòa** (23122030) là AI/ML Engineer phần RAG, tích hợp LLM Gemini, vector database pgvector, và pipeline hỏi–đáp RAG. **Trần Chí Nguyên** (23122044) là Frontend Developer, xây giao diện Next.js/React, màn hình Upload, Reader và Hỏi–đáp. **Nguyễn Lâm Phú Quý** (23122048) là QA & Business Analyst, phụ trách tài liệu như SDP, Vision, Use case, viết test case/test plan, và kiểm thử UAT, end-to-end. *[có thể lược: đọc nhanh, để thầy tự đọc bảng]*

### [Slide 22 — Kiểm thử & CI/CD]
> Về chất lượng, nhóm kiểm thử **nhiều tầng**. Theo yêu cầu của PA5, nhóm dùng **Katalon Studio** viết kịch bản kiểm thử tự động cho hai use case chính — **UC01 upload–dịch** và **UC02 đọc overlay** — mỗi use case ít nhất hai kịch bản, ghi lại kết quả Pass/Fail, nộp kèm test script thành tài liệu riêng. Ngoài ra: **unit và component** bằng Vitest kết hợp React Testing Library; **backend** bằng pytest và respx để giả lập Supabase/Gemini; **end-to-end bằng Playwright** cho các luồng auth, home, protected pages, mobile, forum, edge-cases; cùng **kiểm tra tĩnh** bằng `tsc --noEmit` và ESLint. Tất cả chạy tự động qua **GitHub Actions với năm job song song**: typecheck, lint, production build, Playwright E2E, và backend pytest; chỉ khi **CI xanh và có review** thì code mới được merge vào main.

### [Slide 23 — Bảo mật]
> Bảo mật được làm **nhiều lớp**. Về xác thực: token đăng nhập giữ trong **cookie HttpOnly**, không lộ cho JavaScript, có auto-refresh và hỗ trợ Google OAuth. Về phân quyền: **RBAC user/admin** ở tầng API cùng **RLS** trên mọi bảng dữ liệu người dùng ở Supabase. Về chống lạm dụng: **giới hạn tần suất** bằng SlowAPI theo từng endpoint, và **captcha Turnstile** ở đăng ký, quên mật khẩu. Về header: **security headers và CSP** chặt trên mọi phản hồi, kể cả trang `/docs`. Về upload: dùng Pillow `verify()` để kiểm tra ảnh, chống giả mạo định dạng MIME, chỉ nhận JPEG/PNG/WebP thật. Và cuối cùng, **chặn SSRF**: khi nhập từ nguồn ngoài, module scraper chỉ nhận domain nằm trong danh sách cho phép.
>
> ➡️ Cuối cùng, về triển khai, hạn chế, hướng phát triển và kết luận, em xin mời bạn Huỳnh Trung Kiệt.

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## 👤 Huỳnh Trung Kiệt — Backend · Slide 24–28 · ~2,5–3 phút

### [Slide 24 — Triển khai]
> Em chào thầy và các bạn, em là Huỳnh Trung Kiệt, phụ trách backend và cơ sở dữ liệu. Hệ thống triển khai trên **bốn nền tảng**: **frontend** trên Vercel với CDN toàn cầu; **backend API** trên Render, khu vực Singapore, đóng gói Docker, chạy free tier 512MB; **AI Module** trên HuggingFace Spaces, ảnh Docker khoảng 4GB, deploy thủ công; và **dữ liệu, lưu trữ** trên Supabase, khu vực AWS us-east-1, gồm Postgres, pgvector và Auth. Ba dịch vụ đầu **tự động deploy khi push lên nhánh main**. Về vận hành: nhóm có **keep-alive** ping chống Render/HuggingFace ngủ, **health check** ở `/health` và `/health/deep`, giám sát bằng **Sentry và OpenTelemetry**, cùng **backup** dữ liệu PITR bảy ngày trên Supabase.

### [Slide 25 — Hạn chế & lỗi đã biết]
> Nhóm cũng xin nhìn thẳng vào hạn chế. Về hạn chế: do chạy tier miễn phí nên có **cold start** — Render và HuggingFace Spaces ngủ khi rảnh, lần đầu truy cập có thể chậm 15–60 giây, nhóm đã giảm bằng keep-alive. **Quota Gemini** ở free tier giới hạn số request mỗi ngày nên nhóm xoay vòng nhiều key, throttle và cache, nhưng giờ cao điểm vẫn có thể bị giới hạn. **OCR với chữ hiệu ứng và viết tay** thì độ chính xác còn giảm, đôi khi bong bóng SFX bị bỏ qua. **Bố cục chữ Việt dài** trong bong bóng nhỏ phải thu nhỏ cỡ chữ hoặc cắt bớt, có tooltip xem đầy đủ. Về lỗi đã biết đang xử lý: **token phiên hết hạn giữa chừng**, đôi khi cần tải lại trang, nhóm đang hoàn thiện auto-refresh; **WebSocket mất gói** khi mạng chập chờn thì fallback sang polling, tiến trình có thể nhảy số phần trăm; **signed URL ảnh** có thể hết hạn với phiên đọc rất dài, đã thêm retry tải ảnh; và trên **thiết bị mobile cũ**, nền anime động có thể tụt khung hình, người dùng tắt được trong phần cài đặt.

### [Slide 26 — Hướng phát triển]
> Về hướng phát triển, nhóm dự định: **một**, cải thiện OCR và dịch — fine-tune thêm cho chữ hiệu ứng, chữ viết tay, và hỗ trợ thêm cặp ngôn ngữ như Hàn, Anh. **Hai**, cải thiện thứ tự đọc bong bóng phải-sang-trái cho bố cục phức tạp. **Ba**, nâng độ sẵn sàng — chuyển sang tier trả phí để giảm cold start, dùng hàng đợi tác vụ chuyên dụng. **Bốn**, cá nhân hoá — gợi ý truyện theo lịch sử đọc, cải thiện RAG đa trang và cả series. **Năm**, bổ sung công cụ kiểm duyệt và quy trình **bản quyền, DMCA** rõ ràng. Và **sáu**, đóng gói StoryLens thành **ứng dụng di động**, cải thiện trải nghiệm đọc offline.

### [Slide 27 — Kết luận]
> Tóm lại, StoryLens là **một sản phẩm AI hoàn chỉnh và đang chạy thật**: với **ba dịch vụ triển khai độc lập**, mô hình phát hiện bong bóng đạt **mAP@0.5 là 95,3%**, OCR tiếng Nhật lỗi ký tự chỉ **6,1%**, và **hơn chín nhóm yêu cầu chức năng** đã hiện thực. Nhóm đã xây dựng một **pipeline AI đầu-cuối** — từ phát hiện, OCR, xoá nền, dịch ngữ cảnh, đến hỏi–đáp RAG; áp dụng **kỹ thuật production** như microservice, WebSocket, bảo mật nhiều lớp, CI năm job và giám sát; đồng thời **tuân thủ quy trình công nghệ phần mềm** với RUP rút gọn kết hợp Scrum và tài liệu SAD, SRS, SDP đồng bộ với code thật.

### [Slide 28 — Cảm ơn & Q&A]
> Phần trình bày của nhóm 1 đến đây là hết. **Chúng em xin cảm ơn thầy và các bạn đã lắng nghe, và rất mong nhận được câu hỏi cùng góp ý ạ.**
>
> [*Nếu thầy yêu cầu demo thêm: sẵn sàng mở lại web tại storylens-api.onrender.com, tài khoản demo demo.pa3@storylens.app. Lưu ý đánh thức AI Module (huynhtrungkiet09032005-ai-storylen.hf.space) trước khi demo pipeline dịch.*]

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## 📌 Phụ lục — Chuẩn bị Hỏi & Đáp (ai phụ trách mảng nào trả lời mảng đó)

**1. Vì sao tách AI Module thành dịch vụ riêng? — (Kiệt / Phú Hòa)**
> Vì các mô hình (YOLOv8, manga-ocr, LaMa) nặng vài GB, cần RAM lớn. Backend chạy Render tier miễn phí chỉ 512MB không thể tải nổi. Tách riêng giúp mỗi phần **co giãn độc lập** và không làm sập API chính.

**2. Làm sao đảm bảo chất lượng bản dịch? — (Phú Hòa / Minh)**
> Gemini dịch **theo cả trang** nên giữ được ngữ cảnh, xưng hô. Ngoài ra có **human-in-the-loop**: Studio QC cho phép duyệt/sửa từng bong bóng, cùng cơ chế phản hồi tốt/xấu để cải thiện dần.

**3. YOLOv8 huấn luyện trên dữ liệu gì? — (Hà Dương)**
> Bộ **Manga109-s**, 956 ảnh test với hơn 14.130 bounding box. Kết quả mAP@0.5 đạt 95,3%, mAP@0.5:0.95 đạt 84,4%, precision 97,3%, recall 93,8% — đều vượt ngưỡng 85% nhóm đặt ra.

**4. Nếu Gemini hết quota thì sao? — (Phú Hòa / Kiệt)**
> Nhóm dùng **xoay vòng nhiều API key**, kèm throttle phía client, cache kết quả, và có **fallback sang M2M100/NLLB** khi cần.

**5. Nếu OCR đọc sai chữ thì xử lý thế nào? — (Hà Dương / Nguyên)**
> Người dùng vào **Studio QC sửa tay** từng bong bóng, có thể tìm–thay thế hàng loạt; mọi chỉnh sửa được lưu **lịch sử hiệu đính**. Đây là cơ chế con-người-trong-vòng-lặp.

**6. RAG hoạt động chính xác ra sao? — (Phú Hòa)**
> Câu hỏi được embedding bằng **gemini-embedding-001, 768 chiều** → tìm cosine top-k trong **pgvector**, giới hạn theo đúng người sở hữu → ghép ngữ cảnh + câu hỏi đưa vào Gemini → trả lời **kèm nguồn trích**. Nhờ vậy câu trả lời bám sát nội dung truyện, mỗi câu trả lời thành công trừ 1 credit.

**7. Bảo mật token đăng nhập thế nào? — (Kiệt / Hà Dương)**
> Token đặt trong **cookie HttpOnly**, JavaScript không đọc được nên chống XSS đánh cắp token; kèm RLS ở database và CSP chặt trên mọi response.

**8. Hệ thống chịu tải và tránh sập ra sao? — (Kiệt)**
> **Semaphore** giới hạn số luồng AI đồng thời để tránh tràn bộ nhớ; backend đóng gói Docker có thể co giãn; frontend phục vụ qua CDN toàn cầu; có retry khi cold start; ledger credit ghi thêm (append-only) để không mất mát giao dịch.

**9. Vấn đề bản quyền manga thì sao? — (Minh / Quý)**
> StoryLens là **công cụ hỗ trợ đọc/dịch**, có điều khoản sử dụng rõ ràng và **công cụ kiểm duyệt trong trang admin**. Hướng phát triển sẽ bổ sung quy trình gỡ nội dung theo DMCA.

**10. Điểm khác biệt lớn nhất so với ChatGPT/Google Lens? — (Minh)**
> Cả ba trong một: **dịch cả trang giữ ngữ cảnh + overlay + hỏi–đáp RAG**. Các công cụ kia chỉ làm được một phần và không hiểu toàn bộ câu chuyện.

**11. Nhóm kiểm thử tự động bằng công cụ gì? — (Quý / Hà Dương)**
> Theo PA5, nhóm dùng **Katalon Studio** cho hai use case UC01 và UC02, mỗi use case ≥ 2 kịch bản, có kết quả Pass/Fail. Ngoài ra còn Vitest (unit/component), pytest (backend), **Playwright (E2E)**, và typecheck/lint — tất cả chạy qua **CI 5 job**: typecheck, lint, build, Playwright, pytest.

**12. Vì sao tài liệu PA ghi ChromaDB / all-MiniLM / GPT-4 mà sản phẩm lại là pgvector / Gemini? — (Phú Hòa / Minh)**
> Đó là **sự tiến hoá qua các vòng lặp RUP**. Ban đầu nhóm dự kiến ChromaDB + embedding all-MiniLM; khi hiện thực, nhóm hợp nhất về **pgvector ngay trong Supabase** (bớt một dịch vụ, đỡ vận hành) và dùng **gemini-embedding-001 768 chiều** cho đồng bộ với Gemini dịch. Sản phẩm cuối phản ánh quyết định kỹ thuật tốt hơn so với bản kế hoạch.

**13. Đóng góp của từng thành viên / cách làm việc nhóm? — (Minh)**
> Mô hình **flat team 6 người**, RUP rút gọn + Scrum, sprint 2 tuần, weekly scrum, mọi PR đều review. Phân công: Minh (PM & AI/ML–OCR fine-tune, prompt dịch), Hà Dương (dataset & đánh giá OCR), Kiệt (backend & CSDL), Phú Hòa (RAG & vector DB), Nguyên (frontend), Quý (tài liệu & kiểm thử). *(Mỗi bạn nêu ngắn phần mình phụ trách.)*

**14. Vì sao yêu cầu phi chức năng lại chọn đúng các ngưỡng 3s / 30s / 10s? — (Quý / Kiệt)**
> Đây là ngưỡng trải nghiệm người dùng chuẩn cho web tương tác (dưới 3 giây), cho một tác vụ AI nền có thanh tiến trình (dưới 30 giây/trang), và cho một câu trả lời hội thoại (dưới 10 giây) — dựa trên khảo sát UX thông thường và giới hạn thực tế của Gemini + pgvector khi đo thử trong nhóm.

**15. Vì sao bố cục chữ Việt trong bong bóng lại là một hạn chế? — (Nguyên / Hà Dương)**
> Tiếng Việt có dấu và thường dài hơn tiếng Nhật/Trung khi dịch cùng một ý, nên với bong bóng nhỏ, hệ thống phải tự thu nhỏ cỡ chữ hoặc cắt bớt và cho xem đầy đủ qua tooltip — đây là hạn chế đã biết, nằm trong roadmap cải thiện render.
