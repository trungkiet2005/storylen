 

# StoryLens - Script Testing, Demo, Q&A

Người trình bày: **Nguyễn Lâm Phú Quý - QA & Business Analyst**
Phạm vi: **Slide 21 -> 31**
Bản này là bản Markdown để dễ chỉnh sửa trước khi chuyển sang PDF.

## Cách dùng nhanh

- Phần chính cần nắm chắc nhất: **Slide 21 - Kiểm thử & CI/CD**.
- Slide 22-27: nói theo góc nhìn QA/test cho tính năng và demo (bao gồm 2 slide demo mới: RAG Q&A và Video Recap).
- Slide 28-31: nói hạn chế, roadmap, kết luận nếu bạn là người chốt cuối.
- Nếu bị hỏi sâu, dùng phần **Q&A vấn đáp** và **Glossary technical** bên dưới
- Lưu ý quan trọng: PA5 report thật hiện ghi Katalon chạy Login/Navigation. Nếu slide vẫn ghi Upload/Reader, nói an toàn là:
  “Katalon kiểm thử UI tự động theo yêu cầu PA5; ngoài ra các luồng Upload/Reader/Q&A được bao phủ trong test plan, manual/UAT và các tầng test khác.”

---

# Script trình bày

## Slide 21 - Kiểm thử & CI/CD

Ở phần này, em xin trình bày cách mà nhóm kiểm soát chất lượng cho đồ án StoryLens.

Theo lý thuyết testing, nhóm áp dụng cả hai mục tiêu kiểm thử: **validation** và **defect testing** — để cho hệ thống đáp ứng yêu cầu, vừa cố tìm lỗi khi hệ thống chạy sai đặc tả.

Với StoryLens, không chỉ là một website tĩnh. Mà có đầy đủ frontend, backend, AI Module, Supabase và AI Service. Vì vậy nếu chỉ test thủ công thì dễ bỏ sót các lỗi tìm ẩn. Nên nhóm chia kiểm thử thành nhiều tầng, mỗi tầng bắt một nhóm lỗi khác nhau.

- Đầu tiên, nhóm dùng **Katalon Studio** để kiểm thử tự động 2 luồng UI ổn định nhất: đăng nhập và điều hướng chính.

Ví dụ: mở trang đăng nhập, nhập tài khoản sai, bấm login, rồi verify là hệ thống vẫn ở `/login` và có thông báo lỗi. Hoặc vào trang chủ, bấm qua Browse/Library để kiểm tra điều hướng đúng. Nhóm chọn các luồng này vì ít phụ thuộc AI bên ngoài, nên test tự động ổn định hơn.

- Tiếp theo, nhóm dùng **Vitest** và **Thư viện React Testing** để test unit/component ở frontend, cho các phần như rating, reading list, local storage.

Ví dụ nếu user bấm chọn rating thì UI phải cập nhật đúng; hoặc reading list phải lưu/đọc trạng thái đúng từ local storage. Các test này chạy nhanh, nên phù hợp để bắt lỗi hồi quy mỗi khi sửa UI.

Ở backend, nhóm dùng **pytest** để kiểm tra logic của FastAPI và các service phía server. Với những service có gọi Supabase hoặc Gemini, nhóm dùng **mock**

Ví dụ thay vì thật sự gọi Gemini mỗi lần test, mình giả lập Gemini trả về một bản dịch mẫu, rồi kiểm tra backend xử lý kết quả đó đúng không. Cách này giúp test ổn định và không tốn quota Gemini.

- Playwright **cho E2E**, phù hợp cho các luồng như đăng nhập, trang chủ, protected pages, mobile, forum và edge case.

Ví dụ user chưa đăng nhập mà vào trang cần quyền thì phải bị chuyển về login; hoặc trên mobile thì menu và navigation vẫn phải dùng được.

- Và trước khi push lên deploy thì sẽ có **kiểm thử tĩnh**: TypeScript typecheck bắt lỗi kiểu dữ liệu, ESLint bắt lỗi coding style và các pattern dễ gây bug, còn Python type hints giúp code backend rõ kiểu hơn.

Các tầng này được tự động hóa bằng **GitHub Actions CI**. Chia thành  5 job chính: typecheck/test, lint, production build, Playwright E2E và backend pytest.

## Slide 22 - Tính năng nổi bật

Đầu tiên là **Reader nâng cao**. Reader hỗ trợ đọc bản dịch dạng overlay, tức là chữ tiếng Việt được phủ trực tiếp lên bong bóng thoại. Và user có thể đọc song ngữ để đối chiếu hoặc cải thiện khả năng đọc và xem cảnh báo nếu độ tin cậy OCR thấp.

**Studio QC**. Là option để người dùng có thể chỉnh sửa lại kết quả dịch của AI. Có thể sửa văn bản, tìm-thay thế hàng loạt, và gửi phản hồi tốt/xấu. Bởi vì OCR và dịch tự động không thể cover hết các case được.

**Chức năng Sharing**. Sau khi dịch xong, người dùng có thể xuất bản chương công khai, cho phép người khác đọc ẩn danh, hoặc chia sẻ link có thời hạn.

Ngoài ra còn có forum để mọi người có thể bình luận chương dịch; phần **gamification** như bookmark, rating, reading list, mục tiêu đọc, XP và thành tựu; và phần **credit/thanh toán** để giới hạn lượt sử dụng cũng như là cũng có free credit mỗi ngày cho người dùng.

## Slide 23 - Demo luồng A: Trang chủ & Upload

Đầu tiên người dùng sẽ thấy landing page chính. Sau đó đăng nhập, vào trang Upload, rồi cung cấp một ảnh hoặc 1 đường dẫn tới chap của truyện cần dịch.

Người dùng chỉ việc upload ảnh lên còn lại pipeline sẽ xử lý: YOLOv8 phát hiện bong bóng, manga-ocr đọc chữ, LaMa xóa nền chữ gốc, rồi Gemini dịch sang tiếng Việt. Trong quá trình xử lý, giao diện hiển thị tiến trình để người dùng biết hệ thống đang chạy tới bước nào.

Ở đây các file sai định dạng hoặc quá kích thước phải bị chặn. Cũng như là nếu AI Service có vấn đề thì hệ thống thông báo lỗi thay vì crash.

## Slide 24 - Demo luồng A: Reader overlay & Studio QC

