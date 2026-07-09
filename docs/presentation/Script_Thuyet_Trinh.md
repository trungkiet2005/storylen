# Script thuyết trình — StoryLens (PA5)

**Môn CSC10011 – Công nghệ phần mềm cho hệ thống Trí tuệ Nhân tạo · HCMUS · GVHD: GS.TS Nguyễn Văn Vũ**
**Nhóm 1 · Ngày báo cáo: 10/07/2026**

> Kịch bản đọc thuyết trình cho **6 thành viên**, mỗi bạn một phần (PA5 yêu cầu ai cũng phải trình bày ≥ 3 phút).
> Phần lời để **đọc gần như nguyên văn** in trong khung `>` ; phần `[…]` là chỉ dẫn (không đọc).
> **Tổng thời lượng ≈ 15 phút (gồm demo) + ~10 phút Q&A.** In A4, mỗi thành viên giữ trang của mình.

## Bảng phân công

| Thành viên | Vai trò | Slide | Thời lượng |
| --- | --- | --- | --- |
| **Đào Sỹ Duy Minh** | Project Manager & AI/ML — mở đầu, định vị | 1 – 5 | ~2,5 phút |
| **Nguyễn Lâm Phú Quý** | QA & Business Analyst — yêu cầu, use case | 6 – 10 | ~2,5 phút |
| **Phạm Phú Hòa** | AI/ML (RAG) — kiến trúc & lõi AI | 11 – 14 | ~3 phút |
| **Trần Chí Nguyên** | Frontend — công nghệ, tính năng & demo | 15 – 19 | ~3,5 phút |
| **Nguyễn Đình Hà Dương** | AI/ML (OCR) — quy trình, nhóm, kiểm thử, bảo mật | 20 – 23 | ~2,5 phút |
| **Huỳnh Trung Kiệt** | Backend — triển khai & tổng kết | 24 – 28 | ~2,5 phút |

> **Có thể hoán đổi:** cặp AI (Phú Hòa ↔ Hà Dương) có thể đổi khối slide 11–14 và 20–23, hoặc cùng đứng trả lời phần AI khi Q&A. Ai làm phần nào nắm chắc phần đó.

## Mẹo trình bày chung
- Nói **chậm, rõ**, nhìn về phía thầy và khán giả — script để trấn an, đừng cúi đọc liên tục.
- Khi chuyển người: bước sang một bên, người kế tiếp bước lên; đọc đúng **câu chuyển tiếp (➡️)**.
- Con số là điểm mạnh của nhóm — nhấn giọng ở **95,3%**, **6,1%**, **3 dịch vụ**, **CI 5 job**.
- Nếu quá giờ: các ý đánh dấu *có thể lược* được phép bỏ để giữ nhịp 15 phút.

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## 👤 Đào Sỹ Duy Minh — Project Manager & AI/ML · Slide 1–5 · ~2,5 phút

### [Slide 1 — Trang bìa]
> Em xin kính chào thầy và các bạn. Nhóm 1 chúng em xin trình bày đồ án cuối kỳ môn Công nghệ phần mềm cho hệ thống Trí tuệ Nhân tạo. Đề tài của nhóm là **StoryLens — nền tảng AI dịch và hỏi–đáp manga theo ngữ cảnh**. Em là Đào Sỹ Duy Minh, nhóm trưởng, sẽ mở đầu phần trình bày.

### [Slide 2 — Nội dung]
> Bài trình bày gồm 5 phần: thứ nhất là bối cảnh và vấn đề; thứ hai là người dùng và yêu cầu; thứ ba là kiến trúc và phần lõi AI; thứ tư là hiện thực, demo và chất lượng; và cuối cùng là kết quả cùng hướng phát triển. Toàn bộ khoảng 15 phút, sau đó nhóm xin sẵn sàng cho phần hỏi–đáp. Em xin bắt đầu với phần một.

### [Slide 3 — Bối cảnh & Vấn đề]
> Cộng đồng đọc manga ở Việt Nam rất lớn, nhưng đang gặp ba rào cản. Một là **bản dịch fan-sub ra chậm và chất lượng không đều**. Hai là các công cụ dịch tự động như Google Lens **dịch từng câu, mất ngữ cảnh** — không giữ được xưng hô hay mạch truyện. Ba là người đọc **không có cách nào hỏi ngay về nội dung** truyện. Nói gọn: thị trường **thiếu một nền tảng dịch manga tự động vừa hiểu ngữ cảnh, vừa hỏi–đáp thông minh**.

