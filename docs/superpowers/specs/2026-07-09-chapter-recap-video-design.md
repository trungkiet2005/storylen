# Chapter Recap Video — Frontend Wiring Design Spec

**Ngày:** 2026-07-09
**Mục tiêu:** nối phần frontend còn thiếu cho tính năng "video recap" đã có sẵn ở
backend (`services/recap_video.py`, `POST /narrate/recap/{chapter_id}`) —
tương tự tính năng của repo tham khảo `pashpashpash/manga-reader` (GPT Vision +
giọng đọc → video tóm tắt), nhưng dùng lại đúng pipeline VLM + TTS của Listen
Mode đã có trong StoryLens.

---

## 1. Bối cảnh

- Backend đã hoàn chỉnh: `POST /narrate/recap/{chapter_id}` render mỗi trang
  thành 1 đoạn video (ảnh tĩnh + audio narration), nối bằng ffmpeg, upload lên
  bucket `manga-audio`, trả `{"chapter_id", "video_url"}`. Bị ẩn (503) nếu host
  không có ffmpeg. Trừ `NARRATION_CREDIT_COST × số trang` credit.
- Frontend **chưa có gì**: không có hàm gọi API trong `lib/api.ts`, không có
  nút/UI nào trong `ListenMode.tsx` hay nơi khác để kích hoạt tính năng này.
- Phát hiện thêm trong lúc khảo sát: `ListenMode` (nút "🔊 Nghe") hiện **chỉ
  được mount ở `/reader`** (đọc từng trang lẻ, không có khái niệm chương) —
  **series reader (`series/[id]/read/page.tsx`) chưa hề có Listen Mode**, dù
  đây là nơi duy nhất có khái niệm "chương" cần cho recap. `narrateChapter` /
  chapter-status client cũng đã tồn tại trong `api.ts` nhưng không được dùng ở
  đâu — ngoài phạm vi của spec này (không đụng tới).

## 2. Kết quả mong muốn

| # | Hạng mục |
|---|----------|
| 1 | Series reader có nút "Nghe truyện" (mount `ListenMode`, giống `/reader`) |
| 2 | Trong drawer đó có tab **"Cả chương"** bên cạnh tab **"Trang này"** hiện có |
| 3 | Tab "Cả chương": hiện số credit sẽ tốn (`số trang × chi phí/trang`) trước khi bấm tạo |
| 4 | Bấm tạo → gọi `POST /narrate/recap/{chapter_id}` → hiện spinner + dòng chú thích "có thể mất vài phút với chương dài" (không polling, không job mới) |
| 5 | Kết quả: `<video controls>` phát được ngay + link tải file `.mp4` |
| 6 | Lỗi (thiếu ffmpeg / quá nhiều trang / thiếu credit / Gemini-VLM lỗi) hiện thông báo backend trả về, không phá UI |
| 7 | `/reader` (đọc trang đơn) không đổi hành vi — không có `chapterId` nên chỉ hiện tab "Trang này" như hiện tại |

## 3. Quyết định kiến trúc

- **Không thêm job/polling mới ở backend** cho recap — endpoint đã đồng bộ,
  chấp nhận UX "chờ + spinner", tránh sửa `recap_video.py`/router thêm rủi ro
  cho tính năng backend đã ổn định.
- **Tái dùng `ListenMode.tsx`** làm nơi chứa cả 2 luồng (trang / chương) qua
  tab, thay vì tạo component riêng — tránh trùng lặp engine/voice picker.
- **Chi phí hiển thị trước** cần `credit_cost_per_page` — thêm field này (và
  `max_chapter_pages`) vào response có sẵn của `GET /narrate/voices`
  (`VoicesResponse`) thay vì tạo endpoint mới, vì `ListenMode` đã gọi
  `listVoices()` khi mở drawer.
- **Response type hoá** endpoint recap: thêm `RecapVideoResponse` Pydantic
  model, gắn `response_model` vào route (hiện trả dict thô).
- **Mount `ListenMode` vào series reader** với `pageId` (trang hiện tại) +
  `chapterId` + `chapterPageCount` (từ `current.chapter_id` / số trang của
  chương hiện tại trong `series.chapters`) — mang luôn tính năng nghe từng
  trang vào series reader (gap có sẵn, tận dụng để tránh phải ẩn/hiện tab bằng
  logic riêng).

## 4. Luồng dữ liệu

```
Series reader mount:
  <ListenMode pageId={current.page_id} chapterId={current.chapter_id}
              chapterPageCount={<số trang của current.chapter_id trong series.chapters>} />

Mở drawer → listVoices() (như cũ) → nhận thêm credit_cost_per_page, max_chapter_pages
  → tab mặc định: "Trang này" nếu có pageId, else "Cả chương"

Tab "Cả chương" (chỉ hiện khi có chapterId):
  hiện: "Sẽ tốn {chapterPageCount × credit_cost_per_page} credit cho {chapterPageCount} trang"
  nếu chapterPageCount > max_chapter_pages → disable nút, hiện cảnh báo vượt giới hạn
  bấm "Tạo video recap" →
    setGenerating(true) → POST /narrate/recap/{chapterId} {engine, voice, rate}
    thành công → video_url → render <video controls src=...> + <a download>
    lỗi (APIError) → hiện message backend trả (đã localized tiếng Việt sẵn)
    finally → setGenerating(false)

/reader (không có chapterId) → không hiện tab "Cả chương", hành vi y hệt hiện tại.
```