Bản dịch tiếng Việt được phủ trực tiếp lên cũng như là có thể bật-tắt bản gốc để so sánh, xem song ngữ khi cần.

Nếu bản dịch hoặc OCR chưa đúng, người dùng chuyển sang **Studio QC**.

## Slide 25 - Demo luồng B: Batch, RAG Q&A, Thư viện

Mở rộng sang cả chương và phần RAG.

Hệ thống xử lý tuần tự và hiển thị tiến trình thay vì thao tác từng trang một.

Tiếp theo là **RAG Q&A**. Người dùng có thể đặt câu hỏi về nội dung truyện, ví dụ hỏi về nhân vật, tình tiết hoặc một đoạn hội thoại. Hệ thống sẽ tìm các đoạn liên quan trong dữ liệu truyện, rồi dùng Gemini để trả lời kèm nguồn trích.

## Slide 26 - Demo RAG Q&A

Ở slide này nhóm demo riêng phần hỏi–đáp. Người dùng chọn một trang hoặc cả series đã dịch, rồi đặt câu hỏi bằng ngôn ngữ tự nhiên — ví dụ hỏi về một nhân vật hay một tình tiết cụ thể.

Hệ thống tìm đoạn hội thoại liên quan trong dữ liệu đã dịch, rồi Gemini trả lời kèm đoạn trích dẫn làm nguồn. Nếu câu hỏi ngoài phạm vi dữ liệu đã có, hệ thống báo không tìm thấy thay vì bịa câu trả lời.

## Slide 27 - Demo Video Recap

Cuối cùng là tính năng Nghe và Video Recap. Người dùng bấm nút "Nghe" trong Reader, chọn giọng đọc, hệ thống dùng AI đọc tranh rồi ghép với bản dịch đã có để kể lại nội dung trang bằng giọng nói.

Với cả chương, người dùng có thể xuất thành một video recap ngắn, ghép giọng đọc với hình ảnh trang truyện. Nếu server đọc hình đang offline, hệ thống vẫn kể được dựa trên hội thoại đã dịch, không bị treo.

## Slide 28 - Hạn chế & lỗi đã biết

Bên cạnh đó cũng còn các hạn chế nhất định:

Thứ nhất là **cold start**. Do hiện tại pipeline chỉ sử dụng các free-tier service như backend Render và hosting AI Module trên HuggingFace Spaces, nên dịch vụ có thể sleep sau một thời gian rảnh. Lần đầu truy cập có thể chậm khoảng 15 đến 60 giây. Nhóm giảm tác động bằng keep-alive và health check.

Thứ hai là **quota của Gemini**. Vì dùng free tier nên có giới hạn request mỗi ngày. Nhóm xử lý bằng xoay vòng key, throttle và cache, nhưng vào giờ cao điểm vẫn có thể bị giới hạn.

Thứ ba là **OCR với chữ hiệu ứng (SFX) hoặc chữ viết tay**. Kiểu chữ này cách điệu, không đều như chữ in trong bong bóng thoại thường, nên model dễ đọc sai, có lúc còn bỏ qua luôn không nhận ra.

Và **bố cục chữ Việt**. Tiếng Việt có dấu và thường dài hơn nên đôi khi phải thu nhỏ font hoặc cắt bớt.

Các lỗi đang xử lý gồm token phiên hết hạn giữa chừng, WebSocket mất gói khi mạng chập chờn, signed URL ảnh hết hạn trong phiên đọc dài, và hiệu năng nền anime trên thiết bị mobile cũ.

## Slide 29 - Hướng phát triển

Về hướng phát triển sau này, nhóm có sáu hướng chính:

Cải thiện OCR và chất lượng dịch, và thêm các cặp ngôn ngữ như Hàn hoặc Anh.

Hai là cải thiện thứ tự đọc bong bóng phải-sang-trái cho các bố cục manga phức tạp.

Giảm cold start bằng cách chuyển sang tier trả phí và dùng hàng đợi tác vụ chuyên dụng.

Bốn là cá nhân hóa trải nghiệm đọc của người dùng và cải thiện RAG đa trang hoặc cả series.

Bổ sung công cụ kiểm duyệt và quy trình chuẩn bản quyền/DMCA rõ ràng hơn.

Sáu là đóng gói PWA thành ứng dụng di động để trải nghiệm đọc offline mượt hơn.

## Slide 30 - Kết luận

Tóm lại, StoryLens là một sản phẩm hoàn chỉnh.

Hệ thống có ba dịch vụ triển khai độc lập: frontend, backend và AI Module. Mô hình phát hiện bong bóng đạt mAP@0.5 là 95,3%; OCR tiếng Nhật có CER 6,1%; và hơn chín nhóm yêu cầu chức năng đã được hiện thực.

Về technical, đã xây dựng được 1 pipeline AI end-to-end từ phát hiện, OCR, xóa nền, dịch ngữ cảnh đến RAG Q&A.

Về mặt công nghệ phần mềm, nhóm áp dụng RUP rút gọn kết hợp Scrum, có tài liệu use case, SAD, test plan, test case, test report, và CI để kiểm soát chất lượng.

## Slide 31 - Cảm ơn & Q&A

Phần trình bày của nhóm em đến đây là hết. Nhóm em xin cảm ơn thầy và các bạn đã lắng nghe.

---

# Bảng tra nhanh thuật ngữ testing

Bảng này **không cần trình bày trong slide**. Chỉ dùng để nhìn nhanh nếu thầy hỏi “cái X là gì?”, “vì sao dùng X?”, hoặc “trong đồ án em dùng ở đâu?”.

