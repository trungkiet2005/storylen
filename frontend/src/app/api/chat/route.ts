import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-2.5-flash";

const QA_PROMPT = `Bạn là trợ lý hỏi đáp cho độc giả manga. Chỉ trả lời dựa trên đoạn trích sau.
Nếu không có đủ thông tin, hãy nói rõ là bạn không biết, tuyệt đối không bịa thêm.
Trả lời bằng tiếng Việt, ngắn gọn, và nêu chi tiết nào trong context đã dẫn tới kết luận.

--- NỘI DUNG TRUYỆN ---
{context}
-----------------------

Câu hỏi: {question}
Trả lời:`;

const ROTATE_MARKERS = [
  "429", "quota", "exhausted", "resource_exhausted",
  "rate_limit", "rate limit",
  "403", "permission",
  "api_key_invalid", "api key expired", "api key not valid",
  "invalid api key", "invalid_api_key", "key invalid", "key expired",
  "api key not found",
];

function isRotatableError(text: string): boolean {
  const lower = text.toLowerCase();
  return ROTATE_MARKERS.some((m) => lower.includes(m));
}

async function callGemini(key: string, prompt: string): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (isRotatableError(errText) || isRotatableError(String(res.status))) {
      return null; // rotate to next key
    }
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim() || null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const question: string = body?.question ?? "";
  const context: string = body?.context ?? "";

  if (!question.trim()) {
    return NextResponse.json({ answer: "Câu hỏi không được để trống." });
  }

  const rawKey = process.env.GEMINI_API_KEY ?? "";
  const keys = rawKey.split(",").map((k) => k.trim()).filter(Boolean);

  if (!keys.length) {
    return NextResponse.json({ answer: "GEMINI_API_KEY chưa được cấu hình trên server." });
  }

  const prompt = QA_PROMPT
    .replace("{context}", context.trim() || "(không có ngữ cảnh)")
    .replace("{question}", question.trim());

  const errors: string[] = [];

  for (const key of keys) {
    try {
      const answer = await callGemini(key, prompt);
      if (answer === null) {
        errors.push(`key ...${key.slice(-4)} quota`);
        continue;
      }
      return NextResponse.json({ answer });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      // If the thrown error is also key-related, rotate; otherwise stop
      if (isRotatableError(msg)) continue;
      return NextResponse.json({ answer: `Lỗi Gemini: ${msg}` });
    }
  }

  return NextResponse.json({
    answer: `Tất cả API key đã hết quota. Chi tiết: ${errors.join(" | ")}`,
  });
}
