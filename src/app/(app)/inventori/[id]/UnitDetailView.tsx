"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGarage } from "@/lib/store";
import { rupiah, formatDateStr } from "@/lib/utils";
import { canAccessInventory, isAdminOrAbove, unitTotalModal } from "@/types/database";
import { ExpenseList } from "./ExpenseList";
import { UnitActions } from "./UnitActions";
import { UnitInvestors } from "./UnitInvestors";
import type { InvestorPayout, UnitInvestor } from "@/types/database";

export function UnitDetailView() {
  const { id } = useParams<{ id: string }>();
  const unitId = Number(id);
  const { data } = useGarage();
  const { profile } = data;

  // Unit + expenses come straight from the store — the page opens instantly.
  const unit = data.units.find((u) => u.id === unitId);
  const expenses = data.expenses.filter((e) => e.unit_id === unitId);

  // Server rules live in actions.ts; this only hides controls that would
  // fail. Editing and deleting a unit: owner/admin/manager/mechanic. The
  // investor section: owner/admin only.
  const canManage = isAdminOrAbove(profile);
  const canEdit = canAccessInventory(profile);

  // Investor data is owner/admin-only (RLS) and only needed here, so it's
  // fetched on demand rather than kept in the store.
  const [investors, setInvestors] = useState<UnitInvestor[]>([]);
  const [payouts, setPayouts] = useState<InvestorPayout[]>([]);
  const loadInvestors = useCallback(async () => {
    const sb = createClient();
    const [inv, pay] = await Promise.all([
      sb.from("unit_investors").select("*").eq("unit_id", unitId).order("created_at").returns<UnitInvestor[]>(),
      sb.from("investor_payouts").select("*").eq("unit_id", unitId).returns<InvestorPayout[]>(),
    ]);
    setInvestors(inv.data ?? []);
    setPayouts(pay.data ?? []);
  }, [unitId]);
  useEffect(() => {
    if (canManage) void loadInvestors();
  }, [canManage, loadInvestors, unit?.status, unit?.harga_jual, expenses.length]);

  if (!unit) {
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-sm text-muted-foreground">Unit tidak ditemukan — mungkin sudah dihapus.</p>
        <Link href="/inventori" className="text-sm font-semibold text-primary underline">
          Kembali ke Inventori
        </Link>
      </div>
    );
  }

  const totalModal = unitTotalModal(unit, expenses);

  return (
    <div>
      <div className="mb-4.5 flex items-center gap-3">
        <Link
          href="/inventori"
          className="pressable flex size-10 shrink-0 items-center justify-center rounded-xl bg-card"
          aria-label="Kembali"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1 truncate text-base font-bold">{unit.nama}</div>
        {canEdit && <UnitActions unit={unit} />}
      </div>

      {unit.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element -- plain <img>, matches the rest of this app
        <img src={unit.photo_url} alt={unit.nama} className="mb-4 h-48 w-full rounded-2xl object-cover sm:h-56" />
      )}

      {unit.status === "sold" && (
        <div className="mb-1.5 grid grid-cols-2 gap-1.5">
          <Chip bg="bg-[image:var(--cream-blue-bg)]" fg="text-[var(--cream-blue-fg)]" label="Date acquired" value={formatDateStr(unit.tgl_masuk)} />
          <Chip bg="bg-[image:var(--cream-blue-bg)]" fg="text-[var(--cream-blue-fg)]" label="Date sold" value={formatDateStr(unit.tanggal_jual)} />
        </div>
      )}

      <div className={`mb-5 grid gap-1.5 ${unit.status === "sold" ? "grid-cols-2" : "grid-cols-3"}`}>
        <Chip bg="bg-[image:var(--cream-orange-bg)]" fg="text-[var(--cream-orange-fg)]" label="Purchase cost" value={rupiah(unit.modal_beli)} />
        <Chip bg="bg-[image:var(--cream-green-bg)]" fg="text-[var(--cream-green-fg)]" label="Total capital" value={rupiah(totalModal)} />
        {unit.status !== "sold" && (
          <Chip bg="bg-[image:var(--cream-blue-bg)]" fg="text-[var(--cream-blue-fg)]" label="Date acquired" value={formatDateStr(unit.tgl_masuk)} />
        )}
      </div>

      {canManage && (
        <UnitInvestors
          unitId={unit.id}
          investors={investors}
          payouts={payouts}
          sold={unit.status === "sold"}
          onChange={loadInvestors}
        />
      )}

      <ExpenseList unitId={unit.id} expenses={expenses} />
    </div>
  );
}

function Chip({ bg, fg, label, value }: { bg: string; fg: string; label: string; value: string }) {
  return (
    <div className={`rounded-[13px] p-2.5 text-center ${bg}`}>
      <div className="mb-1 text-[8px] text-black/55">{label}</div>
      <div className={`text-[10px] font-extrabold ${fg}`}>{value}</div>
    </div>
  );
}
