/*
 * StoryLens — Slide thuyết trình cuối kỳ (PA5)
 * CSC10011 · Công nghệ phần mềm cho hệ thống Trí tuệ Nhân tạo · HCMUS
 *
 * Sinh file: StoryLens_Presentation.pptx
 * Chạy lại:  node build_slides.js   (cần: npm i pptxgenjs)
 *
 * Thiết kế: "manga-editorial" đồng bộ với chính sản phẩm —
 *   góc vuông sắc, viền 2px, đổ bóng cứng lệch (panel-shadow),
 *   nhãn chữ hoa giãn ký tự (caps), mực đen + đỏ manga + vàng nhấn.
 */
const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3in x 7.5in (16:9)
pres.author = "Nhóm 1 – StoryLens";
pres.company = "HCMUS · CSC10011";
pres.title = "StoryLens — Báo cáo cuối kỳ";

/* ---------- Bảng màu ---------- */
const INK   = "191512"; // mực đen (màu chủ đạo)
const INK2  = "3A332C"; // mực nhạt
const PAPER = "FFFFFF"; // nền sáng
const CREAM = "F4EEE3"; // nền panel ấm (dùng tiết chế)
const RED   = "D0311E"; // đỏ manga (màu nhấn chính)
const REDDK = "9E2417";
const GOLD  = "E0A32E"; // vàng nhấn (AI / điểm nổi bật)
const BLUE  = "285B7A"; // xanh mực (diagram)
const GREEN = "2E7D4F"; // xanh lá (đạt / thành công)
const SLATE = "6E665D"; // chữ phụ
const HAIR  = "D8D0C4"; // đường kẻ mảnh

const rect = pres.shapes.RECTANGLE;
const line = pres.shapes.LINE;
const tri  = pres.shapes.TRIANGLE;
const oval = pres.shapes.OVAL;

const W = 13.3, H = 7.5, M = 0.62;         // khổ + lề
const CW = W - 2 * M;                        // vùng nội dung
const HEAD = "Arial", BODY = "Calibri";      // font an toàn, hỗ trợ tiếng Việt

/* ---------- Helper ---------- */
const mkShadow = (o = {}) => ({ type: "outer", color: o.color || "000000", blur: o.blur ?? 8, offset: o.offset ?? 3, angle: o.angle ?? 45, opacity: o.opacity ?? 0.16 });

// Thẻ có bóng cứng lệch (dấu ấn thiết kế StoryLens)
function panel(s, x, y, w, h, o = {}) {
  const d = o.depth ?? 0.07;
  const sh = o.shadow || INK;
  s.addShape(rect, { x: x + d, y: y + d, w, h, fill: { color: sh } });
  s.addShape(rect, { x, y, w, h, fill: { color: o.fill || PAPER }, line: { color: o.border || INK, width: o.bw ?? 1.5 } });
}
// Ô nhãn nhỏ chữ hoa
function kicker(s, x, y, txt, color = RED) {
  s.addText(txt.toUpperCase(), { x, y, w: 11, h: 0.3, color, bold: true, fontFace: HEAD, fontSize: 11, charSpacing: 3, margin: 0, valign: "middle" });
}
// Tiêu đề slide sáng
function heading(s, txt, o = {}) {
  s.addText(txt, { x: M, y: o.y ?? 0.82, w: o.w ?? CW, h: o.h ?? 0.85, color: o.color || INK, bold: true, fontFace: HEAD, fontSize: o.size ?? 30, margin: 0, valign: "top", lineSpacingMultiple: 0.95 });
}
// Huy hiệu số vuông
function badge(s, x, y, sz, label, o = {}) {
  s.addShape(rect, { x, y, w: sz, h: sz, fill: { color: o.fill || INK } });
  s.addText(String(label), { x, y, w: sz, h: sz, align: "center", valign: "middle", color: o.color || PAPER, bold: true, fontFace: HEAD, fontSize: o.fs ?? 15, margin: 0 });
}
// Chân trang — tự đánh số theo thứ tự slide (dark = true khi nền tối).
// Chấp nhận cả footer(s, n) cũ (bỏ qua n) lẫn footer(s, true) cho nền tối.
let SLIDE_NO = 0;
const TOTAL = 28;
function footer(s, a1, a2) {
  const dark = a1 === true || a2 === true;
  const nameCol = dark ? PAPER : INK;
  const sc = dark ? "9A9188" : SLATE;
  s.addText([{ text: "StoryLens", options: { bold: true, color: nameCol } }, { text: "   ·   Nhóm 1 · CSC10011", options: { color: sc } }],
    { x: M, y: 7.06, w: 8, h: 0.3, fontFace: BODY, fontSize: 9, margin: 0, valign: "middle" });
  s.addText(String(s._pageNo || 0).padStart(2, "0") + " / " + TOTAL, { x: W - M - 1.4, y: 7.06, w: 1.4, h: 0.3, align: "right", color: sc, fontFace: BODY, fontSize: 9, margin: 0, valign: "middle" });
}
// Mũi tên nối (ngang / dọc)
function arrow(s, x, y, w, h, o = {}) {
  s.addShape(line, { x, y, w, h, line: { color: o.color || INK, width: o.width ?? 2, endArrowType: "triangle", beginArrowType: o.begin || "none" } });
}
// Slide nền tối chuẩn
function darkSlide() {
  const s = pres.addSlide();
  s.background = { color: INK };
  s._pageNo = ++SLIDE_NO;
  return s;
}
function lightSlide() {
  const s = pres.addSlide();
  s.background = { color: PAPER };
  s._pageNo = ++SLIDE_NO;
  return s;
}
// Khung ảnh placeholder (viền nét đứt = chèn ảnh chụp)
function shot(s, x, y, w, h, route, caption) {
  s.addShape(rect, { x: x + 0.06, y: y + 0.06, w, h, fill: { color: INK } });
  s.addShape(rect, { x, y, w, h, fill: { color: CREAM }, line: { color: INK, width: 1.25, dashType: "dash" } });
  s.addText("▣", { x, y: y + h / 2 - 0.55, w, h: 0.5, align: "center", color: SLATE, fontFace: HEAD, fontSize: 22, margin: 0 });
  s.addText("CHÈN ẢNH CHỤP MÀN HÌNH", { x, y: y + h / 2 - 0.06, w, h: 0.3, align: "center", color: SLATE, bold: true, fontFace: HEAD, fontSize: 11, charSpacing: 2, margin: 0 });
  s.addText(route, { x, y: y + h / 2 + 0.24, w, h: 0.3, align: "center", color: RED, bold: true, fontFace: BODY, fontSize: 12, margin: 0 });
  if (caption) s.addText(caption, { x, y: y + h + 0.05, w, h: 0.34, align: "center", color: SLATE, italic: true, fontFace: BODY, fontSize: 11, margin: 0, valign: "top" });
}
// Chip logo trường (nền trắng + bóng cứng đỏ) — để logo xanh nổi trên nền tối
const LOGO = "assets/hcmus_logo.png";
function logoChip(s, x, y, sz) {
  s.addShape(rect, { x: x + 0.09, y: y + 0.09, w: sz, h: sz, fill: { color: RED } });
  s.addShape(rect, { x, y, w: sz, h: sz, fill: { color: PAPER } });
  const lw = sz - 0.32, lh = lw * (411 / 500);
  s.addImage({ path: LOGO, x: x + 0.16, y: y + (sz - lh) / 2, w: lw, h: lh });
}

/* ============================================================
 * SLIDE 1 — TITLE
 * ============================================================ */
(() => {
  const s = darkSlide();
  // thanh dọc đỏ + logo trường HCMUS (chip trắng góc phải)
  s.addShape(rect, { x: 0, y: 0, w: 0.28, h: H, fill: { color: RED } });
  s.addShape(rect, { x: W - 2.35, y: 0.62, w: 0.42, h: 0.42, fill: { color: GOLD } });
  logoChip(s, W - 2.02, 0.62, 1.5);

  kicker(s, 1.1, 1.05, "Báo cáo đồ án cuối kỳ · PA5", GOLD);
  s.addText("StoryLens", { x: 1.02, y: 1.45, w: 10, h: 1.5, color: PAPER, bold: true, fontFace: HEAD, fontSize: 82, margin: 0, valign: "middle" });
  s.addShape(rect, { x: 1.12, y: 3.06, w: 8.4, h: 0.02, fill: { color: RED } });
  s.addText("Nền tảng AI dịch & hỏi–đáp Manga theo ngữ cảnh", { x: 1.1, y: 3.2, w: 10.8, h: 0.6, color: PAPER, fontFace: HEAD, fontSize: 21, margin: 0, valign: "middle" });
  s.addText("Upload → phát hiện · đọc · xoá nền · dịch bong bóng thoại (Nhật/Trung → Việt) → đọc overlay + RAG Q&A",
    { x: 1.1, y: 3.78, w: 11, h: 0.5, color: "C9C0B4", fontFace: BODY, fontSize: 13.5, margin: 0, valign: "top" });

  // dải thông tin dưới
  const infoY = 5.05;
  const cells = [
    ["MÔN HỌC", "CSC10011 — CNPM cho hệ thống AI"],
    ["GVHD", "GS.TS Nguyễn Văn Vũ\nThS. Trương Phước Lộc\nThS. Ngô Ngọc Đăng Khoa"],
    ["NHÓM", "Nhóm 1 — StoryLens"],
    ["NGÀY BÁO CÁO", "10/07/2026 · HCMUS"],
  ];
  const cwd = (11.0) / 4;
  cells.forEach((c, i) => {
    const x = 1.1 + i * cwd;
    const isGvhd = i === 1;
    s.addText(c[0], { x, y: infoY, w: cwd - 0.2, h: 0.26, color: GOLD, bold: true, fontFace: HEAD, fontSize: 9.5, charSpacing: 2, margin: 0 });
    s.addText(c[1], { x, y: infoY + 0.26, w: cwd - 0.2, h: isGvhd ? 1.0 : 0.6, color: PAPER, fontFace: BODY, fontSize: isGvhd ? 10 : 12.5, lineSpacingMultiple: isGvhd ? 1.15 : undefined, margin: 0, valign: "top" });
  });
  s.addText("Thành viên: Đào Sỹ Duy Minh · Nguyễn Đình Hà Dương · Huỳnh Trung Kiệt · Phạm Phú Hòa · Trần Chí Nguyên · Nguyễn Lâm Phú Quý", { x: 1.1, y: 6.35, w: 11.2, h: 0.34, color: SLATE, italic: true, fontFace: BODY, fontSize: 10.5, margin: 0 });
  s.addText("storylens-api.onrender.com  ·  Next.js 16 · FastAPI · HuggingFace Spaces · Supabase", { x: 1.1, y: 6.72, w: 11, h: 0.34, color: "8A8176", fontFace: BODY, fontSize: 10.5, margin: 0 });
  s.addNotes("Slide mở đầu. Giới thiệu tên sản phẩm StoryLens, một câu định vị, môn học/GVHD/nhóm 1 (6 thành viên).");
})();

