// Next.js renders this instantly during navigation to /browse so the user
// never sees a blank screen while the client component mounts + fetches.
import { CardGridSkeleton } from "@/components/Skeletons";

export default function BrowseLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(16px,3vw,32px)" }}>
        <div style={{ marginBottom: 24 }}>
          <div
            className="display"
            style={{ fontSize: "clamp(22px,3vw,32px)", letterSpacing: "-0.02em", marginBottom: 4 }}
          >
            Kho Truyện
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Đang tải dữ liệu từ MangaDex…</div>
        </div>
        <CardGridSkeleton count={12} />
      </main>
    </div>
  );
}