| Thuật ngữ                | Nói ngắn gọn là gì?                                                                                        | Trong StoryLens là gì / dùng ở đâu?                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Katalon Studio             | Công cụ kiểm thử UI tự động, có record/script/report.                                                   | PA5 dùng để tự động bấm các luồng UI ổn định như Login/Navigation: mở browser, nhập dữ liệu, click, verify URL/thông báo. |
| Test automation            | Dùng máy/công cụ để chạy test tự động, so sánh kết quả và report.                                 | Nhóm dùng Katalon, Vitest, pytest, Playwright và GitHub Actions để giảm test thủ công lặp lại.                                     |
| Manual testing             | Người thật tự thao tác và đánh giá kết quả.                                                          | Dùng cho luồng AI/demo như Upload -> dịch -> Reader, vì bản dịch/overlay cần cảm nhận người dùng.                               |
| UAT                        | User Acceptance Testing: kiểm thử xem sản phẩm có chấp nhận được với yêu cầu/người dùng không. | Kiểm tra các luồng chính: upload, reader, Studio QC, Q&A, thư viện trước demo.                                                       |
| Validation testing         | Kiểm thử để chứng minh hệ thống đáp ứng yêu cầu.                                                    | Ví dụ upload ảnh hợp lệ thì pipeline chạy, Reader hiển thị bản dịch.                                                              |
| Defect testing             | Kiểm thử để tìm lỗi bằng input sai/edge case.                                                            | Ví dụ file sai định dạng, token hết hạn, link hết hạn, user truy cập sai quyền.                                                   |
| Unit test                  | Kiểm thử một hàm/module nhỏ, cô lập.                                                                     | Ví dụ test helper/localStorage/date-utils ở frontend, hoặc logic backend như idempotency/RAG/forum không cần mở cả app.             |
| Component test             | Kiểm thử một component UI riêng lẻ.                                                                        | Ví dụ render StarRating/CreditBadge/ReadingListPicker, click thử và kiểm tra text/state hiển thị đúng.                              |
| Integration test           | Kiểm thử nhiều module phối hợp với nhau.                                                                  | Ví dụ backend service gọi repository và HTTP client đã mock, kiểm tra logic xử lý response đúng.                                  |
| System testing             | Kiểm thử hệ thống đã tích hợp.                                                                          | Ví dụ luồng Upload -> pipeline -> Reader hoặc Q&A đi qua frontend/backend/database/AI.                                                  |
| E2E test                   | End-to-end test: kiểm thử đầu-cuối như người dùng thật.                                               | Playwright mở browser thật/headless để test login, protected pages, mobile navigation, forum.                                            |
| Regression test            | Chạy lại test để chắc sửa cái mới không phá cái cũ.                                                 | CI/test suite giúp chống lỗi hồi quy trước khi merge PR.                                                                               |
| Black-box testing          | Test theo input/output, không cần biết code bên trong.                                                      | Katalon/Playwright/manual test từ góc người dùng.                                                                                       |
| White-box testing          | Test dựa trên hiểu biết code bên trong.                                                                    | Unit test service cụ thể như idempotency, RAG owner-scoping.                                                                              |
| Requirements-based testing | Thiết kế test từ yêu cầu/use case.                                                                         | Test case PA4 trace từ UC01-UC06, F01-F09 và NFR.                                                                                          |
| Equivalence partitioning   | Chia input thành nhóm tương đương để chọn đại diện test.                                           | Upload: file hợp lệ, sai MIME, quá dung lượng. Login: đúng, sai, rỗng.                                                               |
| Boundary testing           | Test giá trị biên.                                                                                           | Ảnh 10MB, batch 5-100 trang, độ dài title/body forum, link TTL.                                                                          |
| Test case                  | Kịch bản test gồm bước, dữ liệu, expected result, actual result.                                         | PA4 có test cases; PA5 có Katalon test case kèm script.                                                                                   |
| Test data                  | Dữ liệu dùng để chạy test.                                                                                | Email/password, file ảnh manga, câu hỏi Q&A, page/series id.                                                                              |
| Expected result            | Kết quả mong đợi theo yêu cầu.                                                                            | Login sai ở lại`/login`, file sai bị chặn, Q&A có nguồn trích.                                                                      |
| Actual result              | Kết quả thực tế sau khi chạy test.                                                                         | Ghi vào test report để kết luận Pass/Fail.                                                                                              |
| Test report                | Tài liệu tổng hợp kết quả test.                                                                           | PA4 có`test_report.docx`; PA5 có `PA5-Automated-Test-Report.docx`.                                                                     |
| Defect/Bug                 | Sai lệch giữa actual result và expected result.                                                              | Nếu fail thì ghi bước tái hiện, mức độ ảnh hưởng, fix và regression.                                                            |
| Assertion/Checkpoint       | Điều kiện kiểm tra Pass/Fail trong script tự động.                                                       | Katalon verify URL còn`/login` sau login sai, hoặc chuyển sang `/browse` sau click.                                                   |
| Record-playback            | Ghi thao tác người dùng rồi phát lại.                                                                    | Katalon hỗ trợ; nhanh để tạo UI test, nhưng phải có checkpoint mới là test thật.                                                  |
| Data-driven testing        | Một script chạy với nhiều bộ dữ liệu.                                                                    | Có thể dùng cho login nhiều email/password hoặc upload nhiều loại file.                                                               |
| Keyword-driven testing     | Test từ các keyword/hành động mức cao.                                                                    | Katalon hỗ trợ các bước kiểu Open Browser, Click, Verify.                                                                              |
| Mock                       | Giả lập phản hồi của service ngoài.                                                                       | Mock Gemini/Supabase để test backend ổn định, không tốn quota và không đụng production.                                           |
| Staging environment        | Môi trường giống production nhưng dành riêng cho test.                                                   | Nhóm chưa có staging đầy đủ cho Supabase/Gemini; đây là hạn chế cần cải thiện.                                                |
| Flaky test                 | Test lúc pass lúc fail do môi trường/dịch vụ ngoài, không hẳn do bug.                                 | Luồng AI full Upload -> dịch -> Reader dễ flaky vì HF cold start, Gemini quota, Supabase.                                                |
| Test coverage              | Mức độ yêu cầu/chức năng/code được test bao phủ.                                                     | PA4 bao phủ 10 use case; vẫn ghi nhận thiếu full E2E ổn định cho AI thật.                                                            |
| CI                         | Continuous Integration: tự chạy kiểm tra khi có code mới.                                                  | GitHub Actions chạy typecheck/test, lint, build, Playwright E2E, backend pytest.                                                            |
| CI xanh                    | Các job kiểm tra tự động đều pass.                                                                       | Quy tắc nhóm: PR được review và CI xanh trước khi merge main.                                                                        |
| Vitest                     | Framework test JavaScript/TypeScript nhanh.                                                                     | Dùng cho unit/component test frontend, ví dụ rating, credit badge, reading list, localStorage.                                            |
| React Testing Library      | Test React theo hành vi người dùng nhìn thấy.                                                             | Render component, tìm text/button, click, kiểm tra kết quả giống cách user dùng UI.                                                   |
| pytest                     | Framework test Python.                                                                                          | Dùng cho backend FastAPI/Python service, ví dụ kiểm tra API/service xử lý đúng khi Gemini/Supabase trả response mẫu.               |
| respx                      | Thư viện mock HTTP cho Python/httpx.                                                                          | Mock HTTP call tới Gemini/Supabase để test backend ổn định, không tốn quota và không phụ thuộc mạng.                            |
| Playwright                 | Framework E2E browser automation.                                                                               | Test auth, mobile, forum, protected pages trong CI; ví dụ chưa login thì bị redirect về`/login`.                                     |
| ESLint                     | Công cụ lint JavaScript/TypeScript.                                                                           | Bắt coding style/pattern dễ gây bug ở frontend.                                                                                          |
| TypeScript typecheck       | Kiểm tra kiểu dữ liệu mà không chạy app.                                                                 | `tsc --noEmit` bắt lỗi type trước khi build.                                                                                           |
| Python type hints          | Chú thích kiểu dữ liệu trong Python.                                                                       | Giúp backend rõ input/output hơn, hỗ trợ kiểm tra tĩnh và maintain.                                                                  |

