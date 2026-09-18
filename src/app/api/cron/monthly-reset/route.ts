import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { periodKey } from "@/lib/utils";
import type { Unit, UnitExpense } from "@/types/database";

// Vercel Cron hits this at 00:00 on the 1st of every month (see
// vercel.json). It moves last month's sold units out of the live
// `units` table and into `sold_archive`, so Finance/Report only ever
// deal with the current month's live data while Report's "browse past
// months" view reads from the archive.
//
// This is exactly the piece the client-side prototype could only
// simulate — it needed a real server to run on a schedule.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // "Last month" relative to when this runs (the 1st) — i.e. the month
  // that just finished.
  const now = new Date();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const period = periodKey(lastMonthDate);

  const { data: soldUnits, error: fetchError } = await supabase
    .from("units")
    .select("*")
    .eq("status", "sold")
    .like("tanggal_jual", `${period}%`)
    .returns<Unit[]>();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!soldUnits || soldUnits.length === 0) {
    return NextResponse.json({ message: "Nothing to archive", period, archived: 0 });
  }

  const { data: expenses } = await supabase
    .from("unit_expenses")
    .select("*")
    .in("unit_id", soldUnits.map((u) => u.id))
    .returns<UnitExpense[]>();

  const archiveRows = soldUnits.map((unit) => {
    const unitExpenses = (expenses ?? []).filter((e) => e.unit_id === unit.id);
    const totalExpenses = unitExpenses.reduce((sum, e) => sum + e.nominal, 0);
    return {
      period,
      nama: unit.nama,
      tahun: unit.tahun,
      plat: unit.plat,
      modal_beli: unit.modal_beli,
      harga_jual: unit.harga_jual,
      total_expenses: totalExpenses,
      tanggal_jual: unit.tanggal_jual,
    };
  });

  const { error: insertError } = await supabase.from("sold_archive").insert(archiveRows);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // unit_expenses rows cascade-delete along with their unit (see the
  // `on delete cascade` foreign key in supabase/schema.sql).
  const { error: deleteError } = await supabase
    .from("units")
    .delete()
    .in("id", soldUnits.map((u) => u.id));
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Archived", period, archived: soldUnits.length });
}