### [Slide 4 — Giải pháp]
> StoryLens giải quyết đúng ba điểm đau đó. Sản phẩm cho người đọc **tải trang truyện lên, tự động dịch sang tiếng Việt có ngữ cảnh, và hỏi AI bất kỳ điều gì về nội dung**. Bốn giá trị cốt lõi là: dịch giữ ngữ cảnh, đọc overlay liền mạch, hỏi–đáp bằng RAG, và một hệ sinh thái cộng đồng — thư viện.

### [Slide 5 — So sánh cạnh tranh]
> So với các lựa chọn hiện có: Google Lens dịch nhanh nhưng không hiểu ngữ cảnh; DeepL hay ChatGPT thì phải thao tác thủ công và không hỏi–đáp thời gian thực; còn fan-sub thủ công thì chậm. **Chỉ StoryLens có đủ cả bốn: dịch tự động, hiểu ngữ cảnh cả trang, hỏi–đáp bằng RAG, và đọc overlay.** Bài học của nhóm là kết hợp tốc độ của máy với độ chính xác giữ ngữ cảnh, cộng thêm khả năng hỏi–đáp mà chưa đối thủ nào có.
>
> ➡️ Để nói rõ hơn về người dùng và yêu cầu hệ thống, em xin mời bạn Nguyễn Lâm Phú Quý.

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## 👤 Nguyễn Lâm Phú Quý — QA & Business Analyst · Slide 6–10 · ~2,5 phút

### [Slide 6 — Người dùng mục tiêu]
> Em xin chào thầy và các bạn, em là Nguyễn Lâm Phú Quý, phụ trách tài liệu và kiểm thử. Nhóm xác định ba nhóm người dùng chính: **sinh viên đại học** muốn đọc và tìm hiểu nội dung sâu; **học sinh THPT** cần giao diện dễ dùng và dịch nhanh; và **content creator** làm video review, cần xử lý cả chương và sẵn sàng trả phí. Điểm chung của cả ba là: cần **dịch chính xác** và **hỏi được về nội dung**.

### [Slide 7 — Use case chính]
> Hệ thống có sáu use case chính. Trọng tâm là **UC01 – upload và dịch một trang**, **UC02 – đọc overlay**, và **UC03 – xử lý batch cả chương**. Ngoài ra có **UC04 – hỏi–đáp RAG**, **UC05 – xuất bản và chia sẻ**, và **UC06 – quản trị**. Phần demo lát nữa sẽ tập trung vào UC01, UC02 và UC03.

### [Slide 8 — Sơ đồ use case]
> Đây là sơ đồ use case tổng quát. Có hai **tác nhân chính**: **Người đọc** thực hiện năm use case từ UC01 đến UC05 — tải lên, đọc, batch, hỏi–đáp, xuất bản; và **Quản trị viên** phụ trách UC06 — quản trị hệ thống. Ngoài ra còn một **tác nhân phụ là AI Module cùng Gemini**, hỗ trợ cho UC01 (dịch) và UC04 (hỏi–đáp). Sơ đồ này chính là khung để nhóm đặc tả yêu cầu chức năng ở slide sau.

### [Slide 9 — Yêu cầu chức năng]
> Về yêu cầu chức năng, nhóm đặc tả **chín nhóm, từ F01 đến F09**: từ xác thực, upload, pipeline AI, reader, hỏi–đáp, quản lý series, lịch sử, hệ thống credit, cho tới quản trị. Trong đó **F03 – pipeline AI** và **F05 – hỏi–đáp RAG** là phần lõi trí tuệ nhân tạo của hệ thống. *[có thể lược: đọc lướt các F còn lại]*

### [Slide 10 — Yêu cầu phi chức năng]
> Về phi chức năng, nhóm đặt các mục tiêu đo được: giao diện phản hồi **dưới 3 giây**, xử lý AI mỗi trang **dưới 30 giây**, trả lời hỏi–đáp **dưới 10 giây**. Về bảo mật và vận hành: dùng cookie HttpOnly, phân quyền RBAC kèm RLS, giới hạn luồng AI để tránh tràn bộ nhớ, và ledger credit chỉ ghi thêm để đảm bảo toàn vẹn.
>
> ➡️ Tiếp theo, về kiến trúc hệ thống và phần lõi AI, em xin mời bạn Phạm Phú Hòa.

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## 👤 Phạm Phú Hòa — AI/ML (RAG) · Slide 11–14 · ~3 phút

