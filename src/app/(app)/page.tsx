import { createClient } from "@/lib/supabase/server";
import { GreetingCard } from "@/components/GreetingCard";
import { ProfitCard } from "@/components/ProfitCard";
import { TaskList } from "@/components/TaskList";
import { unitProfit } from "@/types/database";
import type { Profile, Unit, UnitExpense, Task } from "@/types/database";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const { data: units } = await supabase.from("units").select("*").returns<Unit[]>();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at")
    .returns<Task[]>();

  const readyCount = (units ?? []).filter((u) => u.status === "ready").length;
  const soldCount = (units ?? []).filter((u) => u.status === "sold").length;

  const isAdmin = profile?.role === "admin";
  let netProfit = 0;
  let monthlyTarget = 25_000_000;

  if (isAdmin) {
    const soldUnits = (units ?? []).filter((u) => u.status === "sold");
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

    const { data: targetSetting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "monthly_target")
      .single();
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