---

# Q&A vấn đáp có thể bị hỏi

## 1. Nhóm dùng những công cụ kiểm thử gì?

Nhóm dùng Katalon Studio cho kiểm thử UI tự động theo yêu cầu PA5; Vitest + React Testing Library cho unit/component test frontend; pytest + respx cho backend test và mock các API như Supabase/Gemini; Playwright cho E2E trình duyệt; TypeScript typecheck, ESLint, Python type hints cho kiểm thử tĩnh; và GitHub Actions để tự động hóa CI.

## 2. Vì sao nhóm chọn Katalon cho PA5?

Vì PA5 yêu cầu một công cụ test automation, có test case, test script và kết quả Passed/Failed. Katalon là công cụ phổ biến trong nhóm automation tools, hỗ trợ record-playback, script và report nên rất hợp để nộp minh chứng.

Với đồ án StoryLens, nhóm dùng Katalon để tự động hóa một số luồng UI ổn định; còn các luồng AI nặng như Upload -> dịch -> Reader vẫn được kiểm thử thêm bằng test plan, manual/UAT và các tầng test khác.

## 3. Test case lấy từ đâu ra?

Test case được trace từ use case và yêu cầu phần mềm. Đây là requirements-based testing: xem từng yêu cầu/use case rồi dẫn ra các bước, input, output và expected result.

Ví dụ UC01 Upload & Dịch trang, UC02 Reader overlay, UC04 Q&A RAG, cộng thêm các yêu cầu phi chức năng như bảo mật, hiệu năng, giới hạn file, phân quyền, và xử lý lỗi. PA4 có test plan, test cases và test report riêng để thể hiện mapping này.

## 4. Vì sao phải có nhiều tầng test?

Vì mỗi tầng bắt một loại lỗi khác nhau. Unit test bắt lỗi logic nhỏ; component test bắt lỗi UI component; backend test bắt lỗi nghiệp vụ/API; E2E test kiểm tra luồng người dùng; static check bắt lỗi kiểu dữ liệu và coding style.

Nếu chỉ test thủ công ở cuối thì rất dễ bỏ sót lỗi hồi quy.

## 5. Test automation có thay thế manual testing không?

Không. Theo bài Test Automation, automation không thay thế manual testing. Automation tốt cho các test lặp lại, regression test, high-risk/business-critical flow, hoặc test tốn thời gian.

Manual/UAT vẫn cần cho UI/UX và các đánh giá cần con người, ví dụ bản dịch đọc có tự nhiên không, overlay có dễ nhìn không, hoặc Studio QC có thuận tay không.

## 6. Katalon test gì trong PA5?

Câu trả lời an toàn:

Katalon được dùng để kiểm thử UI tự động theo rubric PA5: tối thiểu 2 use case, mỗi use case 2 scenario, có script và kết quả Passed/Failed.

Bản report PA5 hiện ghi các test chạy trên production thật gồm các luồng Login và Navigation. Các luồng Upload/Reader/Q&A được bao phủ thêm trong test plan PA4, manual/UAT, pytest, Vitest và Playwright.

## 7. Vì sao không dùng Katalon để test toàn bộ luồng Upload -> AI dịch -> Reader?

Vì luồng đó phụ thuộc nhiều dịch vụ ngoài: HuggingFace AI Module, Gemini quota, Supabase Storage và cold start. Nếu dùng trực tiếp trong Katalon để chấm tự động thì dễ flaky, tức là lúc pass lúc fail không hẳn do bug.

Nhóm vẫn kiểm thử luồng này bằng test case PA4, manual/UAT và các test backend/frontend; còn Katalon ưu tiên các luồng UI ổn định để chứng minh automation chạy thật.

## 8. Mock Supabase/Gemini có làm test kém thật không?

Mock không thay thế hoàn toàn integration test, nhưng rất cần cho unit/integration test ổn định.

Nó giúp kiểm tra logic xử lý của hệ thống mà không phụ thuộc mạng, quota hoặc dữ liệu production. Với các luồng thật, nhóm bổ sung manual/UAT và demo production.

## 9. Playwright khác Katalon ở đâu?

Katalon là công cụ test automation low-code/record-script, phù hợp báo cáo PA5 vì có test script và report rõ.

Playwright là framework E2E bằng code, phù hợp tích hợp CI, chạy headless, test nhiều trình duyệt/kích thước màn hình và kiểm thử regression lâu dài.

## 10. CI có những job nào?

CI có 5 job chính: typecheck/test frontend, lint, production build, Playwright E2E và backend pytest.

Mục tiêu là mọi pull request phải qua kiểm tra tự động và review trước khi merge vào main.

## 11. Nếu test pass 100% thì có nghĩa là hệ thống hết lỗi chưa?

Không. Theo lý thuyết testing, test chỉ chứng minh sự hiện diện của lỗi, không chứng minh hệ thống hoàn toàn không còn lỗi.

Test pass nghĩa là hệ thống đạt các kịch bản đã kiểm thử. Vẫn có rủi ro ở các ca chưa bao phủ như tải cao, mạng chập chờn, quota Gemini, dữ liệu manga lạ, thiết bị mobile cũ.

## 12. Validation testing khác defect testing như thế nào?

Validation testing là kiểm thử để chứng minh phần mềm đáp ứng yêu cầu. Ví dụ upload ảnh hợp lệ thì hệ thống xử lý và hiển thị bản dịch.