### [Slide 11 — Kiến trúc hệ thống]
> Em chào thầy và các bạn, em là Phạm Phú Hòa, phụ trách phần hỏi–đáp RAG và vector database. StoryLens gồm **ba dịch vụ triển khai độc lập**: frontend Next.js chạy trên Vercel; backend FastAPI chạy trên Render; và AI Module — nơi đặt các mô hình nặng — chạy trên HuggingFace Spaces. Ba dịch vụ dùng chung **Supabase** cho cơ sở dữ liệu, xác thực và lưu trữ. Điểm thiết kế quan trọng: **tách AI Module ra riêng** vì các mô hình nặng tới vài GB, không thể nhét chung vào backend chạy tier miễn phí.

### [Slide 12 — Pipeline dịch AI]
> Đây là phần lõi. Khi một trang được tải lên, nó đi qua **sáu bước**: **YOLOv8** phát hiện bong bóng thoại; **manga-ocr** đọc chữ Nhật; **LaMa** xoá chữ gốc khỏi ảnh; **Gemini** dịch có ngữ cảnh sang tiếng Việt; sau đó **render** vẽ chữ Việt vào đúng khung; và cuối cùng sinh **embedding** lưu vào pgvector để phục vụ hỏi–đáp. Toàn bộ chạy nền, tiến trình cập nhật thời gian thực qua WebSocket, và người dùng có thể **huỷ giữa chừng**.

### [Slide 13 — Hỏi–đáp RAG]
> Phần hỏi–đáp là mảng em trực tiếp xây dựng, dùng kỹ thuật **RAG**. Câu hỏi của người dùng được vector hoá bằng Gemini embedding **768 chiều**, rồi tìm **cosine** trong pgvector để lấy các đoạn thoại liên quan nhất — và chỉ trong phạm vi truyện của đúng người dùng đó. Những đoạn đó cùng câu hỏi được đưa vào Gemini để **sinh câu trả lời kèm nguồn trích**. Nhờ vậy AI trả lời **dựa trên đúng nội dung truyện**, chứ không bịa. Mỗi câu trả lời thành công trừ một credit.

### [Slide 14 — Mô hình ML & kết quả]
> Về kết quả huấn luyện — đây là số liệu thật của nhóm. **YOLOv8** phát hiện bong bóng đạt **mAP@0.5 là 95,3%**, precision **97,3%**, huấn luyện trên bộ Manga109-s — **đều vượt ngưỡng 85%**. **manga-ocr** sau khi fine-tune đạt **tỉ lệ lỗi ký tự CER chỉ 6,1%**, tức độ chính xác ký tự gần **94%**. Còn Gemini, nhóm đánh giá bằng human-in-the-loop, đạt trên **80%** mức hài lòng.
>
> ➡️ Phần công nghệ, các tính năng và demo trực tiếp, em xin mời bạn Trần Chí Nguyên.

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## 👤 Trần Chí Nguyên — Frontend · Slide 15–19 · ~3,5 phút

### [Slide 15 — Ngăn xếp công nghệ]
> Em chào thầy và các bạn, em là Trần Chí Nguyên, phụ trách frontend. Về công nghệ: frontend dùng **Next.js 16, React 19, TypeScript**; backend **FastAPI, Python**; phần AI gồm **YOLOv8, manga-ocr, LaMa và Gemini**; dữ liệu dùng **Supabase với pgvector**. Toàn bộ được tích hợp **CI bằng GitHub Actions**. Điểm đáng nói là hệ thống chạy chủ yếu trên **tier miễn phí** nhưng vẫn là một sản phẩm **production thật sự**.

### [Slide 16 — Tính năng nổi bật]
> Ngoài lõi dịch, StoryLens là một hệ sinh thái đầy đủ: **Reader** nhiều chế độ đọc kèm từ điển bong bóng; **Studio QC** để hiệu đính bản dịch; **thư viện** công khai và chia sẻ link; **diễn đàn** cộng đồng và bình luận; **gamification** với thành tựu, cấp độ; và **hệ thống credit** kèm thanh toán Stripe.

