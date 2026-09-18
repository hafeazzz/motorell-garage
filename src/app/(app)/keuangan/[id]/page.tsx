import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rupiah, formatDateStr } from "@/lib/utils";
import { unitTotalModal } from "@/types/database";
import { UnitEditForm } from "./UnitEditForm";
import { ExpenseList } from "./ExpenseList";
import type { Unit, UnitExpense } from "@/types/database";

export default async function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: unit } = await supabase
    .from("units")
    .select("*")
    .eq("id", Number(id))
    .single<Unit>();

  if (!unit) notFound();

  const { data: expenses } = await supabase
    .from("unit_expenses")
    .select("*")
    .eq("unit_id", unit.id)
    .order("tanggal", { ascending: false })
    .returns<UnitExpense[]>();

  const totalModal = unitTotalModal(unit, expenses ?? []);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <Link
          href="/keuangan"
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "var(--card-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          ←
        </Link>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{unit.nama}</div>
      </div>

      {unit.status === "sold" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 7 }}>
          <Chip bg="var(--cream-blue-bg)" fg="var(--cream-blue-fg)" label="Date acquired" value={formatDateStr(unit.tgl_masuk)} />
          <Chip bg="var(--cream-blue-bg)" fg="var(--cream-blue-fg)" label="Date sold" value={formatDateStr(unit.tanggal_jual)} />
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: unit.status === "sold" ? "1fr 1fr" : "1fr 1fr 1fr",
          gap: 7,
          marginBottom: 20,
        }}
      >
        <Chip bg="var(--cream-orange-bg)" fg="var(--cream-orange-fg)" label="Purchase cost" value={rupiah(unit.modal_beli)} />
        <Chip bg="var(--cream-green-bg)" fg="var(--cream-green-fg)" label="Total capital" value={rupiah(totalModal)} />
        {unit.status !== "sold" && (
          <Chip bg="var(--cream-blue-bg)" fg="var(--cream-blue-fg)" label="Date acquired" value={formatDateStr(unit.tgl_masuk)} />
        )}
      </div>

      <UnitEditForm unit={unit} />
      <ExpenseList unitId={unit.id} expenses={expenses ?? []} />
    </div>
  );
}

function Chip({ bg, fg, label, value }: { bg: string; fg: string; label: string; value: string }) {
  return (
    <div style={{ background: bg, borderRadius: 13, padding: "11px 7px", textAlign: "center" }}>
      <div style={{ fontSize: 8, color: "rgba(0,0,0,0.55)", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 10, fontWeight: 800, color: fg }}>{value}</div>
    </div>
  );
}