/* ============================================================
 * SLIDE 2 — AGENDA
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "Nội dung trình bày");
  heading(s, "Nội dung");
  const items = [
    ["I", "Bối cảnh & Vấn đề", "Nhu cầu đọc manga · điểm đau người dùng · định vị sản phẩm"],
    ["II", "Yêu cầu & Người dùng", "Persona · use case · yêu cầu chức năng và phi chức năng"],
    ["III", "Kiến trúc & AI", "3 dịch vụ · pipeline dịch · RAG Q&A · mô hình ML & kết quả"],
    ["IV", "Hiện thực & Chất lượng", "Tính năng · demo · kiểm thử/CI · bảo mật · triển khai"],
    ["V", "Kết quả & Hướng phát triển", "Hạn chế · lỗi đã biết · roadmap · kết luận"],
  ];
  const y0 = 1.95, rh = 0.92, gap = 0.12;
  items.forEach((it, i) => {
    const y = y0 + i * (rh + gap);
    panel(s, M, y, CW, rh, { fill: i % 2 ? CREAM : PAPER });
    badge(s, M + 0.16, y + (rh - 0.62) / 2, 0.62, it[0], { fill: i === 0 ? RED : INK, fs: 20 });
    s.addText(it[1], { x: M + 1.0, y: y + 0.13, w: 4.9, h: 0.4, color: INK, bold: true, fontFace: HEAD, fontSize: 17, margin: 0, valign: "middle" });
    s.addText(it[2], { x: M + 6.0, y: y + 0.13, w: CW - 6.2, h: rh - 0.26, color: SLATE, fontFace: BODY, fontSize: 12.5, margin: 0, valign: "middle" });
  });
  footer(s, 2);
  s.addNotes("Trình bày 5 phần lớn trong ~15 phút (gồm demo), sau đó 10 phút Q&A. Phần III và IV là trọng tâm kỹ thuật; phần demo nằm trong IV. Mỗi thành viên trình bày ít nhất một phần (≥ 3 phút/người).");
})();

/* ============================================================
 * SLIDE 3 — PROBLEM
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "I · Bối cảnh & Vấn đề");
  heading(s, "Vấn đề: đọc manga gốc vẫn còn nhiều rào cản");
  // câu phát biểu lớn
  panel(s, M, 1.95, CW, 1.35, { fill: INK, shadow: RED });
  s.addText([
    { text: "“Thiếu một nền tảng dịch manga tự động có AI hiểu ngữ cảnh và hỏi–đáp thông minh.”", options: { color: PAPER, bold: true, fontFace: HEAD, fontSize: 20, breakLine: true } },
    { text: "Ảnh hưởng tới cộng đồng đọc manga Việt Nam (15–28 tuổi) muốn tiếp cận truyện chất lượng cao chưa có bản dịch.", options: { color: "C9C0B4", fontFace: BODY, fontSize: 13 } },
  ], { x: M + 0.35, y: 1.95, w: CW - 0.7, h: 1.35, margin: 0, valign: "middle", lineSpacingMultiple: 1.0 });

  const pains = [
    ["Fan-sub chậm & không đều", "Bản dịch cộng đồng ra chậm, chất lượng phụ thuộc nhóm dịch, dễ bỏ dở giữa chừng."],
    ["Công cụ dịch mất ngữ cảnh", "Google Lens / dịch từng câu không giữ được xưng hô, mạch truyện, sắc thái nhân vật."],
    ["Không thể hỏi về nội dung", "Người đọc muốn hỏi “nhân vật này là ai?” nhưng không có kênh tra cứu tức thời."],
  ];
  const y = 3.62, cw = (CW - 0.6) / 3;
  pains.forEach((p, i) => {
    const x = M + i * (cw + 0.3);
    panel(s, x, y, cw, 2.55);
    s.addShape(rect, { x: x + 0.28, y: y + 0.3, w: 0.5, h: 0.5, fill: { color: RED } });
    s.addText(String(i + 1), { x: x + 0.28, y: y + 0.3, w: 0.5, h: 0.5, align: "center", valign: "middle", color: PAPER, bold: true, fontFace: HEAD, fontSize: 18, margin: 0 });
    s.addText(p[0], { x: x + 0.28, y: y + 1.0, w: cw - 0.56, h: 0.7, color: INK, bold: true, fontFace: HEAD, fontSize: 15.5, margin: 0, valign: "top", lineSpacingMultiple: 0.95 });
    s.addText(p[1], { x: x + 0.28, y: y + 1.62, w: cw - 0.56, h: 0.8, color: SLATE, fontFace: BODY, fontSize: 12.5, margin: 0, valign: "top" });
  });
  footer(s, 3);
  s.addNotes("Ba điểm đau chính: fan-sub chậm, dịch mất ngữ cảnh, không hỏi được nội dung. Dẫn sang giải pháp.");
})();

/* ============================================================
 * SLIDE 4 — SOLUTION / POSITIONING
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "I · Giải pháp");
  heading(s, "StoryLens — dịch có ngữ cảnh + hỏi–đáp RAG");
  // cột trái: câu định vị
  panel(s, M, 1.95, 6.7, 4.7, { fill: CREAM });
  s.addText("TUYÊN NGÔN ĐỊNH VỊ", { x: M + 0.35, y: 2.2, w: 6, h: 0.3, color: RED, bold: true, fontFace: HEAD, fontSize: 11, charSpacing: 2, margin: 0 });
  s.addText([
    { text: "Cho ", options: { color: INK } }, { text: "người đọc manga Việt (15–28 tuổi)", options: { color: INK, bold: true } },
    { text: " muốn đọc truyện Nhật chưa có bản dịch chính thức,\n", options: { color: INK } },
    { text: "StoryLens ", options: { color: RED, bold: true } },
    { text: "cho phép tải trang truyện lên, ", options: { color: INK } },
    { text: "tự động dịch sang tiếng Việt có ngữ cảnh", options: { color: INK, bold: true } },
    { text: " và ", options: { color: INK } },
    { text: "hỏi AI bất kỳ điều gì về nội dung", options: { color: INK, bold: true } },
    { text: ".", options: { color: INK } },
  ], { x: M + 0.35, y: 2.55, w: 6.0, h: 2.0, fontFace: HEAD, fontSize: 18, margin: 0, valign: "top", lineSpacingMultiple: 1.02 });
  s.addText([
    { text: "KHÁC BIỆT   ", options: { color: RED, bold: true, fontFace: HEAD, fontSize: 11, charSpacing: 2 } },
    { text: "Nền tảng duy nhất kết hợp dịch theo ngữ cảnh + RAG Q&A cho manga tiếng Việt — hiểu toàn bộ câu chuyện, không chỉ từng câu rời rạc.", options: { color: SLATE, fontFace: BODY, fontSize: 12.5 } },
  ], { x: M + 0.35, y: 4.7, w: 6.0, h: 1.6, margin: 0, valign: "top", lineSpacingMultiple: 1.0 });

  // cột phải: 4 trụ giá trị
  const vals = [
    ["Dịch giữ ngữ cảnh", "Xưng hô, mạch truyện & sắc thái được Gemini xử lý theo cả trang."],
    ["Đọc overlay liền mạch", "Bản dịch phủ đúng bong bóng; bật/tắt so sánh bản gốc."],
    ["Hỏi–đáp RAG", "Đặt câu hỏi về nội dung, AI trả lời kèm nguồn trích."],
    ["Cộng đồng & thư viện", "Xuất bản chương, chia sẻ link, diễn đàn, bình luận."],
  ];
  const bx = 7.7, bw = CW - (7.7 - M), by = 1.95, ih = 1.1, ig = 0.13;
  vals.forEach((v, i) => {
    const y = by + i * (ih + ig);
    panel(s, bx, y, bw, ih);
    badge(s, bx + 0.16, y + (ih - 0.6) / 2, 0.6, i + 1, { fill: i === 0 ? RED : INK, fs: 18 });
    s.addText(v[0], { x: bx + 0.95, y: y + 0.14, w: bw - 1.1, h: 0.36, color: INK, bold: true, fontFace: HEAD, fontSize: 15, margin: 0, valign: "middle" });
    s.addText(v[1], { x: bx + 0.95, y: y + 0.5, w: bw - 1.15, h: 0.5, color: SLATE, fontFace: BODY, fontSize: 12, margin: 0, valign: "top" });
  });
  footer(s, 4);
  s.addNotes("Tuyên ngôn định vị theo mẫu Vision. Bốn trụ giá trị: dịch ngữ cảnh, đọc overlay, RAG Q&A, cộng đồng.");
})();

/* ============================================================
 * SLIDE 5 — COMPETITION
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "I · Định vị cạnh tranh");
  heading(s, "So với các lựa chọn hiện có");
  const head = ["Giải pháp", "Dịch ảnh", "Hiểu ngữ cảnh", "Hỏi–đáp AI", "Đọc overlay"];
  const rows = [
    ["Google Lens / OCR", "Có", "Không", "Không", "Không"],
    ["DeepL · ChatGPT", "Thủ công", "Một phần", "Không realtime", "Không"],
    ["Fan-sub thủ công", "Thủ công", "Có", "Không", "Ảnh dịch sẵn"],
    ["StoryLens", "Tự động", "Có (cả trang)", "Có (RAG)", "Có"],
  ];
  const tblY = 2.0;
  const colW = [3.6, 1.9, 2.35, 2.35, CW - (3.6 + 1.9 + 2.35 + 2.35)];
  const body = [[]];
  // header row
  const tableData = [];
  tableData.push(head.map((h, i) => ({ text: h, options: { fill: { color: INK }, color: PAPER, bold: true, fontFace: HEAD, fontSize: 13, align: i === 0 ? "left" : "center", valign: "middle" } })));
  rows.forEach((r, ri) => {
    const isUs = ri === rows.length - 1;
    tableData.push(r.map((c, ci) => ({
      text: c,
      options: {
        fill: { color: isUs ? RED : (ri % 2 ? CREAM : PAPER) },
        color: isUs ? PAPER : (ci === 0 ? INK : (c === "Không" || c === "Không realtime" ? SLATE : INK)),
        bold: isUs || ci === 0,
        fontFace: ci === 0 ? HEAD : BODY, fontSize: ci === 0 ? 13.5 : 12.5,
        align: ci === 0 ? "left" : "center", valign: "middle",
      },
    })));
  });
  s.addTable(tableData, { x: M, y: tblY, w: CW, colW, rowH: [0.55, 0.78, 0.78, 0.78, 0.86], border: { pt: 1, color: INK }, margin: [4, 6, 4, 6] });
  panel(s, M, 6.35, CW, 0.72, { fill: INK, shadow: RED, depth: 0.06 });
  s.addText([
    { text: "Điểm học được → ", options: { color: GOLD, bold: true, fontFace: HEAD, fontSize: 12.5, charSpacing: 1 } },
    { text: "kết hợp tốc độ tự động của máy + độ chính xác giữ ngữ cảnh của người, cộng thêm khả năng hỏi–đáp mà chưa đối thủ nào có.", options: { color: PAPER, fontFace: BODY, fontSize: 12.5 } },
  ], { x: M + 0.35, y: 6.35, w: CW - 0.7, h: 0.72, margin: 0, valign: "middle" });
  footer(s, 5);
  s.addNotes("Bảng so sánh nhanh. Hàng StoryLens tô đỏ để nổi bật. Nhấn: chỉ StoryLens có cả overlay lẫn RAG Q&A.");
})();

/* ============================================================
 * SLIDE 6 — PERSONAS
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "II · Người dùng mục tiêu");
  heading(s, "Ba nhóm người dùng chính");
  const ps = [
    ["Sinh viên đại học", "18–25", "Đọc manga Nhật, kiểm tra bản dịch, tìm hiểu nội dung sâu.", "Dịch chính xác; AI trả lời chi tiết về nhân vật & cốt truyện.", RED],
    ["Học sinh THPT", "15–18", "Đọc truyện mới, thảo luận với bạn bè, nắm nhanh nội dung.", "Giao diện dễ dùng, dịch nhanh, hỏi được về cốt truyện.", BLUE],
    ["Content creator", "25–35", "Làm video review manga, giải thích plot cho khán giả.", "Q&A chi tiết, batch cả chương, sẵn sàng trả phí premium.", GOLD],
  ];
  const y = 1.98, cw = (CW - 0.6) / 3, ch = 4.5;
  ps.forEach((p, i) => {
    const x = M + i * (cw + 0.3);
    panel(s, x, y, cw, ch);
    s.addShape(rect, { x, y, w: cw, h: 0.9, fill: { color: p[5] } });
    s.addText(p[0], { x: x + 0.28, y: y + 0.14, w: cw - 1.3, h: 0.62, color: PAPER, bold: true, fontFace: HEAD, fontSize: 16.5, margin: 0, valign: "middle" });
    s.addShape(rect, { x: x + cw - 1.15, y: y + 0.2, w: 0.9, h: 0.5, fill: { color: INK } });
    s.addText(p[1], { x: x + cw - 1.15, y: y + 0.2, w: 0.9, h: 0.5, align: "center", valign: "middle", color: PAPER, bold: true, fontFace: HEAD, fontSize: 12, margin: 0 });
    s.addText("MỤC TIÊU", { x: x + 0.28, y: y + 1.12, w: cw - 0.56, h: 0.26, color: p[5], bold: true, fontFace: HEAD, fontSize: 10, charSpacing: 2, margin: 0 });
    s.addText(p[2], { x: x + 0.28, y: y + 1.4, w: cw - 0.56, h: 1.1, color: INK, fontFace: BODY, fontSize: 12.8, margin: 0, valign: "top" });
    s.addText("MONG ĐỢI", { x: x + 0.28, y: y + 2.72, w: cw - 0.56, h: 0.26, color: p[5], bold: true, fontFace: HEAD, fontSize: 10, charSpacing: 2, margin: 0 });
    s.addText(p[3], { x: x + 0.28, y: y + 3.0, w: cw - 0.56, h: 1.3, color: SLATE, fontFace: BODY, fontSize: 12.8, margin: 0, valign: "top" });
  });
  footer(s, 6);
  s.addNotes("Ba persona từ tài liệu Vision. Nhấn mạnh nhu cầu chung: dịch chính xác + hỏi được nội dung.");
})();

/* ============================================================
 * SLIDE 7 — USE CASES
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "II · Luồng nghiệp vụ");
  heading(s, "Các use case chính");
  const ucs = [
    ["UC01", "Upload & Dịch trang", "Tải 1 trang → pipeline AI phát hiện, đọc, xoá nền, dịch, render chữ Việt.", RED],
    ["UC02", "Đọc overlay", "Xem bản dịch phủ bong bóng; bật/tắt, copy, từ điển bong bóng, nhiều chế độ đọc.", INK],
    ["UC03", "Batch cả chương", "Chọn nhiều trang → xử lý tuần tự, tiến trình realtime qua WebSocket.", BLUE],
    ["UC04", "Hỏi–đáp RAG", "Đặt câu hỏi về nội dung; tìm ngữ nghĩa trong pgvector + Gemini trả lời.", GREEN],
    ["UC05", "Xuất bản & chia sẻ", "Đăng chương lên thư viện công khai; chia sẻ link có hạn (TTL).", GOLD],
    ["UC06", "Quản trị (Admin)", "Phân tích, kiểm duyệt, giám sát sức khoẻ, cấu hình nguồn AI Module.", INK2],
  ];
  const y0 = 1.98, cw = (CW - 0.5) / 2, ch = 1.4, gx = 0.5, gy = 0.14;
  ucs.forEach((u, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * (cw + gx), y = y0 + row * (ch + gy);
    panel(s, x, y, cw, ch, { fill: PAPER });
    s.addShape(rect, { x, y, w: 1.28, h: ch, fill: { color: u[3] } });
    s.addText(u[0], { x, y: y + 0.18, w: 1.28, h: 0.5, align: "center", color: PAPER, bold: true, fontFace: HEAD, fontSize: 17, margin: 0 });
    s.addText("USE CASE", { x, y: y + 0.82, w: 1.28, h: 0.24, align: "center", color: PAPER, fontFace: HEAD, fontSize: 8, charSpacing: 1.5, margin: 0 });
    s.addText(u[1], { x: x + 1.5, y: y + 0.18, w: cw - 1.7, h: 0.42, color: INK, bold: true, fontFace: HEAD, fontSize: 15.5, margin: 0, valign: "middle" });
    s.addText(u[2], { x: x + 1.5, y: y + 0.62, w: cw - 1.72, h: 0.68, color: SLATE, fontFace: BODY, fontSize: 12, margin: 0, valign: "top" });
  });
  footer(s, 7);
  s.addNotes("Demo sẽ tập trung UC01+UC02 (luồng A) và UC03 (luồng B) — đủ yêu cầu ≥2 use case.");
})();

/* ============================================================
 * SLIDE 7B — USE CASE DIAGRAM (sơ đồ use case)
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "II · Mô hình use case");
  heading(s, "Sơ đồ use case tổng quát");

  // Đoạn thẳng an toàn: luôn dùng w/h ≥ 0 + flipH/flipV (tránh XML âm PowerPoint báo lỗi)
  const seg = (x1, y1, x2, y2, ln) => {
    const x = Math.min(x1, x2), y = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
    const flipV = (x2 - x1) * (y2 - y1) < 0;
    s.addShape(line, { x, y, w, h, flipV, line: ln });
  };
  // Vẽ tác nhân dạng người que
  function stick(cx, topY, label, c) {
    const ln = { color: c, width: 2 };
    s.addShape(oval, { x: cx - 0.14, y: topY, w: 0.28, h: 0.28, line: { color: c, width: 2 }, fill: { color: PAPER } });
    seg(cx, topY + 0.28, cx, topY + 0.8, ln);          // thân
    seg(cx - 0.3, topY + 0.44, cx + 0.3, topY + 0.44, ln); // tay
    seg(cx, topY + 0.8, cx - 0.24, topY + 1.16, ln);   // chân trái
    seg(cx, topY + 0.8, cx + 0.24, topY + 1.16, ln);   // chân phải
    s.addText(label, { x: cx - 1.1, y: topY + 1.2, w: 2.2, h: 0.55, align: "center", color: INK, bold: true, fontFace: HEAD, fontSize: 11.5, margin: 0, valign: "top", lineSpacingMultiple: 0.9 });
  }
  const assoc = (x1, y1, x2, y2, o = {}) => seg(x1, y1, x2, y2, { color: o.color || "B8AFA2", width: o.width || 1.25, dashType: o.dash || "solid" });

  // Ranh giới hệ thống
  const bx = 3.1, by = 1.98, bw = 6.5, bh = 4.62;
  panel(s, bx, by, bw, bh, { fill: PAPER });
  s.addText("Hệ thống  StoryLens", { x: bx, y: by + 0.1, w: bw, h: 0.32, align: "center", color: SLATE, bold: true, fontFace: HEAD, fontSize: 11, charSpacing: 1.5, margin: 0 });

  const OW = 2.82, OH = 0.82;
  const ucs = [
    { id: "UC02", t: "Đọc overlay",        c: INK,   cx: 4.95, cy: 2.95 },
    { id: "UC03", t: "Batch cả chương",    c: BLUE,  cx: 4.95, cy: 4.30 },
    { id: "UC05", t: "Xuất bản & chia sẻ", c: GOLD,  cx: 4.95, cy: 5.65 },
    { id: "UC01", t: "Upload & Dịch trang",c: RED,   cx: 7.75, cy: 2.95 },
    { id: "UC04", t: "Hỏi–đáp RAG",        c: GREEN, cx: 7.75, cy: 4.30 },
    { id: "UC06", t: "Quản trị hệ thống",  c: INK2,  cx: 7.75, cy: 5.65 },
  ];
  const byId = Object.fromEntries(ucs.map(u => [u.id, u]));
  const L = u => [u.cx - OW / 2, u.cy];      // mép trái
  const R = u => [u.cx + OW / 2, u.cy];      // mép phải

  // Liên kết (vẽ trước, oval đè lên)
  const reader = [1.72, 3.98];
  ["UC02", "UC03", "UC05", "UC01", "UC04"].forEach(id => assoc(reader[0], reader[1], ...L(byId[id])));
  const admin = [10.72, 5.5];
  assoc(admin[0], admin[1], ...R(byId["UC06"]));
  // tác nhân phụ AI (nét đứt)
  assoc(9.9, 3.05, ...R(byId["UC01"]), { dash: "dash", color: "9A7B3A" });
  assoc(9.9, 3.45, ...R(byId["UC04"]), { dash: "dash", color: "9A7B3A" });

  // Oval use case
  ucs.forEach(u => {
    s.addShape(oval, { x: u.cx - OW / 2, y: u.cy - OH / 2, w: OW, h: OH, fill: { color: PAPER }, line: { color: u.c, width: 2 } });
    s.addText([{ text: u.id + "  ", options: { color: u.c, bold: true, fontFace: HEAD, fontSize: 11 } }, { text: u.t, options: { color: INK, fontFace: BODY, fontSize: 11 } }],
      { x: u.cx - OW / 2 + 0.1, y: u.cy - OH / 2, w: OW - 0.2, h: OH, align: "center", valign: "middle", margin: 0, lineSpacingMultiple: 0.9 });
  });

  // Tác nhân
  stick(1.5, 3.35, "Người đọc\n(User)", INK);
  stick(10.9, 4.7, "Quản trị viên\n(Admin)", REDDK);
  // hệ phụ AI (hộp)
  s.addShape(rect, { x: 9.78, y: 2.72, w: 2.0, h: 0.98, fill: { color: CREAM }, line: { color: INK, width: 1.5 } });
  s.addText([{ text: "«hệ phụ»\n", options: { color: SLATE, italic: true, fontFace: BODY, fontSize: 9 } }, { text: "AI Module + Gemini", options: { color: INK, bold: true, fontFace: HEAD, fontSize: 10.5 } }],
    { x: 9.78, y: 2.72, w: 2.0, h: 0.98, align: "center", valign: "middle", margin: 0, lineSpacingMultiple: 0.9 });

  s.addText([
    { text: "Tác nhân chính: ", options: { bold: true, color: RED, fontFace: HEAD, fontSize: 11 } },
    { text: "Người đọc, Quản trị viên.   ", options: { color: INK, fontFace: BODY, fontSize: 11 } },
    { text: "Tác nhân phụ: ", options: { bold: true, color: "9A7B3A", fontFace: HEAD, fontSize: 11 } },
    { text: "AI Module + Gemini (hỗ trợ UC01 dịch & UC04 Q&A).", options: { color: INK, fontFace: BODY, fontSize: 11 } },
  ], { x: M, y: 6.72, w: CW, h: 0.32, align: "center", margin: 0, valign: "middle" });
  footer(s, 8);
  s.addNotes("Sơ đồ use case: Người đọc dùng UC01–UC05; Quản trị viên dùng UC06; AI Module + Gemini là tác nhân phụ hỗ trợ dịch (UC01) và Q&A (UC04). Demo bao phủ UC01+UC02 (luồng A) và UC03 (luồng B).");
})();

/* ============================================================
 * SLIDE 8 — FUNCTIONAL REQUIREMENTS
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "II · Yêu cầu chức năng");
  heading(s, "9 nhóm yêu cầu chức năng (F01–F09)");
  const frs = [
    ["F01", "Xác thực & hồ sơ", "Đăng ký/đăng nhập, cookie HttpOnly, avatar, đổi mật khẩu/email, GDPR."],
    ["F02", "Upload ảnh", "1 ảnh hoặc batch; kiểm tra định dạng/kích thước; gắn series/chapter."],
    ["F03", "Pipeline AI", "Detect → OCR → inpaint → dịch → embedding; trạng thái & % tiến trình."],
    ["F04", "Reader & overlay", "Xem/so sánh bản dịch, sửa bản dịch per-bubble, lịch sử hiệu đính."],
    ["F05", "Hỏi–đáp RAG", "Hỏi theo trang/series; tìm ngữ nghĩa; trả lời kèm nguồn trích."],
    ["F06", "Series & chapter", "Tạo series/chương, gán & sắp thứ tự trang, ảnh bìa tự động."],
    ["F07", "Lịch sử", "Danh sách trang/series đã xử lý, lọc & phân trang, tiếp tục đọc."],
    ["F08", "Credit & gói", "Free 5/ngày; gói basic/pro/premium; ledger giao dịch; Stripe."],
    ["F09", "Quản trị", "Phân tích, quản lý người dùng, kiểm duyệt, sức khoẻ, cấu hình, audit."],
  ];
  const y0 = 1.95, cw = (CW - 2 * 0.28) / 3, ch = 1.42, gx = 0.28, gy = 0.16;
  frs.forEach((f, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = M + col * (cw + gx), y = y0 + row * (ch + gy);
    panel(s, x, y, cw, ch, { fill: i % 2 ? PAPER : CREAM });
    s.addText(f[0], { x: x + 0.22, y: y + 0.16, w: 1.2, h: 0.44, color: RED, bold: true, fontFace: HEAD, fontSize: 18, margin: 0, valign: "middle" });
    s.addText(f[1], { x: x + 1.15, y: y + 0.16, w: cw - 1.35, h: 0.44, color: INK, bold: true, fontFace: HEAD, fontSize: 13.5, margin: 0, valign: "middle" });
    s.addText(f[2], { x: x + 0.22, y: y + 0.62, w: cw - 0.44, h: 0.72, color: SLATE, fontFace: BODY, fontSize: 11.5, margin: 0, valign: "top" });
  });
  footer(s, 8);
  s.addNotes("9 nhóm yêu cầu chức năng theo SRS. F03 (pipeline AI) và F05 (RAG) là lõi AI của hệ thống.");
})();

/* ============================================================
 * SLIDE 9 — NON-FUNCTIONAL REQUIREMENTS
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "II · Yêu cầu phi chức năng");
  heading(s, "Chất lượng: hiệu năng, bảo mật, sẵn sàng");
  // 4 stat callouts
  const stats = [
    ["< 3 giây", "Phản hồi UI tương tác", RED],
    ["< 30 giây", "Xử lý AI mỗi trang", INK],
    ["< 10 giây", "Trả lời Q&A", BLUE],
    ["≤ 5 ảnh → 100", "Batch theo gói", GOLD],
  ];
  const sy = 1.98, sw = (CW - 3 * 0.3) / 4;
  stats.forEach((st, i) => {
    const x = M + i * (sw + 0.3);
    panel(s, x, sy, sw, 1.5);
    s.addText(st[0], { x: x + 0.2, y: sy + 0.22, w: sw - 0.4, h: 0.62, color: st[2], bold: true, fontFace: HEAD, fontSize: 24, margin: 0, valign: "middle" });
    s.addText(st[1], { x: x + 0.2, y: sy + 0.9, w: sw - 0.4, h: 0.5, color: SLATE, fontFace: BODY, fontSize: 12, margin: 0, valign: "top" });
  });
  // hai cột nhóm NFR
  const groups = [
    ["Bảo mật", ["Cookie HttpOnly — không lộ token cho JS", "RBAC user/admin + RLS trên Supabase", "Rate-limit, validate input, không hardcode secret", "Security headers + CSP chặt, captcha Turnstile"], RED],
    ["Vận hành & Toàn vẹn", ["Frontend CDN Vercel; backend Docker co giãn", "Semaphore giới hạn luồng AI, tránh OOM", "Ledger credit chỉ ghi thêm (append-only)", "Tự đánh dấu 'failed' cho trang treo khi restart"], BLUE],
  ];
  const gy = 3.68, gw = (CW - 0.5) / 2;
  groups.forEach((g, i) => {
    const x = M + i * (gw + 0.5);
    panel(s, x, gy, gw, 3.05, { fill: i ? PAPER : CREAM });
    s.addShape(rect, { x: x + 0.28, y: gy + 0.3, w: 0.16, h: 0.42, fill: { color: g[2] } });
    s.addText(g[0], { x: x + 0.56, y: gy + 0.28, w: gw - 0.8, h: 0.46, color: INK, bold: true, fontFace: HEAD, fontSize: 17, margin: 0, valign: "middle" });
    s.addText(g[1].map((t, j) => ({ text: t, options: { bullet: { code: "2022", indent: 14 }, color: INK, breakLine: true, paraSpaceAfter: 6 } })),
      { x: x + 0.3, y: gy + 0.85, w: gw - 0.6, h: 2.05, fontFace: BODY, fontSize: 12.3, margin: 0, valign: "top" });
  });
  footer(s, 9);
  s.addNotes("NFR chia 2 nhóm: bảo mật và vận hành/toàn vẹn. Bốn con số hiệu năng ở trên là mục tiêu đã đặt trong SRS.");
})();

/* ============================================================
 * SLIDE 10 — ARCHITECTURE
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "III · Kiến trúc hệ thống");
  heading(s, "Ba dịch vụ triển khai độc lập");
  const box = (x, y, w, h, title, sub, lines, color) => {
    panel(s, x, y, w, h, { fill: PAPER });
    s.addShape(rect, { x, y, w, h: 0.52, fill: { color } });
    s.addText(title, { x: x + 0.18, y: y + 0.02, w: w - 0.36, h: 0.5, color: PAPER, bold: true, fontFace: HEAD, fontSize: 14, margin: 0, valign: "middle" });
    if (sub) s.addText(sub, { x: x + 0.18, y: y + 0.58, w: w - 0.36, h: 0.28, color: SLATE, italic: true, fontFace: BODY, fontSize: 10.5, margin: 0, valign: "middle" });
    s.addText(lines.map(t => ({ text: t, options: { bullet: { code: "2022", indent: 10 }, breakLine: true, paraSpaceAfter: 3, color: INK } })),
      { x: x + 0.2, y: y + 0.9, w: w - 0.4, h: h - 1.0, fontFace: BODY, fontSize: 11, margin: 0, valign: "top" });
  };
  // Frontend (top)
  box(M, 1.95, 5.6, 1.5, "Frontend — Next.js 16", "Vercel · React 19 · TS", ["Pages: Upload · Reader · Q&A · Library · Admin", "api.ts: fetch wrapper + retry cold-start"], INK);
  // Backend (middle)
  box(M, 3.75, 5.6, 1.55, "Backend API — FastAPI", "Render · Docker · Singapore", ["Routers: auth · upload · qa · series · admin…", "Services: ai_pipeline · rag · credit · captcha"], RED);
  // Supabase (bottom right upper)
  box(7.55, 1.95, 5.13, 1.5, "Supabase", "PostgreSQL · AWS", ["pgvector (RAG) + pg_trgm", "Auth · Storage (originals/thumbnails)"], BLUE);
  // AI module (bottom)
  box(7.55, 3.75, 5.13, 1.55, "AI Module — FastAPI", "HuggingFace Spaces · ~4GB", ["YOLOv8 · manga-ocr · LaMa · render", "Sinh embedding câu (pgvector)"], GREEN);
  // Gemini
  panel(s, 7.55, 5.55, 5.13, 0.92, { fill: CREAM });
  s.addText([{ text: "Google Gemini API   ", options: { bold: true, color: INK, fontFace: HEAD, fontSize: 13 } }, { text: "dịch ngữ cảnh + sinh câu trả lời RAG · xoay vòng nhiều API key", options: { color: SLATE, fontFace: BODY, fontSize: 11.5 } }],
    { x: 7.75, y: 5.55, w: 4.8, h: 0.92, margin: 0, valign: "middle" });
  // mũi tên
  arrow(s, M + 2.8, 3.45, 0, 0.3);                 // FE -> BE
  s.addText("HTTPS · cookie", { x: M + 2.95, y: 3.44, w: 2.2, h: 0.3, color: SLATE, italic: true, fontFace: BODY, fontSize: 9.5, margin: 0, valign: "middle" });
  arrow(s, 6.2, 4.5, 1.35, 0);                      // BE -> Supabase(row) & AI
  s.addText("SDK", { x: 6.35, y: 4.18, w: 1.2, h: 0.3, color: SLATE, italic: true, fontFace: BODY, fontSize: 9.5, margin: 0 });
  arrow(s, 10.1, 5.3, 0, 0.25);                     // AI -> Gemini
  footer(s, 10);
  s.addNotes("Kiến trúc microservice + phân tầng. Backend nhẹ (Render free) tách khỏi AI Module nặng (HF Spaces). Supabase là state dùng chung.");
})();

/* ============================================================
 * SLIDE 11 — AI PIPELINE
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "III · Pipeline dịch AI");
  heading(s, "Từ ảnh gốc đến bản dịch overlay");
  const steps = [
    ["YOLOv8", "Phát hiện bong bóng thoại", RED],
    ["manga-ocr", "Đọc chữ Nhật trong bbox", INK],
    ["LaMa", "Xoá chữ gốc (inpaint)", BLUE],
    ["Gemini", "Dịch có ngữ cảnh → Việt", GREEN],
    ["Render", "Vẽ chữ Việt vào bbox", GOLD],
    ["Embedding", "Vector hoá → pgvector", INK2],
  ];
  const n = steps.length, gap = 0.22, cw = (CW - (n - 1) * gap) / n, y = 2.5, ch = 2.35;
  steps.forEach((st, i) => {
    const x = M + i * (cw + gap);
    panel(s, x, y, cw, ch, { fill: PAPER });
    s.addShape(rect, { x, y, w: cw, h: 0.6, fill: { color: st[2] } });
    s.addText(String(i + 1), { x: x + 0.1, y: y + 0.06, w: 0.5, h: 0.48, color: PAPER, bold: true, fontFace: HEAD, fontSize: 16, margin: 0, valign: "middle" });
    s.addText(st[0], { x: x + 0.5, y: y + 0.06, w: cw - 0.6, h: 0.48, color: PAPER, bold: true, fontFace: HEAD, fontSize: 13.5, margin: 0, valign: "middle" });
    s.addText(st[1], { x: x + 0.16, y: y + 0.82, w: cw - 0.32, h: 1.4, color: INK, fontFace: BODY, fontSize: 12, margin: 0, valign: "top", lineSpacingMultiple: 1.02 });
    if (i < n - 1) arrow(s, x + cw + 0.02, y + ch / 2, gap - 0.05, 0, { width: 2.25, color: INK });
  });
  // dải input/output
  panel(s, M, 5.35, CW, 1.15, { fill: INK, shadow: RED });
  s.addText([
    { text: "ĐẦU VÀO  ", options: { color: GOLD, bold: true, fontFace: HEAD, fontSize: 11, charSpacing: 1 } },
    { text: "ảnh trang manga (JPG/PNG/WebP ≤ 10MB)", options: { color: PAPER, fontFace: BODY, fontSize: 12.5, breakLine: true } },
    { text: "ĐẦU RA  ", options: { color: GOLD, bold: true, fontFace: HEAD, fontSize: 11, charSpacing: 1 } },
    { text: "PNG đã dịch (manga-thumbnails) + bubble_data + embeddings · tiến trình realtime qua WebSocket, huỷ hợp tác được", options: { color: PAPER, fontFace: BODY, fontSize: 12.5 } },
  ], { x: M + 0.35, y: 5.35, w: CW - 0.7, h: 1.15, margin: 0, valign: "middle", lineSpacingMultiple: 1.1 });
  footer(s, 11);
  s.addNotes("Pipeline 6 bước chạy trong luồng nền có semaphore. Có fallback M2M100/NLLB nếu Gemini lỗi. Render dùng binary-search cỡ chữ để vừa bbox.");
})();

/* ============================================================
 * SLIDE 12 — RAG Q&A
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "III · Hỏi–đáp thông minh");
  heading(s, "RAG Q&A trên nội dung truyện");
  const steps = [
    ["1", "Câu hỏi", "Người dùng hỏi về 1 trang / series bằng ngôn ngữ tự nhiên."],
    ["2", "Embedding", "Gemini embedding vector hoá câu hỏi."],
    ["3", "Tìm pgvector", "Cosine search top-k đoạn text bong bóng liên quan."],
    ["4", "Sinh câu trả lời", "Context + câu hỏi → Gemini (xoay vòng key) trả lời."],
  ];
  const n = steps.length, gap = 0.34, cw = (CW - (n - 1) * gap) / n, y = 2.3, ch = 2.4;
  steps.forEach((st, i) => {
    const x = M + i * (cw + gap);
    panel(s, x, y, cw, ch, { fill: i === n - 1 ? CREAM : PAPER });
    badge(s, x + 0.22, y + 0.24, 0.62, st[0], { fill: i === n - 1 ? RED : INK, fs: 20 });
    s.addText(st[1], { x: x + 0.22, y: y + 1.02, w: cw - 0.44, h: 0.5, color: INK, bold: true, fontFace: HEAD, fontSize: 15, margin: 0, valign: "top" });
    s.addText(st[2], { x: x + 0.22, y: y + 1.5, w: cw - 0.44, h: 0.82, color: SLATE, fontFace: BODY, fontSize: 12, margin: 0, valign: "top" });
    if (i < n - 1) arrow(s, x + cw + 0.04, y + ch / 2, gap - 0.08, 0, { width: 2.25 });
  });
  // callouts
  const outs = [["1 credit", "trừ mỗi câu trả lời thành công", RED], ["Có nguồn trích", "đính kèm đoạn text làm bằng chứng", INK], ["768-dim", "embedding gemini-001 · pgvector", BLUE]];
  const oy = 5.35, ow = (CW - 2 * 0.3) / 3;
  outs.forEach((o, i) => {
    const x = M + i * (ow + 0.3);
    panel(s, x, oy, ow, 1.15);
    s.addText(o[0], { x: x + 0.24, y: oy + 0.16, w: ow - 0.48, h: 0.5, color: o[2], bold: true, fontFace: HEAD, fontSize: 21, margin: 0, valign: "middle" });
    s.addText(o[1], { x: x + 0.24, y: oy + 0.68, w: ow - 0.48, h: 0.4, color: SLATE, fontFace: BODY, fontSize: 12, margin: 0, valign: "top" });
  });
  footer(s, 12);
  s.addNotes("RAG: embedding → tìm pgvector → Gemini sinh câu trả lời kèm nguồn. Mỗi câu trả lời thành công trừ 1 credit.");
})();

/* ============================================================
 * SLIDE 13 — ML MODELS & RESULTS
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "III · Mô hình ML & đánh giá");
  heading(s, "Kết quả huấn luyện vượt ngưỡng đặt ra");
  // trái: bar chart YOLOv8
  panel(s, M, 1.98, 6.35, 4.5, { fill: PAPER });
  s.addText("YOLOv8 · Phát hiện bong bóng", { x: M + 0.3, y: 2.14, w: 5.8, h: 0.36, color: INK, bold: true, fontFace: HEAD, fontSize: 14.5, margin: 0 });
  s.addText("Manga109-s · test 956 ảnh / 14.130 box · ngưỡng 85%", { x: M + 0.3, y: 2.48, w: 5.8, h: 0.3, color: SLATE, italic: true, fontFace: BODY, fontSize: 11, margin: 0 });
  s.addChart(pres.charts.BAR, [{ name: "YOLOv8", labels: ["mAP@.5", "mAP@.5:.95", "Precision", "Recall"], values: [95.3, 84.4, 97.3, 93.8] }], {
    x: M + 0.15, y: 2.85, w: 6.05, h: 3.5, barDir: "col",
    chartColors: [RED, RED, RED, RED],
    showValue: true, dataLabelPosition: "outEnd", dataLabelColor: INK, dataLabelFontFace: HEAD, dataLabelFontSize: 11, dataLabelFontBold: true, dataLabelFormatCode: "0.0",
    valAxisMinVal: 0, valAxisMaxVal: 100, valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" },
    catAxisLabelColor: INK, catAxisLabelFontFace: BODY, catAxisLabelFontSize: 11,
    showLegend: false, showTitle: false, barGapWidthPct: 55,
  });
  // phải: OCR + Gemini
  const cards = [
    ["manga-ocr (fine-tuned)", "OCR tiếng Nhật · test 14.130 mẫu", [["CER", "6.1%"], ["Char-Acc", "93.9%"], ["Exact", "67.5%"]], INK],
    ["Gemini 2.5 Flash", "Dịch ngữ cảnh · human-in-the-loop", [["👍 hài lòng", "≥ 80%"], ["Model", "2.5 Flash"], ["Embedding", "768-dim"]], GREEN],
  ];
  const rx = 7.5, rw = CW - (7.5 - M);
  cards.forEach((c, i) => {
    const y = 1.98 + i * 2.32;
    panel(s, rx, y, rw, 2.16, { fill: i ? CREAM : PAPER });
    s.addShape(rect, { x: rx, y, w: 0.16, h: 2.16, fill: { color: c[3] } });
    s.addText(c[0], { x: rx + 0.34, y: y + 0.16, w: rw - 0.5, h: 0.4, color: INK, bold: true, fontFace: HEAD, fontSize: 15, margin: 0, valign: "middle" });
    s.addText(c[1], { x: rx + 0.34, y: y + 0.56, w: rw - 0.5, h: 0.3, color: SLATE, italic: true, fontFace: BODY, fontSize: 11, margin: 0 });
    const mw = (rw - 0.34 - 0.3) / 3;
    c[2].forEach((m, j) => {
      const mx = rx + 0.34 + j * mw;
      s.addText(m[1], { x: mx, y: y + 0.95, w: mw - 0.1, h: 0.55, color: c[3], bold: true, fontFace: HEAD, fontSize: 22, margin: 0, valign: "middle" });
      s.addText(m[0], { x: mx, y: y + 1.52, w: mw - 0.1, h: 0.3, color: SLATE, fontFace: BODY, fontSize: 11, margin: 0 });
    });
  });
  footer(s, 13);
  s.addNotes("Kết quả ML thật đưa vào SAD mục 7.5. YOLOv8 mAP@0.5 95.3% và OCR CER 6.1% đều vượt ngưỡng. Gemini đánh giá bằng human-in-the-loop.");
})();

/* ============================================================
 * SLIDE 14 — TECH STACK
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "III · Công nghệ");
  heading(s, "Ngăn xếp công nghệ");
  const groups = [
    ["Frontend", RED, ["Next.js 16 (App Router)", "React 19 · TypeScript", "Tailwind + Framer Motion", "PWA + offline"]],
    ["Backend", INK, ["FastAPI · Python 3.11", "Uvicorn / Gunicorn", "SlowAPI rate-limit", "Sentry + OpenTelemetry"]],
    ["AI / ML", GREEN, ["YOLOv8 (ultralytics)", "manga-ocr (fine-tuned)", "LaMa inpaint", "Gemini 2.5 Flash"]],
    ["Dữ liệu & Hạ tầng", BLUE, ["Supabase Postgres", "pgvector · pg_trgm", "Vercel · Render · HF", "GitHub Actions CI"]],
  ];
  const y = 1.98, cw = (CW - 3 * 0.3) / 4, ch = 4.55;
  groups.forEach((g, i) => {
    const x = M + i * (cw + 0.3);
    panel(s, x, y, cw, ch, { fill: PAPER });
    s.addShape(rect, { x, y, w: cw, h: 0.72, fill: { color: g[1] } });
    s.addText(g[0], { x: x + 0.2, y, w: cw - 0.4, h: 0.72, color: PAPER, bold: true, fontFace: HEAD, fontSize: 15, margin: 0, valign: "middle" });
    s.addText(g[2].map(t => ({ text: t, options: { bullet: { code: "2022", indent: 12 }, breakLine: true, paraSpaceAfter: 10, color: INK } })),
      { x: x + 0.24, y: y + 0.95, w: cw - 0.44, h: ch - 1.1, fontFace: BODY, fontSize: 12.5, margin: 0, valign: "top" });
  });
  footer(s, 14);
  s.addNotes("Stack đầy đủ 3 dịch vụ + dữ liệu. Nhấn: mọi thứ chạy trên tier miễn phí/rẻ nhưng vẫn production.");
})();

/* ============================================================
 * SLIDE 15 — FEATURE HIGHLIGHTS
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "IV · Tính năng nổi bật");
  heading(s, "Ngoài lõi dịch — một hệ sinh thái đầy đủ");
  const fs = [
    ["Reader nâng cao", "Nhiều chế độ đọc, phím tắt, vuốt mobile, từ điển bong bóng, cảnh báo độ tin cậy thấp.", RED],
    ["Studio QC", "Hiệu đính per-bubble (approve/reject), tìm–thay thế hàng loạt, phản hồi 👍/👎.", INK],
    ["Thư viện & chia sẻ", "Xuất bản chương công khai, đọc ẩn danh, chia sẻ link TTL + OG image.", BLUE],
    ["Cộng đồng", "Diễn đàn (mention, đính kèm, vote), bình luận chương, hồ sơ /u/{username}.", GREEN],
    ["Gamification (Wibu)", "Bookmark, rating, reading list, mục tiêu, XP/level, thành tựu + thông báo.", GOLD],
    ["Credit & thanh toán", "Free 5/ngày; gói basic/pro/premium; Stripe checkout/webhook; điểm danh streak.", INK2],
  ];
  const y0 = 1.98, cw = (CW - 2 * 0.28) / 3, ch = 2.15, gx = 0.28, gy = 0.18;
  fs.forEach((f, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = M + col * (cw + gx), y = y0 + row * (ch + gy);
    panel(s, x, y, cw, ch, { fill: PAPER });
    s.addShape(rect, { x: x + 0.26, y: y + 0.28, w: 0.46, h: 0.46, fill: { color: f[2] } });
    s.addText(String(i + 1), { x: x + 0.26, y: y + 0.28, w: 0.46, h: 0.46, align: "center", valign: "middle", color: PAPER, bold: true, fontFace: HEAD, fontSize: 15, margin: 0 });
    s.addText(f[0], { x: x + 0.9, y: y + 0.26, w: cw - 1.1, h: 0.5, color: INK, bold: true, fontFace: HEAD, fontSize: 15, margin: 0, valign: "middle" });
    s.addText(f[1], { x: x + 0.28, y: y + 0.92, w: cw - 0.56, h: 1.1, color: SLATE, fontFace: BODY, fontSize: 12.3, margin: 0, valign: "top" });
  });
  footer(s, 15);
  s.addNotes("Hệ sinh thái quanh lõi dịch: reader, QC, thư viện, cộng đồng, gamification, thanh toán. Cho thấy quy mô production.");
})();

/* ============================================================
 * SLIDES 16–18 — DEMO SCREENSHOTS (placeholders)
 * ============================================================ */
