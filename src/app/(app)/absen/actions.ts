"use server";

import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/utils";
import type { AttendanceStatus } from "@/types/database";

export async function checkIn(status: AttendanceStatus) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("attendance")
    .upsert({ user_id: user.id, date: todayIso(), status }, { onConflict: "user_id,date" });
  if (error) throw new Error(error.message);

}