## 5. Thay đổi cụ thể

### Backend
1. `models/schemas.py`:
   - `VoicesResponse` thêm `credit_cost_per_page: int` và `max_chapter_pages: int`.
   - Thêm `RecapVideoResponse { chapter_id: str, video_url: str }`.
2. `routers/narration.py`:
   - `list_voices`: điền 2 field mới từ `settings.NARRATION_CREDIT_COST` /
     `settings.NARRATION_MAX_CHAPTER_PAGES`.
   - `recap_chapter`: gắn `response_model=RecapVideoResponse`, trả
     `RecapVideoResponse(...)` thay vì dict thô.

### Frontend
3. `lib/api.ts`:
   - `VoicesResponse` interface thêm `credit_cost_per_page: number`,
     `max_chapter_pages: number`.
   - Thêm `getChapterRecapVideo(chapterId, opts?: {engine?, voice?, rate?}): Promise<{chapter_id: string; video_url: string}>`
     → `POST /narrate/recap/${chapterId}`.
4. `components/ListenMode.tsx`:
   - Props thêm `chapterId?: string`, `chapterPageCount?: number`.
   - State `tab: "page" | "chapter"`, mặc định theo có/không `pageId`.
   - Khi `tab === "chapter"` và có `chapterId`: hiện dòng chi phí + cảnh báo
     giới hạn trang, nút riêng gọi `getChapterRecapVideo`, kết quả render
     `<video>` + link tải — tách khỏi state `narration` hiện có (state mới
     `recapVideo: { chapterId: string; videoUrl: string } | null`).
   - Tab "Cả chương" chỉ render khi `chapterId` được truyền vào (giữ `/reader`
     không đổi vì không truyền `chapterId`).
5. `app/series/[id]/read/page.tsx`:
   - Import `ListenMode`, mount cạnh các nút toolbar hiện có (cùng khu vực nút
     bookmark/QA), truyền `pageId={current.page_id}`
     `chapterId={current.chapter_id}`
     `chapterPageCount={series.chapters.find(c => c.chapter_id === current.chapter_id)?.page_count}`.

## 6. Kiểm thử

- **Backend**: mở rộng `test_narration_router.py` — test `list_voices` trả
  đúng `credit_cost_per_page`/`max_chapter_pages`; test `recap_chapter` trả
  đúng field theo `RecapVideoResponse` (mock `recap_video.build_chapter_recap`).
- **Frontend**: mở rộng `ListenMode.test.tsx` (RTL) — tab hiện/ẩn theo
  `chapterId`, hiện đúng dòng chi phí, generate gọi đúng
  `getChapterRecapVideo`, hiện `<video>`/lỗi tương ứng. `tsc --noEmit` xanh
  (không lỗi mới so với baseline hiện tại).
- **Manual verify**: cần `ffmpeg` cài trên máy backend + ≥1 chương đã dịch
  xong hết — mở series reader → Nghe truyện → tab Cả chương → thấy chi phí →
  tạo → video phát được + tải về được.

## 7. Ngoài phạm vi (giữ gọn)

- Không thêm job/polling nền cho recap (giữ đồng bộ, chỉ thêm UX chờ).
- Không đụng tới `narrateChapter`/chapter-status (background job cho narrate
  thường) — dù cũng chưa được wire ở đâu, đó là gap khác, không thuộc yêu cầu
  "recap" lần này.
- Không đổi hành vi `/reader` ngoài việc nó tiếp tục không hiện tab "Cả chương"
  (vì không truyền `chapterId`).
- Không đổi thuật toán render video trong `recap_video.py` (đã ổn định, port
  từ manga-reader).

## 8. Rủi ro

- Chương dài (gần `max_chapter_pages` = 60) có thể khiến request đồng bộ mất
  vài phút — người dùng có thể tưởng bị treo nếu không đọc dòng chú thích;
  chấp nhận theo quyết định UX đã chọn (spinner + cảnh báo, không polling).
- `chapterPageCount` lấy từ `series.chapters[].page_count` — nếu field này
  không đồng bộ với số trang thực tế đã dịch (ví dụ có trang lỗi/pending),
  con số chi phí hiển thị trước có thể chênh nhẹ so với số credit thực trừ
  (backend tính lại theo `list_chapter_pages` tại thời điểm gọi). Chấp nhận vì
  chỉ là ước tính hiển thị trước, không phải giá trị cam kết.
