"use client";

import { GreetingCard } from "@/components/GreetingCard";
import { ProfitCard } from "@/components/ProfitCard";
import { TaskList } from "@/components/TaskList";
import { useGarage } from "@/lib/store";
import { isAdminOrAbove, unitProfit } from "@/types/database";
import { jakartaPeriodKey } from "@/lib/utils";

export default function HomePage() {
  const { data } = useGarage();
  const { profile, units, expenses, tasks, monthlyTarget } = data;

  const readyCount = units.filter((u) => u.status === "ready").length;
  // "This month" = sold in the current WIB calendar month. The live units
  // table also holds units sold in earlier months until the monthly cron
  // archives them, so counting every status="sold" row overstated both the
  // sold count and the profit below.
  const thisMonth = jakartaPeriodKey(new Date());
  const soldThisMonth = units.filter((u) => u.status === "sold" && u.tanggal_jual?.startsWith(thisMonth));

  const isAdmin = isAdminOrAbove(profile);
  const netProfit = soldThisMonth.reduce(
    (sum, unit) => sum + unitProfit(unit, expenses.filter((e) => e.unit_id === unit.id)),
    0
  );

  return (
    <div>
      <GreetingCard name={profile.name} />

      <div className="mb-3.5 grid grid-cols-2 gap-3 sm:mb-4 sm:gap-4 lg:gap-5">
        <StatCard value={readyCount} label="Units ready" />
        <StatCard value={soldThisMonth.length} label="Sold this month" />
      </div>

      {isAdmin && (
        <>
          <ProfitCard netProfit={netProfit} monthlyTarget={monthlyTarget} />
          <div className="h-3.5" />
        </>
      )}

      <TaskList tasks={tasks} />
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
