# "Trước đó trong truyện…" — Chapter Recap Design Spec

**Ngày:** 2026-07-09
**Mục tiêu demo:** khi mở một chương bất kỳ (không phải chương 1), reader tự động
hiện 1 card ngắn tóm tắt chương ngay trước — không cần người dùng gõ câu hỏi.
Tận dụng đúng phần "chín" nhất hiện có của RAG stage (bản dịch đã lưu theo
bubble/trang, Gemini pool, style card sẵn có) để tạo thêm một khoảnh khắc wow
trực quan trong lúc đọc, thay vì chỉ nằm trong chat Q&A.

---

## 1. Bối cảnh

RAG hiện tại (`services/rag.py`, `QAChatPanel`) đã mạnh: streaming, trích dẫn
`[n]` bấm nhảy + spotlight bubble trong `series/[id]/read/page.tsx`. Nhưng mọi
thứ đều **chủ động hỏi mới có** — người đọc phải mở panel, gõ câu hỏi. Không có
gì xảy ra "tự nhiên" khi họ lướt qua chương mới.

`ResumeReading` / `saveNativeReading` đã có pattern lưu tiến độ đọc ở
localStorage, nhưng không tóm tắt nội dung.

## 2. Kết quả mong muốn

| # | Hạng mục |
|---|----------|
| 1 | Mở chương N (N > 1, có chương N-1 đã dịch xong) → card "Trước đó: …" tự hiện ở đầu trang đầu chương |
| 2 | Tóm tắt chỉ trong phạm vi **chương ngay trước** (không toàn bộ truyện) — tránh spoil chương hiện tại |
| 3 | Sinh 1 lần, **cache trong DB** — các lần mở lại không gọi Gemini nữa |
| 4 | Card **dismissible**, không hiện lại nếu người đọc đã đóng (nhớ theo `chapter_id`, giống pattern localStorage đã có) |
| 5 | Không có chương trước / chưa dịch xong / Gemini lỗi → im lặng không hiện card, không phải lỗi chặn đọc |

## 3. Quyết định kiến trúc

- **Không dùng vector search** cho recap — đây là tóm tắt tuần tự một chương cụ
  thể, không phải truy hồi ngữ nghĩa. Lấy thẳng toàn bộ bản dịch của chương
  N-1 theo thứ tự trang/bubble (tái dùng cách sắp xếp trong
  `rag.py:_page_context_from_db`), đưa nguyên vào 1 prompt Gemini tóm tắt.
- **Cache tại `manga_chapters.recap_vi`** (cột mới, nullable text). Sinh lười
  (lazy) ở lần đầu chương đó được yêu cầu recap; ghi lại; các lần sau đọc cột
  thẳng. Không cần cột riêng "recap đã sinh xong" — `NULL` = chưa có/đang chờ,
  chuỗi rỗng `""` = đã thử nhưng không đủ nội dung (tránh gọi lại Gemini vô ích
  mỗi lần mở chương thiếu data).
- **Dùng lại `_GeminiPool`** đã có trong `rag.py` (key rotation, retry) thay vì
  tạo pool riêng — thêm 1 hàm nhỏ trong `rag.py`, không tách service mới (chưa
  đủ lớn để tách).
- **Ownership**: dùng lại `_require_chapter(chapter_id, user_id)` đã có ở
  `routers/series.py` — recap là dữ liệu suy ra từ nội dung riêng tư của user,
  không public.

## 4. Luồng dữ liệu

```
Frontend mở chương N trong series/[id]/read:
  current.chapter_number > 1
    → tìm chapter_id của chương N-1 trong series.chapters
    → đã dismiss chưa? (localStorage) → có thì bỏ qua
    → GET /v1/chapters/{prev_chapter_id}/recap

Backend GET /v1/chapters/{chapter_id}/recap:
  _require_chapter(chapter_id, user.id)   # 404/403 như các endpoint chapter khác
  nếu manga_chapters.recap_vi không NULL  → trả luôn (kể cả "")
  else:
    lấy toàn bộ pages của chapter_id; nếu CÒN bất kỳ trang nào status != "completed"
      → chương chưa dịch xong hẳn → trả {"recap": null}, KHÔNG ghi cache (thử lại sau)
    ngược lại (100% trang đã completed): order by page_number
    lấy bubble_data + translation_history mới nhất của các page đó,
      order theo (page_number, y, x)  — tái dùng logic sort đã có
    nếu không có nội dung dịch nào → lưu recap_vi = "" , trả {"recap": null}
    else → prompt Gemini tóm tắt 2-4 câu tiếng Việt, không dùng markdown
      → lưu recap_vi, trả {"recap": text}
  lỗi Gemini/DB → KHÔNG lưu cache (để lần sau thử lại), trả {"recap": null}

Frontend:
  {"recap": null} → không hiện gì
  {"recap": "..."} → card ở đầu trang đầu chương N, nút đóng → lưu dismissed
```