### [Slide 17 — Demo A: Trang chủ & Upload]
> Bây giờ em xin demo trực tiếp. [*Mở trang chủ, rồi vào Upload*] Em đăng nhập tài khoản, vào mục Upload và **kéo–thả một trang manga tiếng Nhật**. Ngay khi tải lên, pipeline bắt đầu chạy: hệ thống phát hiện bong bóng, đọc chữ, xoá nền và dịch — tiến trình hiển thị thời gian thực.

### [Slide 18 — Demo A: Reader & Studio]
> [*Mở Reader*] Sau khi xử lý xong, em mở **Reader**: bản dịch tiếng Việt được **phủ đúng vào từng bong bóng**. Em có thể bật/tắt để so sánh với bản gốc, và mở **từ điển bong bóng** để xem giải nghĩa. Nếu bản dịch cần chỉnh, em vào **Studio** để sửa từng bong bóng — thao tác này chính là human-in-the-loop mà bạn Phú Hòa vừa nhắc tới.

### [Slide 19 — Demo B: Batch & Hỏi–đáp]
> [*Mở Upload batch, rồi Q&A*] Với **cả một chương**, em chọn nhiều trang cùng lúc; hệ thống xử lý **tuần tự** và báo tiến trình *x trên N trang*. Cuối cùng, ở mục **Hỏi–đáp**, em đặt một câu hỏi về nội dung truyện và AI **trả lời kèm nguồn trích**. Chương sau khi dịch có thể **xuất bản lên thư viện** cho người khác đọc.
>
> ➡️ Về quy trình phát triển, tổ chức nhóm và chất lượng phần mềm, em xin mời bạn Nguyễn Đình Hà Dương.

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## 👤 Nguyễn Đình Hà Dương — AI/ML (OCR) · Slide 20–23 · ~2,5 phút

### [Slide 20 — Quy trình phát triển]
> Em chào thầy và các bạn, em là Nguyễn Đình Hà Dương, phụ trách dataset và đánh giá độ chính xác OCR. Nhóm áp dụng **RUP rút gọn kết hợp Scrum**, mỗi sprint hai tuần, đi qua bốn pha Inception – Elaboration – Construction – Transition. Mỗi tuần nhóm họp **weekly scrum** trả lời ba câu hỏi quen thuộc, và **mọi pull request đều được review trước khi merge**. Bảng bên phải là năm vai trò mẫu theo RUP; còn phân công thực tế cho từng thành viên, em xin trình bày ngay ở slide sau.

### [Slide 21 — Tổ chức nhóm & phân công]
> Nhóm StoryLens gồm **sáu thành viên, tổ chức theo mô hình phẳng** — không phân cấp cứng nhắc, mọi quyết định kỹ thuật quan trọng đều thảo luận tập thể. Cụ thể: **Đào Sỹ Duy Minh** là nhóm trưởng kiêm kỹ sư AI/ML, lo fine-tune OCR và prompt cho dịch; **em — Hà Dương** phụ trách dataset và đánh giá accuracy; **Huỳnh Trung Kiệt** làm backend và cơ sở dữ liệu; **Phạm Phú Hòa** xây dựng RAG và vector database; **Trần Chí Nguyên** làm frontend; và **Nguyễn Lâm Phú Quý** phụ trách tài liệu và kiểm thử. *[có thể lược: đọc nhanh, để thầy tự đọc bảng]*

### [Slide 22 — Kiểm thử & CI/CD]
> Về chất lượng, nhóm kiểm thử **nhiều tầng**. Theo yêu cầu của PA5, nhóm dùng **Katalon Studio** viết kịch bản kiểm thử tự động cho hai use case chính — **UC01 upload–dịch** và **UC02 đọc overlay** — mỗi use case ít nhất hai kịch bản, ghi lại kết quả Pass/Fail. Ngoài ra: unit và component bằng Vitest; backend bằng pytest; **end-to-end bằng Playwright**; cùng kiểm tra tĩnh bằng TypeScript và ESLint. Tất cả chạy tự động qua **GitHub Actions với năm job song song**; chỉ khi **CI xanh** thì code mới được nộp.

