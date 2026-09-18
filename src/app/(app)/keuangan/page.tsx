import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Unit, UnitStatus } from "@/types/database";

const STATUS_LABEL: Record<UnitStatus, string> = {
  progress: "In Progress",
  ready: "Ready",
  booked: "Booked",
  sold: "Sold",
};
const STATUS_BG: Record<UnitStatus, string> = {
  progress: "var(--cream-orange-bg)",
  ready: "var(--cream-green-bg)",
  booked: "var(--cream-purple-bg)",
  sold: "var(--cream-blue-bg)",
};
const STATUS_FG: Record<UnitStatus, string> = {
  progress: "var(--cream-orange-fg)",
  ready: "var(--cream-green-fg)",
  booked: "var(--cream-purple-fg)",
  sold: "var(--cream-blue-fg)",
};

export default async function KeuanganPage() {
  const supabase = await createClient();
  const { data: units } = await supabase
    .from("units")
    .select("*")
    .neq("status", "sold")
    .order("tgl_masuk", { ascending: false })
    .returns<Unit[]>();

  const list = units ?? [];
  const ready = list.filter((u) => u.status === "ready").length;
  const progress = list.filter((u) => u.status === "progress").length;
  const booked = list.filter((u) => u.status === "booked").length;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Finance</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          {ready} ready · {progress} in progress · {booked} booked
        </div>
      </div>

      <Link
        href="/keuangan/new"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: "100%",
          background: "var(--card-bg-alt)",
          border: "1px solid var(--accent-green)",
          color: "var(--accent-green)",
          borderRadius: 16,
          padding: 13,
          fontSize: 13.5,
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        + Add unit
      </Link>

      {list.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", textAlign: "center", padding: "20px 0" }}>
          No units yet — add the first one above.
        </p>
      )}

      {list.map((unit) => (
        <Link
          key={unit.id}
          href={`/keuangan/${unit.id}`}
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
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              flex: "none",
              background: STATUS_BG[unit.status],
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{unit.nama}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {unit.plat} · {unit.tahun}
            </div>
            {unit.harga_jual && (
              <div style={{ fontSize: 11.5, color: "var(--cream-green-fg)", fontWeight: 700, marginTop: 3 }}>
                Target: Rp {unit.harga_jual.toLocaleString("id-ID")}
              </div>
            )}
          </div>
          <span
            style={{
              flex: "none",
              fontSize: 11,
              fontWeight: 700,
              padding: "5px 10px",
              borderRadius: 20,
              background: STATUS_BG[unit.status],
              color: STATUS_FG[unit.status],
            }}
          >
            {STATUS_LABEL[unit.status]}
          </span>
        </Link>
      ))}
    </div>
  );
}