## 5. Thay đổi cụ thể

### Backend
1. **Migration** `backend/supabase_migration_v8_recap.sql` (mới):
   `ALTER TABLE manga_chapters ADD COLUMN recap_vi text;` (nullable, không default).
2. `services/rag.py`: thêm hàm `get_or_generate_chapter_recap(chapter_id: str) -> str | None`
   — dùng `_GeminiPool`, prompt riêng `_RECAP_PROMPT`, tái dùng cách lấy +
   sort bubble/translation đã có (tách phần lấy context của
   `_page_context_from_db` thành helper dùng chung nếu tiện, nhưng KHÔNG bắt
   buộc nếu làm phức tạp thêm — ưu tiên 1 query riêng đơn giản cho nhiều trang).
3. `models/schemas.py`: thêm `ChapterRecapResponse { recap: str | None }`.
4. `routers/series.py`: thêm `GET /chapters/{chapter_id}/recap` — gọi
   `_require_chapter`, kiểm tra pages đã `completed` chưa, gọi
   `get_or_generate_chapter_recap`, trả response. Không tính phí credit (đây
   là tiện ích đọc, không phải 1 lượt Q&A).

### Frontend
5. `lib/api.ts`: thêm `getChapterRecap(chapterId: string): Promise<{recap: string | null}>`.
6. `series/[id]/read/page.tsx`:
   - Khi `index` đổi và đây là trang đầu tiên của 1 chương có `chapter_number > 1`:
     tìm chapter trước trong `series.chapters`, gọi `getChapterRecap`.
   - State `recap: {chapterId, text} | null`; dismiss lưu vào
     `localStorage` key kiểu `storylens.recap-dismissed.<chapter_id>`.
   - Card style tái dùng token màu/border/shadow hiện có (sharp corner, 2px
     border, hard shadow) — đặt phía trên khu vực đọc, không che ảnh.

## 6. Kiểm thử

- **Backend unit** (`tests/test_recap.py`): monkeypatch supabase + Gemini —
  assert: cache hit trả thẳng không gọi Gemini; cache miss gọi Gemini đúng 1
  lần rồi ghi cột; chương chưa dịch xong → trả `None` không sinh; lỗi Gemini
  → trả `None`, không ghi `""` vào cache (để retry được).
- **Frontend**: `tsc --noEmit` xanh.
- **Demo verify tay**: 1 series có ≥ 2 chương đã dịch xong → mở chương 2 →
  thấy card tóm tắt chương 1 → đóng → mở lại chương 2 → card không hiện lại
  (do đã dismiss) → xoá localStorage → card hiện lại với recap y hệt (từ cache
  DB, không gọi Gemini lần 2 — kiểm tra qua log).

## 7. Ngoài phạm vi (giữ gọn)

- Không tóm tắt "story so far" toàn bộ nhiều chương (đã chốt: chỉ chương liền
  trước).
- Không thêm vào `/reader` (single-page, không có khái niệm chapter kế tiếp
  rõ ràng) hay trang `/qa` đứng riêng — chỉ series reader, nơi có ngữ cảnh
  chương.
- Không trừ credit cho recap.
- Không đổi gì ở luồng Q&A/citation/spotlight đã có.

## 8. Rủi ro

- Nội dung chương trước dài (nhiều trang) → prompt dài → cần cắt bớt độ dài
  input hợp lý (ví dụ giới hạn ký tự tương tự `_context_fallback_answer`) để
  tránh prompt quá khổ; không ảnh hưởng độ chính xác nhiều vì chỉ cần ý chính.
- Cache vĩnh viễn theo chapter — nếu chủ sở hữu sửa lại bản dịch sau khi recap
  đã sinh, recap sẽ lệch. Chấp nhận được cho phạm vi hiện tại (không có
  invalidation); có thể bổ sung sau nếu cần.
