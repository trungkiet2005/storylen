/**
 * Dynamic Open Graph image for /share/[shareId] (Tier B #11).
 *
 * When a user pastes a share URL into Facebook / Zalo / Twitter, the crawler
 * fetches this route and gets a 1200x630 preview card. We composite the
 * translated page thumbnail into a branded card so the share looks like
 * StoryLens content, not a random image.
 */

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Đọc trang truyện đã dịch trên StoryLens";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://storylens-api.onrender.com/v1";

interface ShareData {
  page_id: string;
  translated_image_url?: string | null;
  original_image_url?: string | null;
  thumbnail_url?: string | null;
  metadata?: {
    page_number?: number | null;
    series_id?: string | null;
  };
}

async function fetchShareData(shareId: string): Promise<ShareData | null> {
  try {
    const res = await fetch(`${API_BASE}/share/${encodeURIComponent(shareId)}`, {
      // Crawlers don't carry our auth cookie — share endpoint is anonymous.
      cache: "no-store",
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as ShareData;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { shareId: string } }) {
  const data = await fetchShareData(params.shareId);
  const pageImage =
    data?.translated_image_url ||
    data?.thumbnail_url ||
    data?.original_image_url ||
    null;
  const pageNumber = data?.metadata?.page_number;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#fff",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Left: page preview */}
        <div
          style={{
            width: 440,
            height: 630,
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRight: "5px solid #c8102e",
          }}
        >
          {pageImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pageImage}
              alt=""
              width={440}
              height={630}
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />
          ) : (
            <div style={{ color: "#fff", fontSize: 110, opacity: 0.4, display: "flex" }}>巻</div>
          )}
        </div>

        {/* Right: branded card */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "60px 56px",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, #fffaf0 0%, #f7e8d0 100%)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 18,
                letterSpacing: "0.22em",
                color: "#c8102e",
                fontWeight: 700,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              StoryLens · Manga AI
            </div>
            <div
              style={{
                marginTop: 18,
                fontSize: 56,
                fontWeight: 800,
                color: "#111",
                lineHeight: 1.1,
                display: "flex",
              }}
            >
              Trang truyện đã dịch
            </div>
            <div
              style={{
                marginTop: 14,
                fontSize: 28,
                color: "#444",
                lineHeight: 1.4,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span>Dịch bong bóng tự động bằng AI</span>
              <span>Đọc miễn phí — không cần đăng nhập</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pageNumber != null && (
              <div
                style={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  padding: "8px 14px",
                  background: "#111",
                  color: "#fff",
                  fontSize: 22,
                  fontFamily: "monospace",
                }}
              >
                TRANG · {pageNumber}
              </div>
            )}
            <div
              style={{
                fontSize: 22,
                color: "#7e3a14",
                marginTop: 10,
                display: "flex",
              }}
            >
              storylens.app
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
