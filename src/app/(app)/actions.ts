"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TaskStatus } from "@/types/database";

export async function toggleTaskStatus(taskId: number, currentStatus: TaskStatus) {
  const supabase = await createClient();
  const newStatus: TaskStatus = currentStatus === "done" ? "pending" : "done";

  // Goes through the toggle_task_status() RPC (see supabase/schema.sql) so
  // any signed-in account can tick a box without gaining rights to edit
  // the task's name or assignee — those still require the admin RLS policy.
  const { error } = await supabase.rpc("toggle_task_status", {
    task_id: taskId,
    new_status: newStatus,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function addTask(name: string, assignee: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    name: name.trim(),
    assignee: assignee.trim() || null,
    status: "pending",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function deleteTask(taskId: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function setMonthlyTarget(amount: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({ value: amount })
    .eq("key", "monthly_target");
  if (error) throw new Error(error.message);

  revalidatePath("/");
}