### [Slide 23 — Bảo mật]
> Bảo mật được làm **nhiều lớp**: token đăng nhập giữ trong **cookie HttpOnly**, không lộ cho JavaScript; phân quyền **RBAC cùng RLS** trên cơ sở dữ liệu; **giới hạn tần suất** và **captcha Turnstile** ở các endpoint nhạy cảm; **CSP** trên mọi phản hồi; kiểm tra ảnh upload bằng Pillow để chống giả mạo định dạng; và **chặn SSRF** bằng danh sách domain cho phép khi nhập từ nguồn ngoài.
>
> ➡️ Cuối cùng, về triển khai, hạn chế, hướng phát triển và kết luận, em xin mời bạn Huỳnh Trung Kiệt.

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## 👤 Huỳnh Trung Kiệt — Backend · Slide 24–28 · ~2,5 phút

### [Slide 24 — Triển khai]
> Em chào thầy và các bạn, em là Huỳnh Trung Kiệt, phụ trách backend và cơ sở dữ liệu. Hệ thống triển khai trên **bốn nền tảng**: frontend trên Vercel, backend trên Render, AI Module trên HuggingFace, và dữ liệu trên Supabase — tất cả **tự động deploy khi push lên nhánh main**. Nhóm có **keep-alive** chống ngủ, **health check**, giám sát bằng Sentry và OpenTelemetry, cùng **backup** dữ liệu PITR bảy ngày.

### [Slide 25 — Hạn chế & lỗi đã biết]
> Nhóm cũng xin nhìn thẳng vào hạn chế. Do chạy tier miễn phí nên có **cold start** — lần đầu truy cập có thể chậm; nhóm đã giảm bằng keep-alive. **Quota Gemini** giới hạn nên nhóm xoay vòng nhiều key và cache. **OCR với chữ hiệu ứng, viết tay** thì độ chính xác còn giảm. Ngoài ra còn vài lỗi đã biết như token phiên hết hạn giữa chừng — tất cả đều đang được xử lý.

### [Slide 26 — Hướng phát triển]
> Về hướng phát triển, nhóm dự định **fine-tune thêm cho chữ hiệu ứng**, hỗ trợ thêm cặp ngôn ngữ; cải thiện **thứ tự đọc phải-sang-trái**; nâng độ sẵn sàng để giảm cold start; **cá nhân hoá** gợi ý truyện; bổ sung quy trình **bản quyền, DMCA**; và đóng gói thành **ứng dụng di động**.

### [Slide 27 — Kết luận]
> Tóm lại, StoryLens là **một sản phẩm AI hoàn chỉnh và đang chạy thật**: với **ba dịch vụ độc lập**, mô hình phát hiện đạt **95,3%** và OCR lỗi chỉ **6,1%**. Nhóm đã xây dựng một **pipeline AI đầu-cuối**, áp dụng **kỹ thuật production** như microservice, WebSocket, bảo mật nhiều lớp và CI, đồng thời **tuân thủ quy trình công nghệ phần mềm** với tài liệu SAD, SRS, SDP đồng bộ với code thật.

### [Slide 28 — Cảm ơn & Q&A]
> Phần trình bày của nhóm 1 đến đây là hết. **Chúng em xin cảm ơn thầy và các bạn đã lắng nghe, và rất mong nhận được câu hỏi cùng góp ý ạ.**
>
> [*Nếu thầy yêu cầu demo thêm: sẵn sàng mở lại web. Lưu ý đánh thức AI Module trước.*]

```{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
```

## 📌 Phụ lục — Chuẩn bị Hỏi & Đáp (ai phụ trách mảng nào trả lời mảng đó)

**1. Vì sao tách AI Module thành dịch vụ riêng? — (Kiệt / Phú Hòa)**
> Vì các mô hình (YOLOv8, manga-ocr, LaMa) nặng vài GB, cần RAM lớn. Backend chạy Render tier miễn phí chỉ 512MB không thể tải nổi. Tách riêng giúp mỗi phần **co giãn độc lập** và không làm sập API chính.

**2. Làm sao đảm bảo chất lượng bản dịch? — (Phú Hòa / Minh)**
> Gemini dịch **theo cả trang** nên giữ được ngữ cảnh, xưng hô. Ngoài ra có **human-in-the-loop**: Studio QC cho phép duyệt/sửa từng bong bóng, cùng cơ chế phản hồi tốt/xấu để cải thiện dần.