function demoSlide(n, part, title, shots, note) {
  const s = lightSlide();
  kicker(s, M, 0.5, "IV · Demo · " + part);
  heading(s, title);
  const y = 1.95;
  if (shots.length === 2) {
    const w = (CW - 0.5) / 2, h = 4.4;
    shots.forEach((sh, i) => shot(s, M + i * (w + 0.5), y, w, h, sh[0], sh[1]));
  } else {
    const w = CW, h = 4.5;
    shot(s, M, y, w, h, shots[0][0], shots[0][1]);
  }
  if (note) {
    s.addText([{ text: "Điểm nhấn khi demo:  ", options: { bold: true, color: RED, fontFace: HEAD, fontSize: 12 } }, { text: note, options: { color: SLATE, fontFace: BODY, fontSize: 12 } }],
      { x: M, y: 6.6, w: CW, h: 0.4, margin: 0, valign: "middle" });
  }
  footer(s, n);
  return s;
}
demoSlide(16, "Luồng A", "Trang chủ & Upload → Dịch",
  [["/  (Trang chủ)", "Landing + nền anime động + 'Tiếp tục đọc'"], ["/upload", "Kéo-thả trang manga Nhật, chọn cấu hình AI"]],
  "đăng nhập → kéo-thả 1 trang → pipeline chạy realtime (YOLOv8 → manga-ocr → LaMa → Gemini).")
  .addNotes("Chụp trang chủ và trang upload. Khi demo: đăng nhập tài khoản demo, kéo-thả 1 trang, chờ pipeline.");
