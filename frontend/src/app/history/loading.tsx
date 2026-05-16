import { RowListSkeleton } from "@/components/Skeletons";

export default function HistoryLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(16px,3vw,28px)" }}>
        <div style={{ marginBottom: 20 }}>
          <div className="display" style={{ fontSize: "clamp(22px,3vw,30px)", marginBottom: 4 }}>
            Lịch sử
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Đang tải danh sách trang đã dịch…</div>
        </div>
        <RowListSkeleton count={6} />
      </main>
    </div>
  );
}