**3. YOLOv8 huấn luyện trên dữ liệu gì? — (Hà Dương)**
> Bộ **Manga109-s**, 956 ảnh test với hơn 14.000 bounding box. Kết quả mAP@0.5 đạt 95,3%, vượt ngưỡng 85% nhóm đặt ra.

**4. Nếu Gemini hết quota thì sao? — (Phú Hòa / Kiệt)**
> Nhóm dùng **xoay vòng nhiều API key**, kèm throttle phía client, cache kết quả, và có **fallback sang M2M100/NLLB** khi cần.

**5. Nếu OCR đọc sai chữ thì xử lý thế nào? — (Hà Dương / Nguyên)**
> Người dùng vào **Studio QC sửa tay** từng bong bóng; mọi chỉnh sửa được lưu **lịch sử hiệu đính**. Đây là cơ chế con-người-trong-vòng-lặp.

**6. RAG hoạt động chính xác ra sao? — (Phú Hòa)**
> Câu hỏi được embedding bằng **gemini-embedding-001, 768 chiều** → tìm cosine top-k trong **pgvector**, giới hạn theo đúng người sở hữu → ghép ngữ cảnh + câu hỏi đưa vào Gemini → trả lời **kèm nguồn trích**. Nhờ vậy câu trả lời bám sát nội dung truyện.

**7. Bảo mật token đăng nhập thế nào? — (Kiệt / Hà Dương)**
> Token đặt trong **cookie HttpOnly**, JavaScript không đọc được nên chống XSS đánh cắp token; kèm RLS ở database và CSP chặt.

**8. Hệ thống chịu tải và tránh sập ra sao? — (Kiệt)**
> **Semaphore** giới hạn số luồng AI đồng thời để tránh tràn bộ nhớ; backend đóng gói Docker có thể co giãn; frontend phục vụ qua CDN toàn cầu; có retry khi cold start.

**9. Vấn đề bản quyền manga thì sao? — (Minh / Quý)**
> StoryLens là **công cụ hỗ trợ đọc/dịch**, có điều khoản sử dụng rõ ràng và **công cụ kiểm duyệt trong trang admin**. Hướng phát triển sẽ bổ sung quy trình gỡ nội dung theo DMCA.

**10. Điểm khác biệt lớn nhất so với ChatGPT/Google Lens? — (Minh)**
> Cả ba trong một: **dịch cả trang giữ ngữ cảnh + overlay + hỏi–đáp RAG**. Các công cụ kia chỉ làm được một phần và không hiểu toàn bộ câu chuyện.

**11. Nhóm kiểm thử tự động bằng công cụ gì? — (Quý / Hà Dương)**
> Theo PA5, nhóm dùng **Katalon Studio** cho hai use case UC01 và UC02, mỗi use case ≥ 2 kịch bản, có kết quả Pass/Fail. Ngoài ra còn Vitest (unit/component), pytest (backend), **Playwright (E2E)**, và typecheck/lint — tất cả chạy qua **CI 5 job**.

**12. Vì sao tài liệu PA ghi ChromaDB / all-MiniLM / GPT-4 mà sản phẩm lại là pgvector / Gemini? — (Phú Hòa / Minh)**
> Đó là **sự tiến hoá qua các vòng lặp RUP**. Ban đầu nhóm dự kiến ChromaDB + embedding all-MiniLM; khi hiện thực, nhóm hợp nhất về **pgvector ngay trong Supabase** (bớt một dịch vụ, đỡ vận hành) và dùng **gemini-embedding-001 768 chiều** cho đồng bộ với Gemini dịch. Sản phẩm cuối phản ánh quyết định kỹ thuật tốt hơn so với bản kế hoạch.

**13. Đóng góp của từng thành viên / cách làm việc nhóm? — (Minh)**
> Mô hình **flat team 6 người**, RUP rút gọn + Scrum, sprint 2 tuần, weekly scrum, mọi PR đều review. Phân công: Minh (PM & AI/ML–OCR fine-tune), Hà Dương (dataset & đánh giá OCR), Kiệt (backend & CSDL), Phú Hòa (RAG & vector DB), Nguyên (frontend), Quý (tài liệu & kiểm thử). *(Mỗi bạn nêu ngắn phần mình phụ trách.)*