demoSlide(17, "Luồng A", "Reader overlay & Studio QC",
  [["/reader?page=…", "Bản dịch phủ bong bóng, bật/tắt so sánh"], ["/studio (QC)", "Hiệu đính per-bubble, tìm–thay thế"]],
  "mở Reader xem overlay tiếng Việt; bật/tắt bản gốc; mở từ điển bong bóng; hiệu đính trong Studio.")
  .addNotes("Chụp Reader có overlay dịch và màn Studio QC. Cần AI Module sống để có bản dịch thật.");
demoSlide(18, "Luồng B + Q&A", "Batch cả chương · RAG Q&A · Thư viện",
  [["/upload (batch) · /qa", "Batch nhiều trang + tiến trình x/N realtime; hỏi–đáp"], ["/library · /admin", "Thư viện công khai; bảng điều khiển quản trị"]],
  "batch cả chương xử lý tuần tự; hỏi AI về nội dung; xuất bản lên thư viện; xem admin dashboard.")
  .addNotes("Chụp batch upload + tiến trình, Q&A, thư viện công khai và admin. Đây là luồng B (UC03) + RAG (UC04).");

/* ============================================================
 * SLIDE 19 — PROCESS (RUP + Scrum + roles)
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "IV · Quy trình phát triển");
  heading(s, "RUP rút gọn + Scrum theo sprint 2 tuần");
  // 4 pha RUP
  const phases = [["Inception", "Vision, kế hoạch, weekly report"], ["Elaboration", "Use case, kiến trúc, UI prototype, test plan"], ["Construction", "Source code, test case, defect, báo cáo"], ["Transition", "Triển khai, demo, nộp bài cuối kỳ"]];
  const py = 1.98, pw = (CW - 3 * 0.24) / 4;
  phases.forEach((p, i) => {
    const x = M + i * (pw + 0.24);
    panel(s, x, py, pw, 1.5, { fill: i === 3 ? CREAM : PAPER });
    s.addText("PHA " + (i + 1), { x: x + 0.2, y: py + 0.16, w: pw - 0.4, h: 0.26, color: RED, bold: true, fontFace: HEAD, fontSize: 9.5, charSpacing: 2, margin: 0 });
    s.addText(p[0], { x: x + 0.2, y: py + 0.42, w: pw - 0.4, h: 0.4, color: INK, bold: true, fontFace: HEAD, fontSize: 15, margin: 0, valign: "top" });
    s.addText(p[1], { x: x + 0.2, y: py + 0.84, w: pw - 0.4, h: 0.6, color: SLATE, fontFace: BODY, fontSize: 11, margin: 0, valign: "top" });
    if (i < 3) arrow(s, x + pw + 0.02, py + 0.75, 0.2, 0, { width: 2 });
  });
  // Scrum + Roles
  panel(s, M, 3.72, 5.7, 3.0, { fill: INK, shadow: RED });
  s.addText("WEEKLY SCRUM", { x: M + 0.32, y: 3.95, w: 5, h: 0.3, color: GOLD, bold: true, fontFace: HEAD, fontSize: 12, charSpacing: 2, margin: 0 });
  s.addText([
    { text: "Đã làm gì từ tuần trước?", options: { bullet: { code: "2022", indent: 14 }, color: PAPER, breakLine: true, paraSpaceAfter: 8 } },
    { text: "Đang gặp vướng mắc gì?", options: { bullet: { code: "2022", indent: 14 }, color: PAPER, breakLine: true, paraSpaceAfter: 8 } },
    { text: "Tuần tới sẽ hoàn thành gì?", options: { bullet: { code: "2022", indent: 14 }, color: PAPER, breakLine: true, paraSpaceAfter: 8 } },
  ], { x: M + 0.32, y: 4.35, w: 5.1, h: 1.5, fontFace: BODY, fontSize: 14, margin: 0, valign: "top" });
  s.addText("Sprint = 2 tuần · PR review trước khi merge · CI xanh mới nộp.", { x: M + 0.32, y: 6.0, w: 5.1, h: 0.6, color: "C9C0B4", italic: true, fontFace: BODY, fontSize: 11.5, margin: 0, valign: "top" });

  panel(s, 6.55, 3.72, CW - (6.55 - M), 3.0, { fill: PAPER });
  s.addText("VAI TRÒ THEO RUP (mẫu)", { x: 6.8, y: 3.95, w: 5.6, h: 0.3, color: RED, bold: true, fontFace: HEAD, fontSize: 12, charSpacing: 1.5, margin: 0 });
  const roles = [["Team Lead / PM", "Kế hoạch, phân công, weekly report"], ["Business Analyst", "Thu thập & rà soát yêu cầu"], ["Designer", "Kiến trúc, UI, tài liệu SAD"], ["Implementer ×3", "Source code, unit test, review"], ["Tester", "Test plan, test case, system test"]];
  const ry = 4.35;
  roles.forEach((r, i) => {
    const yy = ry + i * 0.46;
    s.addShape(rect, { x: 6.8, y: yy + 0.04, w: 0.12, h: 0.3, fill: { color: i === 3 ? RED : INK } });
    s.addText(r[0], { x: 7.02, y: yy, w: 2.5, h: 0.38, color: INK, bold: true, fontFace: HEAD, fontSize: 12.5, margin: 0, valign: "middle" });
    s.addText(r[1], { x: 9.5, y: yy, w: CW - (9.5 - M) - 0.2, h: 0.38, color: SLATE, fontFace: BODY, fontSize: 11.5, margin: 0, valign: "middle" });
  });
  footer(s, 19);
  s.addNotes("Quy trình theo RUP rút gọn + Scrum (LN03b). Bảng bên phải là mẫu vai trò theo RUP; phân công thực tế cho 6 thành viên ở slide kế tiếp.");
})();

/* ============================================================
 * SLIDE 19B — TEAM ORGANIZATION & RESPONSIBILITIES
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "IV · Tổ chức nhóm");
  heading(s, "Cơ cấu nhóm & phân công công việc");
  s.addText([
    { text: "Nhóm 6 thành viên · mô hình phẳng (flat team) — ", options: { color: INK, bold: true, fontFace: HEAD, fontSize: 12 } },
    { text: "không cấp bậc cứng nhắc; mọi quyết định kỹ thuật quan trọng được thảo luận tập thể.", options: { color: SLATE, fontFace: BODY, fontSize: 12 } },
  ], { x: M, y: 1.78, w: CW, h: 0.36, margin: 0, valign: "middle" });

  const members = [
    ["23122041", "Đào Sỹ Duy Minh", "Project Manager & AI/ML Engineer", RED, "Quản lý tiến độ, điều phối nhóm · Fine-tune OCR cho manga tiếng Nhật · Prompt engineering cho dịch LLM"],
    ["23122002", "Nguyễn Đình Hà Dương", "AI/ML Engineer (OCR)", RED, "Chuẩn bị & xử lý dataset manga · Hỗ trợ fine-tune OCR · Đánh giá accuracy, phân tích lỗi"],
    ["23122039", "Huỳnh Trung Kiệt", "Backend Developer", INK, "FastAPI backend · Thiết kế cơ sở dữ liệu · Tích hợp pipeline OCR/dịch vào server"],
    ["23122030", "Phạm Phú Hòa", "AI/ML Engineer (RAG)", GREEN, "Tích hợp LLM (Gemini) · Vector database (pgvector) · Pipeline hỏi–đáp RAG"],
    ["23122044", "Trần Chí Nguyên", "Frontend Developer", BLUE, "Giao diện Next.js/React (UI-UX) · Upload & Reader · Màn hình hỏi–đáp Q&A"],
    ["23122048", "Nguyễn Lâm Phú Quý", "QA & Business Analyst", GOLD, "Tài liệu (SDP, Vision, Use case) · Test case & test plan · UAT, kiểm thử end-to-end"],
  ];
  const colW = [1.2, 2.15, 2.55, CW - (1.2 + 2.15 + 2.55)];
  const th = o => ({ fill: { color: INK }, color: PAPER, bold: true, fontFace: HEAD, fontSize: 11, valign: "middle", align: o || "left" });
  const data = [[
    { text: "MSSV", options: th() }, { text: "Họ và tên", options: th() },
    { text: "Vai trò", options: th() }, { text: "Trách nhiệm chính", options: th() },
  ]];
  members.forEach((m, i) => {
    const bg = i % 2 ? CREAM : PAPER;
    data.push([
      { text: m[0], options: { fill: { color: bg }, color: SLATE, fontFace: BODY, fontSize: 10, valign: "middle" } },
      { text: m[1], options: { fill: { color: bg }, color: INK, bold: true, fontFace: HEAD, fontSize: 10.5, valign: "middle" } },
      { text: m[2], options: { fill: { color: bg }, color: m[3], bold: true, fontFace: BODY, fontSize: 10, valign: "middle" } },
      { text: m[4], options: { fill: { color: bg }, color: INK2, fontFace: BODY, fontSize: 9.5, valign: "middle" } },
    ]);
  });
  s.addTable(data, { x: M, y: 2.3, w: CW, colW, rowH: [0.4, 0.72, 0.72, 0.72, 0.72, 0.72, 0.72], border: { pt: 1, color: HAIR }, margin: [3, 5, 3, 5], valign: "middle" });
  footer(s, 20);
  s.addNotes("Cơ cấu nhóm phẳng, 6 thành viên. PA5 yêu cầu nêu rõ team structure + trách nhiệm từng người: mỗi bạn phụ trách một mảng (PM/AI-OCR, AI-OCR, Backend, AI-RAG, Frontend, QA/BA) và ai cũng trình bày một phần khi bảo vệ.");
})();

/* ============================================================
 * SLIDE 20 — TESTING & CI
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "IV · Kiểm thử & CI/CD");
  heading(s, "Chất lượng được kiểm thử & tự động hoá");
  // trái: các loại test (Katalon Studio là kiểm thử tự động bắt buộc của PA5)
  const tests = [
    ["Katalon Studio", "Kiểm thử UI tự động: UC01 Upload–Dịch & UC02 Đọc overlay · ≥2 scenario/UC · Pass/Fail", true],
    ["Unit / Component", "Vitest + React Testing Library (frontend)"],
    ["Backend", "pytest + respx (mock Supabase/Gemini)"],
    ["E2E", "Playwright: auth, home, protected, mobile, forum, edge-cases"],
    ["Tĩnh", "tsc --noEmit · ESLint · Python type hints"],
  ];
  const tCol = [RED, GOLD, INK, BLUE, GREEN];
  panel(s, M, 1.98, 6.5, 4.55, { fill: PAPER });
  s.addText("Tầng kiểm thử", { x: M + 0.3, y: 2.12, w: 5.9, h: 0.36, color: INK, bold: true, fontFace: HEAD, fontSize: 15, margin: 0 });
  tests.forEach((t, i) => {
    const y = 2.6 + i * 0.76;
    s.addShape(rect, { x: M + 0.3, y, w: 0.46, h: 0.46, fill: { color: tCol[i] } });
    s.addText(String(i + 1), { x: M + 0.3, y, w: 0.46, h: 0.46, align: "center", valign: "middle", color: PAPER, bold: true, fontFace: HEAD, fontSize: 14, margin: 0 });
    s.addText([{ text: t[0], options: { color: INK, bold: true, fontFace: HEAD, fontSize: 13.5 } }, ...(t[2] ? [{ text: "  · PA5", options: { color: RED, bold: true, fontFace: HEAD, fontSize: 10 } }] : [])], { x: M + 0.92, y: y - 0.06, w: 5.4, h: 0.34, margin: 0, valign: "middle" });
    s.addText(t[1], { x: M + 0.92, y: y + 0.28, w: 5.4, h: 0.44, color: SLATE, fontFace: BODY, fontSize: 11, margin: 0, valign: "top" });
  });
  // phải: CI pipeline
  panel(s, 7.45, 1.98, CW - (7.45 - M), 4.55, { fill: INK, shadow: RED });
  s.addText("GITHUB ACTIONS · 5 JOB SONG SONG", { x: 7.7, y: 2.2, w: 5, h: 0.3, color: GOLD, bold: true, fontFace: HEAD, fontSize: 11.5, charSpacing: 1.5, margin: 0 });
  const jobs = ["Typecheck (tsc)", "Lint (ESLint)", "Production build", "Playwright E2E", "Backend pytest"];
  jobs.forEach((j, i) => {
    const y = 2.65 + i * 0.72;
    s.addShape(rect, { x: 7.7, y, w: CW - (7.45 - M) - 0.5, h: 0.58, fill: { color: INK2 }, line: { color: "4A4038", width: 1 } });
    s.addText("✓", { x: 7.85, y, w: 0.4, h: 0.58, color: GREEN, bold: true, fontFace: HEAD, fontSize: 16, margin: 0, valign: "middle" });
    s.addText(j, { x: 8.3, y, w: 3.8, h: 0.58, color: PAPER, fontFace: BODY, fontSize: 13, margin: 0, valign: "middle" });
    s.addText("main", { x: CW + M - 1.5, y, w: 1.1, h: 0.58, align: "right", color: SLATE, italic: true, fontFace: BODY, fontSize: 10, margin: 0, valign: "middle" });
  });
  s.addText("Mọi PR phải review + CI xanh trước khi merge vào main.", { x: 7.7, y: 6.15, w: 5, h: 0.3, color: "C9C0B4", italic: true, fontFace: BODY, fontSize: 11, margin: 0 });
  footer(s, 20);
  s.addNotes("Kiểm thử đa tầng + CI 5 job song song. Katalon Studio là công cụ kiểm thử tự động bắt buộc của PA5: tối thiểu 2 use case (UC01, UC02), mỗi use case ≥ 2 scenario, báo cáo Pass/Fail kèm test script. Định nghĩa 'done' gồm review, test pass, deploy & verify trên production.");
})();

/* ============================================================
 * SLIDE 21 — SECURITY
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "IV · Bảo mật");
  heading(s, "Phòng thủ nhiều lớp");
  const secs = [
    ["Xác thực", "Cookie HttpOnly (không lộ token cho JS); auto-refresh; Google OAuth."],
    ["Phân quyền", "RBAC user/admin ở API + RLS trên mọi bảng dữ liệu người dùng."],
    ["Chống lạm dụng", "Rate-limit (SlowAPI) theo endpoint; captcha Turnstile ở đăng ký / quên MK."],
    ["Header & CSP", "Security headers + CSP chặt trên mọi response, kể cả /docs."],
    ["Kiểm tra upload", "Pillow verify() chống giả mạo MIME; chỉ nhận JPEG/PNG/WebP thật."],
    ["Chống SSRF", "scraper chỉ nhận domain trong allowlist khi nhập từ nguồn ngoài."],
  ];
  const y0 = 1.98, cw = (CW - 2 * 0.28) / 3, ch = 2.15, gx = 0.28, gy = 0.18;
  secs.forEach((sc, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = M + col * (cw + gx), y = y0 + row * (ch + gy);
    panel(s, x, y, cw, ch, { fill: i % 2 ? CREAM : PAPER });
    s.addShape(rect, { x: x + 0.26, y: y + 0.26, w: 0.5, h: 0.5, fill: { color: INK } });
    s.addText("🛡", { x: x + 0.26, y: y + 0.26, w: 0.5, h: 0.5, align: "center", valign: "middle", color: GOLD, fontFace: HEAD, fontSize: 15, margin: 0 });
    s.addText(sc[0], { x: x + 0.92, y: y + 0.26, w: cw - 1.1, h: 0.5, color: INK, bold: true, fontFace: HEAD, fontSize: 15, margin: 0, valign: "middle" });
    s.addText(sc[1], { x: x + 0.28, y: y + 0.92, w: cw - 0.56, h: 1.1, color: SLATE, fontFace: BODY, fontSize: 12.3, margin: 0, valign: "top" });
  });
  footer(s, 21);
  s.addNotes("Bảo mật nhiều lớp: xác thực cookie, RBAC+RLS, rate-limit+captcha, CSP, kiểm tra upload, chống SSRF.");
})();

/* ============================================================
 * SLIDE 22 — DEPLOYMENT
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "IV · Triển khai");
  heading(s, "Bốn nền tảng, tự động deploy từ main");
  const deploys = [
    ["Frontend", "Vercel", "Global CDN", "Auto-deploy khi push main", RED],
    ["Backend API", "Render", "Singapore · Docker", "render.yaml · free tier 512MB", INK],
    ["AI Module", "HuggingFace", "Spaces · ~4GB", "Deploy Docker thủ công", GREEN],
    ["DB + Storage", "Supabase", "AWS us-east-1", "Postgres + pgvector + Auth", BLUE],
  ];
  const y = 1.98, cw = (CW - 3 * 0.3) / 4, ch = 3.0;
  deploys.forEach((d, i) => {
    const x = M + i * (cw + 0.3);
    panel(s, x, y, cw, ch, { fill: PAPER });
    s.addShape(rect, { x, y, w: cw, h: 0.66, fill: { color: d[4] } });
    s.addText(d[0], { x: x + 0.18, y, w: cw - 0.36, h: 0.66, color: PAPER, bold: true, fontFace: HEAD, fontSize: 14, margin: 0, valign: "middle" });
    s.addText(d[1], { x: x + 0.2, y: y + 0.82, w: cw - 0.4, h: 0.5, color: INK, bold: true, fontFace: HEAD, fontSize: 18, margin: 0, valign: "top" });
    s.addText(d[2], { x: x + 0.2, y: y + 1.35, w: cw - 0.4, h: 0.5, color: d[4], bold: true, fontFace: BODY, fontSize: 12, margin: 0, valign: "top" });
    s.addText(d[3], { x: x + 0.2, y: y + 1.85, w: cw - 0.4, h: 1.0, color: SLATE, fontFace: BODY, fontSize: 11.5, margin: 0, valign: "top" });
  });
  // dải giám sát
  panel(s, M, 5.35, CW, 1.15, { fill: CREAM });
  s.addText([
    { text: "Vận hành:  ", options: { bold: true, color: RED, fontFace: HEAD, fontSize: 12.5 } },
    { text: "keep-alive ping chống ngủ (Render/HF) · health check /health & /health/deep · Sentry + OpenTelemetry giám sát · Supabase PITR backup 7 ngày.", options: { color: INK, fontFace: BODY, fontSize: 12.5 } },
  ], { x: M + 0.35, y: 5.35, w: CW - 0.7, h: 1.15, margin: 0, valign: "middle" });
  footer(s, 22);
  s.addNotes("Bốn nền tảng độc lập, auto-deploy từ main. Có keep-alive, health check, giám sát và backup PITR.");
})();

/* ============================================================
 * SLIDE 23 — LIMITATIONS & KNOWN DEFECTS
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "V · Nhìn thẳng vào hạn chế");
  heading(s, "Hạn chế & lỗi đã biết");
  const lims = [
    ["Cold start", "Render free & HF Spaces ngủ sau khi rảnh → lần đầu chậm 15–60s (đã có keep-alive)."],
    ["Quota Gemini", "Free tier giới hạn RPD → xoay vòng key + throttle + cache; cao điểm vẫn có thể bị giới hạn."],
    ["OCR chữ hiệu ứng (SFX)", "Chữ viết tay / hiệu ứng độ chính xác giảm; bong bóng SFX có thể bị bỏ qua."],
    ["Bố cục chữ Việt dài", "Bong bóng nhỏ phải thu nhỏ cỡ chữ hoặc cắt bớt (có tooltip đầy đủ)."],
  ];
  const defs = [
    "Token phiên hết hạn giữa chừng → đôi khi cần tải lại trang (đang hoàn thiện auto-refresh).",
    "WebSocket mất gói khi mạng chập chờn → fallback polling, tiến trình có thể 'nhảy' %.",
    "Signed URL ảnh có thể hết hạn với phiên đọc rất dài → đã thêm retry tải ảnh.",
    "Thiết bị mobile cũ: nền anime động có thể tụt FPS (tắt được trong cài đặt).",
  ];
  // trái: limitations cards
  const ly = 1.98, lw = 6.5, lh = 1.08;
  lims.forEach((l, i) => {
    const y = ly + i * (lh + 0.12);
    panel(s, M, y, lw, lh, { fill: PAPER });
    s.addText(l[0], { x: M + 0.24, y: y + 0.12, w: lw - 0.48, h: 0.34, color: RED, bold: true, fontFace: HEAD, fontSize: 13.5, margin: 0, valign: "top" });
    s.addText(l[1], { x: M + 0.24, y: y + 0.46, w: lw - 0.48, h: 0.56, color: SLATE, fontFace: BODY, fontSize: 11.5, margin: 0, valign: "top" });
  });
  // phải: known defects
  panel(s, 7.45, 1.98, CW - (7.45 - M), 4.82, { fill: INK, shadow: RED });
  s.addText("LỖI ĐÃ BIẾT (đang xử lý)", { x: 7.7, y: 2.2, w: 5, h: 0.3, color: GOLD, bold: true, fontFace: HEAD, fontSize: 12, charSpacing: 1.5, margin: 0 });
  s.addText(defs.map(d => ({ text: d, options: { bullet: { code: "2022", indent: 14 }, color: PAPER, breakLine: true, paraSpaceAfter: 12 } })),
    { x: 7.7, y: 2.65, w: CW - (7.45 - M) - 0.5, h: 4.0, fontFace: BODY, fontSize: 12.8, margin: 0, valign: "top", lineSpacingMultiple: 1.02 });
  footer(s, 23);
  s.addNotes("Trung thực về hạn chế: cold start, quota, OCR SFX, bố cục chữ dài — và các lỗi đang xử lý. Cho thấy sự chín chắn kỹ thuật.");
})();

/* ============================================================
 * SLIDE 24 — FUTURE WORK
 * ============================================================ */
