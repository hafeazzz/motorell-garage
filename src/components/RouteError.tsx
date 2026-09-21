"use client";

// Shared body for every route segment's error.tsx. Next.js renders this in
// place of the page when the Server Component's data fetch throws, and
// passes `reset` to re-run that render without a full page reload.
export function RouteError({
  error,
  reset,
  label,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  label: string;
}) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 20,
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Couldn&apos;t load {label}</div>
      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 18 }}>
        {error.message || "Something went wrong talking to the server."}
      </div>
      <button
        onClick={reset}
        style={{
          background: "var(--accent-green)",
          color: "#04241A",
          fontWeight: 700,
          fontSize: 13,
          padding: "10px 20px",
          borderRadius: 12,
        }}
      >
        Try again
      </button>
    </div>
  );
}
