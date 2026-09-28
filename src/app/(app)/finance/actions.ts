"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth-utils";

// Owner only, per the request ("Owner can mark payout as Paid"). The DB
// policy is owner-or-admin (an admin marking a unit sold has to be able to
// create payouts), so the narrower rule lives here — loosen it by swapping
// requireOwner() for requireAdmin() if admins should be able to pay out too.
export async function markPayoutPaid(payoutId: number, notes?: string) {
  await requireOwner();
  const supabase = await createClient();

  const { error } = await supabase
    .from("investor_payouts")
    .update({ status: "paid", payment_date: new Date().toISOString(), notes: notes?.trim() || null })
    .eq("id", payoutId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);

  revalidatePath("/finance");
  revalidatePath("/finance/investor-payouts");
}