Defect testing là kiểm thử để tìm lỗi. Ví dụ upload file sai định dạng, link hết hạn, token hết hạn, hoặc user không có quyền truy cập dữ liệu của người khác.

Trong StoryLens, nhóm có cả hai: test luồng đúng và test luồng lỗi/edge case.

## 13. Hạn chế lớn nhất của phần testing hiện tại là gì?

Hạn chế lớn nhất là chưa có staging environment riêng với Supabase/Gemini test credentials để chạy full E2E cho luồng Upload -> AI dịch -> Reader -> Q&A một cách ổn định mà không đụng production.

Đây là hướng cải thiện quan trọng sau PA5.

## 14. Slide nói "xoay vòng key, throttle và cache" cho quota Gemini — cụ thể từng cái là gì?

- **Xoay vòng key (key rotation):** nhóm cấu hình nhiều `GEMINI_API_KEY` (cách nhau bằng dấu phẩy). Hệ thống xoay theo kiểu **round-robin** — mỗi lần gọi Gemini sẽ lấy key kế tiếp trong vòng để chia tải đều; nếu 1 key gặp lỗi hết quota, hệ thống tự thử key khác trong cùng request trước khi báo lỗi.
- **Cache:** có, nhưng ở 2 chỗ cụ thể chứ không phải cache toàn bộ bản dịch — (1) cache tra từ điển bong bóng (in-process, tối đa 1024 mục, mất khi restart server), và (2) cache tóm tắt chương cho tính năng nghe/recap (lưu trong Supabase, không mất khi restart). Bản dịch bong bóng chính (phần tốn quota nhiều nhất) hiện **chưa có cache**.
- **Throttle:** đây là từ dùng cho dễ hiểu, thực tế nhóm chưa có rate-limit riêng cho Gemini. Cơ chế gần nhất là giới hạn số job pipeline chạy đồng thời (semaphore), giúp giảm áp lực gọi AI cùng lúc chứ không phải throttle theo quota Gemini.
- **Nếu bị hỏi tiếp "vậy sao vẫn bị giới hạn giờ cao điểm":** vì free tier Gemini có giới hạn request/ngày cố định; xoay vòng key giúp có nhiều "hạn mức" hơn cộng lại, nhưng khi tất cả key cùng gần hết quota cùng lúc thì vẫn có thể bị giới hạn.

---

# Vì sao dùng Y mà không dùng X?

## Vì sao dùng Katalon mà không dùng Selenium?

Katalon phù hợp với yêu cầu PA5 hơn vì nó cho ra test case, test script và report Passed/Failed rất rõ, dễ nộp như một tài liệu kiểm thử tự động.

Selenium mạnh và phổ biến, nhưng nếu dùng trực tiếp thì nhóm phải tự viết nhiều phần khung báo cáo hơn. Với mục tiêu PA5 là chứng minh automation UI cho một số use case, Katalon nhanh, đủ rõ ràng và dễ tái hiện.

## Vì sao vẫn dùng Playwright nếu đã có Katalon?

Katalon phục vụ tốt cho báo cáo automation PA5, còn Playwright phù hợp hơn cho regression test lâu dài trong CI.

Playwright viết bằng code, chạy headless tốt, dễ tích hợp GitHub Actions, dễ test mobile viewport và nhiều trạng thái trình duyệt.

Nói ngắn gọn: Katalon để trình bày automation rõ ràng; Playwright để bảo vệ codebase lâu dài.

## Vì sao dùng Vitest mà không dùng Jest?

Frontend của nhóm dùng Next.js/React hiện đại và tooling JavaScript mới, nên Vitest chạy nhanh, cấu hình nhẹ, tích hợp tốt với jsdom.

Jest vẫn dùng được, nhưng Vitest phù hợp hơn với nhu cầu test unit/component nhanh trong repo hiện tại.

## Vì sao dùng React Testing Library mà không test trực tiếp state/component internals?

React Testing Library khuyến khích test theo hành vi người dùng nhìn thấy: text nào xuất hiện, button nào bấm được, form phản hồi thế nào.

Cách này bền hơn khi refactor component, vì test không phụ thuộc quá sâu vào implementation detail bên trong.

## Vì sao dùng pytest mà không dùng unittest mặc định của Python?

unittest là thư viện chuẩn và vẫn tốt, nhưng pytest viết test gọn hơn, fixture mạnh hơn, output dễ đọc hơn và hệ sinh thái plugin phong phú.

Backend FastAPI/Python của nhóm có nhiều service cần mock, fixture và async test, nên pytest thuận tiện hơn.

## Vì sao dùng respx mà không gọi Gemini/Supabase thật trong mọi test?

Nếu test nào cũng gọi API thật thì kết quả dễ phụ thuộc mạng, quota, trạng thái dịch vụ ngoài và dữ liệu production.

respx giúp mock HTTP response để kiểm tra logic backend ổn định. Nhóm vẫn demo và UAT trên môi trường thật, nhưng unit/integration test nên cô lập để chạy nhanh và đáng tin cậy.

## Vì sao không làm load test/JMeter?

Load test phù hợp khi đánh giá hệ thống nhiều người dùng đồng thời. Trong phạm vi PA4/PA5, trọng tâm là đúng chức năng, automation test và demo sản phẩm.

Hơn nữa AI Module đang chạy free tier, nếu load test mạnh có thể tốn quota hoặc làm dịch vụ bị giới hạn. Nhóm ghi nhận load/performance test là hướng mở rộng khi có staging riêng.

---

# Glossary technical gắn với StoryLens

