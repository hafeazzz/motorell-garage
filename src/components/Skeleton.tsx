// Loading-state building blocks for each route's loading.tsx. Next.js
// automatically wraps an async Server Component page in Suspense and shows
// the sibling loading.tsx while its data fetch is in flight — no client-side
// useState/useEffect loading flag needed for these server-rendered pages.

export function SkeletonBlock({ width, height, style }: { width?: number | string; height: number; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ width: width ?? "100%", height, ...style }} />;
}

/** Mimics a unit/profile row: square thumbnail + two lines of text + a pill. */
export function SkeletonRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "var(--card-bg)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <SkeletonBlock width={52} height={52} style={{ borderRadius: 14, flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <SkeletonBlock width="55%" height={14} />
        <SkeletonBlock width="35%" height={11} />
      </div>
      <SkeletonBlock width={64} height={20} style={{ borderRadius: 20, flex: "none" }} />
    </div>
  );
}

export function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </>
  );
}

/** Mimics the big centered summary card at the top of Finance/Report pages. */
export function SkeletonSummaryCard({ height = 120 }: { height?: number }) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 24,
        padding: "22px 20px",
        marginBottom: 14,
      }}
    >
      <SkeletonBlock width={120} height={36} style={{ margin: "0 auto 12px" }} />
      <SkeletonBlock width="100%" height={height} />
    </div>
  );
}

export function SkeletonPageHeader() {
  return (
    <div style={{ marginBottom: 18, display: "flex", flexDirection: "column", gap: 8 }}>
      <SkeletonBlock width={140} height={20} />
      <SkeletonBlock width={200} height={13} />
    </div>
  );
}
