import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/session";
import { GreetingCard } from "@/components/GreetingCard";
import { ProfitCard } from "@/components/ProfitCard";
import { TaskList } from "@/components/TaskList";
import { isAdminOrAbove, unitProfit } from "@/types/database";
import { jakartaPeriodKey } from "@/lib/utils";
import type { Unit, UnitExpense, Task } from "@/types/database";

export default async function HomePage() {
  const supabase = await createClient();

  // Profile comes from the layout's per-request cache; units, tasks and the
  // target setting don't depend on each other, so they're one parallel
  // round trip instead of four sequential ones.
  const [profile, { data: units }, { data: tasks }, { data: targetSetting }] = await Promise.all([
    getMyProfile(),
    supabase.from("units").select("*").returns<Unit[]>(),
    supabase.from("tasks").select("*").order("created_at").returns<Task[]>(),
    supabase.from("settings").select("value").eq("key", "monthly_target").maybeSingle(),
  ]);

  const readyCount = (units ?? []).filter((u) => u.status === "ready").length;
  // "This month" = sold in the current WIB calendar month. The live units
  // table also holds units sold in earlier months until the monthly cron
  // archives them, so counting every status="sold" row overstated both the
  // sold count and the profit below.
  const thisMonth = jakartaPeriodKey(new Date());
  const soldThisMonth = (units ?? []).filter(
    (u) => u.status === "sold" && u.tanggal_jual?.startsWith(thisMonth)
  );
  const soldCount = soldThisMonth.length;

  const isAdmin = !!profile && isAdminOrAbove(profile);
  let netProfit = 0;
  let monthlyTarget = 25_000_000;

  if (isAdmin) {
    const soldUnits = soldThisMonth;
    if (soldUnits.length > 0) {
      const { data: expenses } = await supabase
        .from("unit_expenses")
        .select("*")
        .in(
          "unit_id",
          soldUnits.map((u) => u.id)
        )
        .returns<UnitExpense[]>();

      netProfit = soldUnits.reduce((sum, unit) => {
        const unitExpenses = (expenses ?? []).filter((e) => e.unit_id === unit.id);
        return sum + unitProfit(unit, unitExpenses);
      }, 0);
    }

    if (targetSetting) monthlyTarget = Number(targetSetting.value);
  }

  return (
    <div>
      <GreetingCard name={profile?.name ?? "there"} />

      {/* Exactly 2 cards render here — lg:grid-cols-4 used to force 2
          empty grid tracks (visible dead space) on wider screens. */}
      <div className="mb-3.5 grid grid-cols-2 gap-3 sm:gap-4 sm:mb-4 lg:gap-5">
        <StatCard value={readyCount} label="Units ready" />
        <StatCard value={soldCount} label="Sold this month" />
      </div>

      {isAdmin && (
        <>
          <ProfitCard netProfit={netProfit} monthlyTarget={monthlyTarget} />
          <div className="h-3.5" />
        </>
      )}

      <TaskList tasks={tasks ?? []} />
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-[20px] border border-border bg-card p-4.5">
      <div className="mb-1.5 text-[32px] leading-none font-extrabold">{value}</div>
      <div className="text-[13px] text-muted-foreground">{label}</div>
    </div>
  );
}