| Thuật ngữ                | Là gì?                                                              | Trong StoryLens dùng ở đâu / cần nhớ                                                                                                                                                      |
| -------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel                     | Nền tảng deploy frontend, tối ưu cho Next.js, có CDN.            | Host frontend StoryLens: trang chủ, Upload, Reader, Q&A, Library, Admin. Ví dụ user mở website thì phần UI Next.js chạy từ Vercel; model AI nặng không host ở đây.                 |
| Render                     | Nền tảng deploy backend/API.                                        | Host Backend API FastAPI ở Singapore. Free tier có cold start.                                                                                                                                |
| HuggingFace Spaces         | Nền tảng host app/model AI.                                         | Host AI Module gồm YOLOv8, manga-ocr, LaMa/inpaint và render ảnh dịch. Ví dụ khi upload trang manga, backend gọi sang Space này để xử lý ảnh; free tier có cold start/giới hạn. |
| Supabase                   | Backend-as-a-Service dựa trên Postgres, có Auth, Storage, RLS.     | Dùng làm database + auth + storage ảnh. pgvector phục vụ RAG.                                                                                                                              |
| Docker                     | Đóng gói app và dependency vào container.                        | Backend API và AI Module deploy bằng Docker để chạy nhất quán. Ví dụ môi trường có đúng Python packages/model dependencies thay vì máy nào cài khác máy đó.              |
| FastAPI                    | Framework Python để xây API.                                       | Backend dùng cho auth, upload, qa, series, admin.                                                                                                                                              |
| Next.js                    | Framework React cho web app.                                          | Frontend dùng Next.js 16 App Router.                                                                                                                                                           |
| React                      | Thư viện xây UI bằng component.                                   | Reader overlay, upload form, Q&A panel, Studio QC, forum, rating.                                                                                                                               |
| TypeScript                 | JavaScript có kiểu dữ liệu tĩnh.                                 | Giảm lỗi sai kiểu props/API response, typecheck trước build.                                                                                                                               |
| YOLOv8                     | Model object detection.                                               | Phát hiện bong bóng thoại trong manga.                                                                                                                                                      |
| manga-ocr                  | Model OCR chuyên đọc chữ manga/tiếng Nhật.                      | Đọc chữ Nhật trong bounding box.                                                                                                                                                            |
| LaMa inpaint               | Kỹ thuật xóa vùng chữ và lấp nền ảnh.                        | Xóa chữ gốc trong bong bóng trước khi render chữ Việt.                                                                                                                                  |
| Gemini 2.5 Flash           | LLM của Google.                                                      | Dịch có ngữ cảnh và sinh câu trả lời Q&A. Có quota.                                                                                                                                    |
| Embedding                  | Biểu diễn văn bản thành vector số.                              | Vector hóa câu hỏi và đoạn thoại để tìm bằng pgvector.                                                                                                                               |
| RAG                        | Tìm tài liệu liên quan trước rồi đưa cho LLM trả lời.      | Q&A tìm đoạn thoại liên quan rồi Gemini trả lời kèm nguồn trích.                                                                                                                     |
| WebSocket                  | Kết nối realtime hai chiều.                                        | Cập nhật tiến trình upload/batch/pipeline.                                                                                                                                                  |
| Polling                    | Client hỏi server định kỳ.                                        | Fallback khi WebSocket mất gói.                                                                                                                                                               |
| Cookie HttpOnly            | Cookie không đọc được bằng JavaScript.                         | Giữ token đăng nhập để giảm rủi ro XSS đánh cắp token.                                                                                                                               |
| RBAC                       | Phân quyền theo vai trò.                                           | User/admin ở API.                                                                                                                                                                              |
| RLS                        | Bảo mật từng dòng dữ liệu trong database.                       | User chỉ đọc/sửa dữ liệu của mình trong Supabase.                                                                                                                                       |
| Rate-limit                 | Giới hạn số request.                                               | SlowAPI chống spam, brute-force login, gọi AI quá nhiều.                                                                                                                                    |
| Sentry                     | Theo dõi lỗi runtime trên production.                              | Ghi nhận lỗi frontend/backend sau deploy.                                                                                                                                                     |
| OpenTelemetry              | Thu thập trace/metric/log.                                           | Theo dõi latency/request giữa các service.                                                                                                                                                   |
| CI/CD                      | Tự chạy test/build và triển khai khi có code mới.               | GitHub Actions chạy test/lint/build/E2E/backend pytest; Vercel/Render auto-deploy.                                                                                                             |
| Unit test                  | Kiểm thử hàm/module nhỏ độc lập.                               | Backend test idempotency/RAG/forum; frontend test helper/localStore/date-utils.                                                                                                                 |
| Component test             | Kiểm thử component UI riêng lẻ.                                   | StarRating, Toast, CreditBadge, ReadingListPicker.                                                                                                                                              |
| Integration test           | Kiểm thử nhiều module phối hợp.                                  | Backend service phối hợp repository/mock HTTP; frontend context/component tương tác.                                                                                                       |
| System testing             | Kiểm thử hệ thống đã tích hợp.                                | Upload -> pipeline -> Reader, hoặc Q&A đi qua frontend/backend/database/AI.                                                                                                                   |
| E2E test                   | Kiểm thử đầu-cuối như người dùng thật.                      | Playwright test auth, home, protected pages, mobile, forum.                                                                                                                                     |
| Manual test                | Kiểm thử thủ công bởi người thật.                             | Luồng AI phụ thuộc Gemini/HF/Supabase như Upload -> dịch -> Reader.                                                                                                                        |
| UAT                        | User Acceptance Testing.                                              | Kiểm thử sản phẩm có chấp nhận được với người dùng/yêu cầu không.                                                                                                              |
| Regression test            | Chạy lại test để không phá chức năng cũ.                     | CI và test suite chống lỗi hồi quy khi merge PR.                                                                                                                                            |
| Validation testing         | Chứng minh phần mềm đáp ứng yêu cầu.                          | Upload hợp lệ -> pipeline chạy -> Reader hiển thị bản dịch.                                                                                                                              |
| Defect testing             | Cố tìm lỗi bằng tình huống sai/edge case.                       | File sai định dạng, token hết hạn, link hết hạn, truy cập sai quyền.                                                                                                                   |
| Black-box testing          | Test dựa trên input/output, không cần biết code.                 | Katalon/Playwright/manual test từ góc người dùng.                                                                                                                                          |
| White-box testing          | Test dựa trên hiểu biết code.                                     | Unit test service cụ thể như idempotency, RAG owner-scoping.                                                                                                                                 |
| Requirements-based testing | Thiết kế test từ yêu cầu.                                        | Test case PA4 trace từ UC01-UC06, F01-F09 và NFR.                                                                                                                                             |
| Equivalence partitioning   | Chia input thành nhóm tương đương để chọn đại diện test. | Upload: file hợp lệ, sai MIME, quá dung lượng. Login: đúng, sai, rỗng.                                                                                                                  |
| Boundary testing           | Test giá trị biên.                                                 | Ảnh 10MB, batch 5-100 trang, độ dài title/body forum, link TTL.                                                                                                                             |
| Test case                  | Kịch bản test gồm steps, data, expected/actual result.             | PA4 có test cases; PA5 có Katalon test case kèm script.                                                                                                                                      |
| Test data                  | Dữ liệu dùng để test.                                            | Email/password, file ảnh manga, câu hỏi Q&A, page/series id.                                                                                                                                 |
| Expected result            | Kết quả mong đợi.                                                 | Login sai ở lại /login, file sai bị chặn, Q&A có nguồn trích.                                                                                                                            |
| Actual result              | Kết quả thực tế khi chạy test.                                   | Ghi trong test report để kết luận Pass/Fail.                                                                                                                                                |
| Test report                | Tài liệu tổng hợp kết quả test.                                 | PA4 có test_report.docx; PA5 có PA5-Automated-Test-Report.docx.                                                                                                                               |
| Defect/bug                 | Sai lệch giữa actual result và expected result.                    | Nếu fail thì ghi bước tái hiện, mức độ ảnh hưởng, fix và regression.                                                                                                               |
| Record-playback            | Ghi thao tác người dùng rồi phát lại.                          | Katalon hỗ trợ; cần checkpoint/assertion để test thật sự.                                                                                                                                |
| Assertion/checkpoint       | Điều kiện kiểm tra Pass/Fail.                                     | Verify URL vẫn là /login sau login sai, hoặc chuyển /browse sau click.                                                                                                                      |
| Data-driven testing        | Một script chạy với nhiều bộ dữ liệu.                          | Có thể áp dụng cho login nhiều email/password hoặc upload nhiều loại file.                                                                                                              |
| Keyword-driven testing     | Test từ keyword/hành động mức cao.                               | Katalon hỗ trợ Open Browser, Click, Verify...                                                                                                                                                 |
| Katalon Studio             | Công cụ automation UI có record/script/report.                     | PA5 dùng để test UI ổn định như Login/Navigation, có test case, Groovy script và Passed/Failed report.                                                                                 |
| Vitest                     | Framework test JavaScript/TypeScript.                                 | Frontend unit/component test, ví dụ rating, credit badge, reading list, localStorage.                                                                                                         |
| React Testing Library      | Test React theo hành vi người dùng.                               | Render component, tìm text/button, click, kiểm tra kết quả.                                                                                                                                 |
| pytest                     | Framework test Python.                                                | Backend test service FastAPI/Python, ví dụ mock response Gemini/Supabase rồi kiểm tra logic xử lý.                                                                                        |
| respx                      | Mock HTTP cho Python/httpx.                                           | Mock Gemini/Supabase/HTTP call trong backend test.                                                                                                                                              |
| Playwright                 | Framework E2E browser automation.                                     | Test auth, mobile, forum, protected pages trong CI, ví dụ user chưa login bị redirect về`/login`.                                                                                        |
| Staging environment        | Môi trường giống production nhưng dành cho test.                | Nhóm chưa có staging đầy đủ cho Supabase/Gemini; đây là hướng cải thiện.                                                                                                          |
| Quota                      | Giới hạn request/tài nguyên.                                      | Gemini free tier và HF/Render free tier có giới hạn, làm test AI dễ flaky.                                                                                                                |