(() => {
  const s = lightSlide();
  kicker(s, M, 0.5, "V · Hướng phát triển");
  heading(s, "Roadmap tiếp theo");
  const fw = [
    ["OCR & dịch tốt hơn", "Fine-tune thêm cho SFX/chữ viết tay; hỗ trợ thêm cặp ngôn ngữ (Hàn, Anh)."],
    ["Sắp xếp bong bóng RTL", "Cải thiện thứ tự đọc phải-sang-trái cho bố cục phức tạp."],
    ["Nâng độ sẵn sàng", "Chuyển tier trả phí giảm cold start; hàng đợi tác vụ chuyên dụng."],
    ["Cá nhân hoá", "Gợi ý truyện theo lịch sử đọc; cải thiện RAG đa-trang / cả series."],
    ["Kiểm duyệt & bản quyền", "Công cụ chống vi phạm bản quyền, quy trình DMCA rõ ràng."],
    ["Ứng dụng di động", "Đóng gói PWA thành app; đọc offline mượt hơn."],
  ];
  const y0 = 1.98, cw = (CW - 2 * 0.28) / 3, ch = 2.15, gx = 0.28, gy = 0.18;
  fw.forEach((f, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = M + col * (cw + gx), y = y0 + row * (ch + gy);
    panel(s, x, y, cw, ch, { fill: i % 2 ? PAPER : CREAM });
    s.addText("→", { x: x + 0.24, y: y + 0.22, w: 0.6, h: 0.5, color: RED, bold: true, fontFace: HEAD, fontSize: 26, margin: 0, valign: "middle" });
    s.addText(f[0], { x: x + 0.86, y: y + 0.26, w: cw - 1.1, h: 0.55, color: INK, bold: true, fontFace: HEAD, fontSize: 14.5, margin: 0, valign: "middle", lineSpacingMultiple: 0.95 });
    s.addText(f[1], { x: x + 0.28, y: y + 0.98, w: cw - 0.56, h: 1.05, color: SLATE, fontFace: BODY, fontSize: 12.3, margin: 0, valign: "top" });
  });
  footer(s, 24);
  s.addNotes("Roadmap: OCR/dịch tốt hơn, RTL, giảm cold start, cá nhân hoá, bản quyền, mobile.");
})();

