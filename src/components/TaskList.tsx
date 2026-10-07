"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import { useGarage } from "@/lib/store";
import { toggleTaskStatus, addTask, deleteTask } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isAdminOrAbove } from "@/types/database";
import type { Task } from "@/types/database";

export function TaskList({ tasks }: { tasks: Task[] }) {
  const profile = useProfile();
  const isAdmin = isAdminOrAbove(profile);
  const { run } = useGarage();
  const [editing, setEditing] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newAssignee, setNewAssignee] = useState("");

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border bg-card px-4.5 py-5">
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-bold">Today Task</div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-muted-foreground">
            {doneCount} of {tasks.length} done
          </span>
          {isAdmin && (
            <Button size="sm" variant="secondary" className="h-auto rounded-full px-3 py-1 text-[11.5px]" onClick={() => setEditing((v) => !v)}>
              {editing ? "Done" : "Edit"}
            </Button>
          )}
        </div>
      </div>

      <div className="my-3.5 h-[5px] w-full overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[var(--ease-out-expo)]"
          style={{ width: `${pct}%` }}
        />
      </div>

      {tasks.map((task) => {
        if (confirmingId === task.id) {
          return (
            <div key={task.id} className="mb-2.5 flex items-center justify-between gap-2.5 rounded-[14px] bg-secondary px-3.5 py-3">
              <span className="text-[13px]">Delete &ldquo;{task.name}&rdquo;?</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="h-auto rounded-full px-3 py-1 text-[11.5px]" onClick={() => setConfirmingId(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-auto rounded-full px-3 py-1 text-[11.5px]"
                  onClick={() => {
                    setConfirmingId(null);
                    void run({
                      optimistic: (d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== task.id) }),
                      action: () => deleteTask(task.id),
                      reload: ["tasks"],
                      error: "Gagal menghapus task.",
                    });
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div key={task.id} className="mb-2.5 flex items-center gap-2.5 rounded-[14px] bg-secondary px-3.5 py-3">
            {/* 44px tap area around the 22px circle — easy to hit on a phone. */}
            <button
              onClick={() =>
                void run({
                  optimistic: (d) => ({
                    ...d,
                    tasks: d.tasks.map((t) =>
                      t.id === task.id ? { ...t, status: t.status === "done" ? "pending" : "done" } : t
                    ),
                  }),
                  action: () => toggleTaskStatus(task.id, task.status),
                  reload: ["tasks"],
                })
              }
              className="-m-2.5 grid size-11 shrink-0 place-items-center"
              aria-label="Toggle done"
            >
              <span
                className={cn(
                  "size-[22px] rounded-full border-2 transition-colors",
                  task.status === "done" ? "border-primary bg-primary" : "border-white/20 bg-transparent"
                )}
              />
            </button>
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "text-sm font-semibold",
                  task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"
                )}
              >
                {task.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {task.assignee ? `Assigned to ${task.assignee}` : "Unassigned"}
              </div>
            </div>
            {editing && (
              <Button
                variant="ghost"
                size="icon"
                className="size-10 rounded-xl bg-card text-destructive"
                onClick={() => setConfirmingId(task.id)}
                aria-label="Delete task"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        );
      })}

      {editing && (
        <div className="mt-3 flex flex-col gap-2 rounded-[14px] bg-secondary p-3">
          <Input
            placeholder="Task name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-9 bg-card text-[13px]"
          />
          <Input
            placeholder="Assigned to (optional)"
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            className="h-9 bg-card text-[13px]"
          />
          <Button
            size="sm"
            className="self-end rounded-full px-3.5"
            onClick={() => {
              if (!newName.trim()) return;
              const name = newName.trim();
              const assignee = newAssignee.trim() || null;
              setNewName("");
              setNewAssignee("");
              void run({
                // Temporary negative id until the reload brings the real row.
                optimistic: (d) => ({
                  ...d,
                  tasks: [...d.tasks, { id: -Date.now(), name, assignee, status: "pending", created_at: new Date().toISOString() }],
                }),
                action: () => addTask(name, assignee ?? ""),
                reload: ["tasks"],
                error: "Gagal menambah task.",
              });
            }}
          >
            Add task
          </Button>
        </div>
      )}
    </div>
  );
}