---

# Chuẩn bị sâu: cơ chế thật đằng sau từng tool testing

**Phần này KHÔNG đọc khi present.** Chỉ để tra khi thầy hỏi xoáy "cái này là gì, nó hoạt động kiểu gì, tại sao lại vậy". Mọi chi tiết dưới đây lấy trực tiếp từ code/config thật trong repo (không suy đoán).

## 1. Katalon Studio

- **Cơ chế:** Katalon là lớp low-code phủ trên **Selenium WebDriver** — bên dưới vẫn là WebDriver điều khiển Chrome thật qua giao thức, chỉ khác là Katalon cho ghi thao tác (record) thành Object Repository + sinh script Groovy, thay vì tự viết code Selenium từ đầu.
- **Trong đồ án chạy thế nào:** Chạy bằng **Katalon Studio 11.3.0**, chế độ CLI `katalonc.exe` (không mở UI), trình duyệt **Chrome 150.0.7871.49**, nhắm thẳng vào **production thật** `storylen.vercel.app` (không mock, không local). Test suite tên `StoryLens Test Suite`, đã chạy 09/07/2026 13:59–14:00, exit code 0.
- **Kết quả thật:** 2 use case × 2 scenario = 4 test case, 4 Pass — `Login_InvalidCredentials`, `Login_EmptyFields`, `Nav_ToBrowsePage`, `Nav_ToForumPage`.
- **Câu hỏi phòng thủ:**
  - *"Katalon với Selenium khác gì nhau?"* → Katalon dùng Selenium WebDriver bên trong; khác biệt là record-playback + Object Repository + report Pass/Fail có sẵn, đỡ phải tự viết framework báo cáo.
  - *"Sao lại test trên production thật mà không phải staging?"* → Vì nhóm chưa có staging riêng cho Supabase/Gemini (đã ghi nhận là hạn chế); 2 luồng Login/Navigation được chọn vì không sinh dữ liệu rác nguy hiểm và ổn định để chạy trên production.

## 2. Vitest + React Testing Library

- **Cơ chế:** Vitest là test runner build trên nền Vite — tận dụng transform pipeline có sẵn của Vite nên khởi động/chạy nhanh hơn Jest (không cần babel transform riêng). Cấu hình thật ở `frontend/vitest.config.ts`: `environment: "jsdom"` (giả lập DOM trong Node, không mở trình duyệt thật), `globals: true` (không cần import `describe/test/expect` thủ công), `setupFiles: vitest.setup.ts`.
- **React Testing Library (RTL):** không test state/props nội bộ component, mà query theo cái **user nhìn thấy** (role, text, label) rồi giả lập click/type, đúng triết lý "test giống cách người dùng dùng UI".
- **Câu hỏi phòng thủ:**
  - *"jsdom là gì, có phải trình duyệt thật không?"* → Không. jsdom là thư viện giả lập DOM API trong Node.js, đủ để render component và query DOM, nhưng không chạy layout/rendering thật như Chrome — vì vậy bug về CSS/layout thật sự phải nhờ Playwright hoặc manual test.

## 3. pytest ở backend — mock bằng gì, cơ chế nào

