import { CardGridSkeleton } from "@/components/Skeletons";

export default function SeriesLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(16px,3vw,32px)" }}>
        <div style={{ marginBottom: 24 }}>
          <div className="display" style={{ fontSize: "clamp(22px,3vw,30px)", marginBottom: 4 }}>
            Bộ truyện của tôi
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Đang tải danh sách series…</div>
        </div>
        <CardGridSkeleton count={8} minCardWidth={200} />
      </main>
    </div>
  );
}
