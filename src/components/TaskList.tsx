"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import { toggleTaskStatus, addTask, deleteTask } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isAdminOrAbove } from "@/types/database";
import type { Task } from "@/types/database";

export function TaskList({ tasks }: { tasks: Task[] }) {
  const profile = useProfile();
  const isAdmin = isAdminOrAbove(profile);
  const [isPending, startTransition] = useTransition();
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
                  onClick={() =>
                    startTransition(async () => {
                      await deleteTask(task.id);
                      setConfirmingId(null);
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div key={task.id} className="mb-2.5 flex items-center gap-2.5 rounded-[14px] bg-secondary px-3.5 py-3">
            <button
              disabled={isPending}
              onClick={() => startTransition(() => toggleTaskStatus(task.id, task.status))}
              className={cn(
                "size-[22px] shrink-0 rounded-full border-2",
                task.status === "done" ? "border-primary bg-primary" : "border-white/20 bg-transparent"
              )}
              aria-label="Toggle done"
            />
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
                size="icon-xs"
                className="rounded-lg bg-card"
                onClick={() => setConfirmingId(task.id)}
                aria-label="Delete task"
              >
                <Trash2 className="size-3" />
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
            onClick={() =>
              startTransition(async () => {
                if (!newName.trim()) return;
                await addTask(newName, newAssignee);
                setNewName("");
                setNewAssignee("");
              })
            }
          >
            Add task
          </Button>
        </div>
      )}
    </div>
  );
}