/* ============================================================
 * SLIDE 25 — CONCLUSION (dark)
 * ============================================================ */
(() => {
  const s = darkSlide();
  s.addShape(rect, { x: 0, y: 0, w: 0.28, h: H, fill: { color: RED } });
  kicker(s, M + 0.2, 0.6, "V · Kết luận", GOLD);
  s.addText("Một sản phẩm AI hoàn chỉnh, chạy thật.", { x: M + 0.2, y: 0.95, w: CW - 0.2, h: 0.9, color: PAPER, bold: true, fontFace: HEAD, fontSize: 32, margin: 0, valign: "top" });
  const stats = [
    ["3", "dịch vụ triển khai độc lập", RED],
    ["95.3%", "mAP@0.5 phát hiện bong bóng", GOLD],
    ["6.1%", "CER OCR tiếng Nhật", GOLD],
    ["9+", "nhóm yêu cầu chức năng", PAPER],
  ];
  const sy = 2.2, sw = (CW - 0.2 - 3 * 0.3) / 4;
  stats.forEach((st, i) => {
    const x = M + 0.2 + i * (sw + 0.3);
    panel(s, x, sy, sw, 1.55, { fill: INK2, border: "4A4038", shadow: "000000" });
    s.addText(st[0], { x: x + 0.15, y: sy + 0.18, w: sw - 0.3, h: 0.72, color: st[2], bold: true, fontFace: HEAD, fontSize: 32, margin: 0, valign: "middle" });
    s.addText(st[1], { x: x + 0.15, y: sy + 0.92, w: sw - 0.3, h: 0.55, color: "C9C0B4", fontFace: BODY, fontSize: 12, margin: 0, valign: "top" });
  });
  const takeaways = [
    "Pipeline AI end-to-end: phát hiện → OCR → xoá nền → dịch ngữ cảnh → RAG Q&A.",
    "Kỹ thuật production: microservice, WebSocket, bảo mật nhiều lớp, CI 5 job, giám sát.",
    "Áp dụng quy trình CNPM: RUP rút gọn + Scrum, tài liệu SAD/SRS/SDP đồng bộ code thật.",
  ];
  panel(s, M + 0.2, 4.1, CW - 0.2, 2.5, { fill: INK2, border: "4A4038", shadow: "000000" });
  s.addText("ĐIỀU ĐẠT ĐƯỢC", { x: M + 0.5, y: 4.32, w: 6, h: 0.3, color: GOLD, bold: true, fontFace: HEAD, fontSize: 12, charSpacing: 2, margin: 0 });
  s.addText(takeaways.map(t => ({ text: t, options: { bullet: { code: "2022", indent: 16 }, color: PAPER, breakLine: true, paraSpaceAfter: 12 } })),
    { x: M + 0.5, y: 4.72, w: CW - 0.9, h: 1.75, fontFace: BODY, fontSize: 14, margin: 0, valign: "top", lineSpacingMultiple: 1.02 });
  footer(s, 25, true);
  s.addNotes("Chốt lại: sản phẩm AI hoàn chỉnh chạy thật, kỹ thuật production, áp dụng đúng quy trình CNPM. Nhấn 4 con số.");
})();