- **Cấu hình thật** (`backend/pytest.ini`): `asyncio_mode = auto` (dùng plugin **pytest-asyncio**, cho phép viết `async def test_...` mà không cần decorator `@pytest.mark.asyncio` thủ công), `--strict-markers` (marker lạ chưa khai báo sẽ fail thay vì bị bỏ qua âm thầm).
- **Mock Supabase — KHÔNG dùng respx:** Supabase được giả lập bằng một **fake double tự viết** (`backend/tests/conftest.py` — class `FakeSupabase`/`_FakeQuery`), giả lập chuỗi gọi kiểu `.table().select().eq().execute()` và trả về dữ liệu preset, không gọi mạng thật.
- **Mock Gemini — dùng respx:** Gemini API gọi qua HTTP (`httpx`), nên được chặn ở **tầng HTTP** bằng thư viện **respx** (mock request/response theo URL pattern), không cần biết chi tiết implementation bên trong client.
- **Câu hỏi phòng thủ:**
  - *"Mock Supabase và mock Gemini có giống nhau không?"* → Không. Supabase dùng fake double tự viết (giả lập API của SDK), còn Gemini dùng respx (chặn ở tầng HTTP/httpx) — vì hai loại dependency có hình dạng gọi khác nhau, nên chọn kỹ thuật mock khác nhau cho phù hợp.

## 4. Playwright — mock mặc định, không phải luôn test "thật"

- **Cấu hình thật** (`frontend/playwright.config.ts`):
  - Tự bật `next dev` trên **port 3100** (không đụng port 3000 đang chạy tay).
  - **Mặc định KHÔNG gọi backend thật** — test chặn `/v1/**` bằng `page.route()` (mock), chỉ test có gắn tag `@live` mới gọi backend thật.
  - Trên CI: `retries: 1`, `workers: 1` (chạy tuần tự, không song song) để giảm flaky; lưu `trace`/`screenshot`/`video` **chỉ khi fail** để tiết kiệm dung lượng.
  - Project `mobile` **không dùng WebKit/Safari thật** — chỉ dùng Chromium giả lập viewport + user-agent iPhone (390×844, iPhone OS 17). Đây là đánh đổi có chủ đích: bắt được lỗi layout responsive nhưng **không** bắt được bug riêng của Safari.
- **Câu hỏi phòng thủ:**
  - *"Playwright test có gọi backend thật không?"* → Mặc định không, để tránh flaky do mạng/quota; chỉ luồng gắn `@live` mới gọi thật.
  - *"Test mobile có chạy trên iPhone/Safari thật không?"* → Không, dùng Chromium giả lập kích thước màn hình và user-agent iPhone để tiết kiệm chi phí cài WebKit trên CI; đây là hạn chế đã biết.

## 5. GitHub Actions CI — 5 job và một lưu ý về trigger

- **5 job chạy song song** (không phải tuần tự), mỗi job có `timeout-minutes` riêng: `test` (tsc + vitest, 10p), `lint` (ESLint, 5p), `build` (production build, 10p), `e2e` (Playwright chromium+mobile, 15p), `backend` (pytest, 8p).
- **Lưu ý quan trọng nếu bị hỏi xoáy:** trigger hiện tại (`on.push.paths` / `on.pull_request.paths` trong `.github/workflows/ci.yml`) chỉ giới hạn ở `frontend/**` và file workflow — nghĩa là một commit **chỉ sửa backend** (không đụng frontend) **sẽ không tự kích hoạt CI**, kể cả job `backend pytest`. Nếu bị hỏi "CI có chạy mỗi khi sửa backend không?" thì câu trả lời an toàn là: "Hiện path filter đang giới hạn theo frontend, đây là điểm nhóm cần mở rộng thêm `backend/**`/`ai_module/**` vào trigger" — không nên khẳng định CI luôn chạy cho mọi thay đổi.

## 6. Gemini key rotation — round-robin thật, không chỉ failover

- **Cơ chế thật** (`backend/app/services/rag.py`, class `_GeminiPool`): dùng `itertools.cycle()` trên danh sách client theo từng key trong `GEMINI_API_KEY` (comma-separated) → **round-robin thật sự**, mỗi lần gọi Gemini sẽ lấy key kế tiếp theo vòng tròn để chia tải đều, thread-safe (có lock).
- Khi một key gặp lỗi retryable (vd. hết quota) giữa request, code sẽ **thử tiếp key khác trong cùng request** (failover) trước khi trả lỗi.
- **Cache thật có ở đâu (sửa lại câu "throttle + cache" cho chính xác):**
  - Tra từ điển bong bóng (`dictionary.py`): cache **in-process**, `OrderedDict` LRU, tối đa **1024 entry**, key = `bubble_id + hash(text gốc) + hash(bản dịch)`, mất khi restart server (không persist).
  - Tóm tắt chương cho Listen Mode/recap (`rag.py`, `_cache_recap`): lưu **trong Supabase** (persist thật, không mất khi restart).
  - **Không có cache cho bản dịch bong bóng chính** (phần tốn quota Gemini nhiều nhất) — dịch chạy trong AI Module, không qua lớp cache nào ở backend.
  - **Không có "throttle" theo đúng nghĩa rate-limit cho Gemini.** Cái gần nhất là `_pipeline_semaphore` (`BoundedSemaphore`) trong `backend/app/routers/upload.py`, giới hạn số job pipeline chạy đồng thời nói chung (bảo vệ RAM/AI Module), không phải giới hạn riêng cho Gemini.
- **Câu trả lời an toàn nếu bị hỏi "cache/throttle Gemini ở đâu, cho ví dụ":** "Nhóm xoay vòng nhiều Gemini key theo round-robin để chia tải và tự failover khi 1 key hết quota; có cache riêng cho tra từ điển bong bóng và tóm tắt chương để đỡ gọi lại Gemini; còn bản dịch bong bóng chính thì chưa cache, và cũng chưa có rate-limit riêng cho Gemini — đây là hướng cải thiện."

## 7. Kiểm thử tĩnh (static)

- `tsc --noEmit` (TypeScript): chỉ typecheck, không sinh file build — chạy nhanh, bắt lỗi kiểu dữ liệu trước khi build thật.
- ESLint: bắt lỗi coding pattern/style ở frontend.
- Python type hints: không có công cụ "chấm điểm" riêng trong CI hiện tại (không có mypy/pyright chạy trong `ci.yml`) — type hints ở backend chủ yếu hỗ trợ đọc code/IDE autocomplete, **chưa** được enforce tự động trong CI. Nếu bị hỏi "vậy ai kiểm tra type hint Python có đúng không?" thì trả lời trung thực: hiện chưa có static type checker Python chạy trong CI, đây là điểm có thể bổ sung (mypy/pyright).
