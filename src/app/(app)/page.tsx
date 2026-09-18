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
    <div style={{ paddingTop: 0 }}>
      <GreetingCard name={profile?.name ?? "there"} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <StatCard value={readyCount} label="Units ready" />
        <StatCard value={soldCount} label="Sold this month" />
      </div>

      {isAdmin && (
        <>
          <ProfitCard netProfit={netProfit} monthlyTarget={monthlyTarget} />
          <div style={{ height: 14 }} />
        </>
      )}

      <TaskList tasks={tasks ?? []} />
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 20,
        padding: 18,
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</div>
    </div>
  );
}