/* ============================================================
 * SLIDE 26 — THANK YOU / Q&A (dark)
 * ============================================================ */
(() => {
  const s = darkSlide();
  s.addShape(rect, { x: W - 1.9, y: H - 1.9, w: 0.9, h: 0.9, fill: { color: GOLD } });
  s.addShape(rect, { x: W - 1.55, y: H - 1.55, w: 0.9, h: 0.9, fill: { color: RED } });
  logoChip(s, W - 2.02, 0.6, 1.5);
  kicker(s, 1.1, 1.6, "Cảm ơn Thầy & các bạn đã lắng nghe", GOLD);
  s.addText("Câu hỏi & Thảo luận", { x: 1.02, y: 2.0, w: 11, h: 1.3, color: PAPER, bold: true, fontFace: HEAD, fontSize: 54, margin: 0, valign: "middle" });
  s.addShape(rect, { x: 1.12, y: 3.35, w: 6.0, h: 0.02, fill: { color: RED } });
  s.addText("StoryLens", { x: 1.1, y: 3.55, w: 10, h: 0.6, color: RED, bold: true, fontFace: HEAD, fontSize: 24, margin: 0 });
  const links = [
    ["Web", "storylens-api.onrender.com"],
    ["AI Module", "huynhtrungkiet09032005-ai-storylen.hf.space"],
    ["Tài khoản demo", "demo.pa3@storylens.app"],
    ["Nhóm", "Nhóm 1 — CSC10011 · GVHD: GS.TS Nguyễn Văn Vũ, ThS. Trương Phước Lộc, ThS. Ngô Ngọc Đăng Khoa"],
  ];
  links.forEach((l, i) => {
    const y = 4.3 + i * 0.6;
    const isTeam = i === links.length - 1;
    s.addText(l[0].toUpperCase(), { x: 1.1, y, w: 2.3, h: 0.4, color: GOLD, bold: true, fontFace: HEAD, fontSize: 11, charSpacing: 1.5, margin: 0, valign: "middle" });
    s.addText(l[1], { x: 3.5, y, w: 9, h: 0.4, color: PAPER, fontFace: BODY, fontSize: isTeam ? 11 : 14, margin: 0, valign: "middle" });
  });
  s.addNotes("Slide cảm ơn + Q&A. Sẵn sàng demo trực tiếp nếu Thầy yêu cầu. Nhớ đánh thức AI Module trước khi demo.");
})();

/* ---------- Xuất file ---------- */
const OUT = process.env.OUT || "StoryLens_Presentation.pptx";
pres.writeFile({ fileName: OUT }).then(f => console.log("✔ Đã tạo:", f)).catch(e => { console.error(e); process.exit(1); });
