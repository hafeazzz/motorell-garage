import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { rupiah, formatDateStr } from "@/lib/utils";
import { unitTotalModal } from "@/types/database";
import { ExpenseList } from "./ExpenseList";
import { UnitActions } from "./UnitActions";
import { UnitInvestors } from "./UnitInvestors";
import type { InvestorPayout, Profile, Unit, UnitExpense, UnitInvestor } from "@/types/database";

export default async function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_owner")
    .eq("id", user!.id)
    .single<Pick<Profile, "role" | "is_owner">>();
  // Edit/Delete are owner/admin-only server-side (see actions.ts's
  // requireAdmin() calls) — this just hides the buttons for everyone else
  // rather than showing controls that would fail when clicked.
  const canManage = !!profile && (profile.is_owner || profile.role === "admin");

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

  // Investor data is owner/admin-only (RLS), so only fetch it for them. If
  // the phase-3 migration hasn't been run yet these come back empty
  // rather than failing the page.
  let investors: UnitInvestor[] = [];
  let payouts: InvestorPayout[] = [];
  if (canManage) {
    const [inv, pay] = await Promise.all([
      supabase.from("unit_investors").select("*").eq("unit_id", unit.id).order("created_at").returns<UnitInvestor[]>(),
      supabase.from("investor_payouts").select("*").eq("unit_id", unit.id).returns<InvestorPayout[]>(),
    ]);
    investors = inv.data ?? [];
    payouts = pay.data ?? [];
  }

  return (
    <div>
      <div className="mb-4.5 flex items-center gap-3">
        <Link
          href="/inventori"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1 truncate text-base font-bold">{unit.nama}</div>
        {canManage && <UnitActions unit={unit} />}
      </div>

      {unit.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element -- plain <img>, matches the
        // rest of this app (no next/image usage anywhere else either).
        <img
          src={unit.photo_url}
          alt={unit.nama}
          className="mb-4 h-48 w-full rounded-2xl object-cover sm:h-56"
        />
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
        <UnitInvestors unitId={unit.id} investors={investors} payouts={payouts} sold={unit.status === "sold"} />
      )}

      <ExpenseList unitId={unit.id} expenses={expenses ?? []} />
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
