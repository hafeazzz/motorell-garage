import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth-utils";
import { investorTotalReturn } from "@/lib/investors";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateStr, rupiah } from "@/lib/utils";
import { isOwner } from "@/types/database";
import { MarkPaidButton } from "./MarkPaidButton";
import type { InvestorPayout } from "@/types/database";

export default async function InvestorPayoutsPage() {
  // proxy.ts gates this path to the owner; this is the server-side backstop.
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/finance");

  const supabase = await createClient();
  const { data } = await supabase
    .from("investor_payouts")
    .select("*")
    .order("status", { ascending: false }) // 'pending' sorts after 'paid' alphabetically, so desc puts pending first
    .order("created_at", { ascending: false })
    .limit(300)
    .returns<InvestorPayout[]>();
  const payouts = data ?? [];

  const pending = payouts.filter((p) => p.status === "pending");
  const pendingTotal = pending.reduce((s, p) => s + p.payout_amount, 0);
  const paidTotal = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.payout_amount, 0);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/finance" className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold">Investor payouts</h1>
          <p className="text-xs text-muted-foreground">Share of net profit per sold unit · nothing owed on a loss</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-[20px] border border-border bg-card p-4">
          <div className="text-xl font-extrabold">{rupiah(pendingTotal)}</div>
          <div className="text-[13px] text-muted-foreground">Pending ({pending.length})</div>
        </div>
        <div className="rounded-[20px] border border-border bg-card p-4">
          <div className="text-xl font-extrabold">{rupiah(paidTotal)}</div>
          <div className="text-[13px] text-muted-foreground">Paid</div>
        </div>
      </div>

      {payouts.length === 0 && (
        <p className="py-5 text-center text-sm text-muted-foreground">
          No payouts yet. They&apos;re created when a unit with an investor is marked Sold.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {payouts.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{p.investor_name} · {Number(p.share_percentage)}%</div>
                <div className="truncate text-xs text-muted-foreground">
                  {p.unit_nama}
                  {p.unit_plat ? ` · ${p.unit_plat}` : ""}
                </div>
              </div>
              <Badge
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                  p.status === "paid"
                    ? "bg-[image:var(--cream-green-bg)] text-[var(--cream-green-fg)]"
                    : "bg-[image:var(--cream-orange-bg)] text-[var(--cream-orange-fg)]"
                )}
              >
                {p.status === "paid" ? "Paid" : "Pending"}
              </Badge>
            </div>

            <div className="space-y-1 text-[12.5px]">
              <Row label="Sale price" value={rupiah(p.sale_price)} />
              <Row label="Total cost (purchase + expenses)" value={rupiah(p.modal_total)} />
              <Row label="Net profit" value={rupiah(p.profit)} />
              <Row label="Profit share" value={rupiah(p.payout_amount)} strong />
              <Row label="Total to return (capital + share)" value={rupiah(investorTotalReturn(p.modal_total, p.payout_amount))} />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {p.status === "paid" && p.payment_date ? `Paid ${formatDateStr(p.payment_date.slice(0, 10))}` : ""}
              </span>
              {p.status === "pending" && <MarkPaidButton payoutId={p.id} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-2", strong && "border-t border-border pt-1 font-bold")}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
