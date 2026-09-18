"use client";

import { useState, useTransition } from "react";
import { useProfile } from "@/lib/profile-context";
import { toggleTaskStatus, addTask, deleteTask } from "@/app/(app)/actions";
import type { Task } from "@/types/database";

export function TaskList({ tasks }: { tasks: Task[] }) {
  const profile = useProfile();
  const isAdmin = profile.role === "admin";
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newAssignee, setNewAssignee] = useState("");

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 20,
        padding: "20px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Today Task</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {doneCount} of {tasks.length} done
          </span>
          {isAdmin && (
            <button
              onClick={() => setEditing((v) => !v)}
              style={miniBtn}
            >
              {editing ? "Done" : "Edit"}
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          width: "100%",
          height: 5,
          borderRadius: 10,
          background: "rgba(255,255,255,0.07)",
          margin: "14px 0 16px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "var(--accent-green)",
            transition: "width .6s var(--ease-out-expo)",
          }}
        />
      </div>

      {tasks.map((task) => {
        if (confirmingId === task.id) {
          return (
            <div key={task.id} style={{ ...taskRow, justifyContent: "space-between" }}>
              <span style={{ fontSize: 13 }}>Delete &ldquo;{task.name}&rdquo;?</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={miniBtn} onClick={() => setConfirmingId(null)}>
                  Cancel
                </button>
                <button
                  style={{ ...miniBtn, background: "#E7B183", color: "#3A2410" }}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteTask(task.id);
                      setConfirmingId(null);
                    })
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          );
        }

        return (
          <div key={task.id} style={taskRow}>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => toggleTaskStatus(task.id, task.status))}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                flex: "none",
                border: `2px solid ${task.status === "done" ? "var(--accent-green)" : "rgba(255,255,255,0.22)"}`,
                background: task.status === "done" ? "var(--accent-green)" : "transparent",
              }}
              aria-label="Toggle done"
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: task.status === "done" ? "line-through" : "none",
                  color: task.status === "done" ? "var(--text-tertiary)" : "var(--text-primary)",
                }}
              >
                {task.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {task.assignee ? `Assigned to ${task.assignee}` : "Unassigned"}
              </div>
            </div>
            {editing && (
              <button style={iconBtn} onClick={() => setConfirmingId(task.id)} aria-label="Delete task">
                🗑
              </button>
            )}
          </div>
        );
      })}

      {editing && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 12,
            background: "var(--card-bg-alt)",
            borderRadius: 14,
            padding: 12,
          }}
        >
          <input
            placeholder="Task name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={fieldInput}
          />
          <input
            placeholder="Assigned to (optional)"
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            style={fieldInput}
          />
          <button
            style={{ ...miniBtn, background: "var(--accent-green)", color: "#04241A", alignSelf: "flex-end" }}
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
          </button>
        </div>
      )}
    </div>
  );
}

const taskRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "var(--card-bg-alt)",
  borderRadius: 14,
  padding: "12px 14px",
  marginBottom: 10,
};

const miniBtn: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  padding: "5px 12px",
  borderRadius: 20,
  background: "var(--card-bg-alt)",
  border: "1px solid var(--border-subtle)",
};

const iconBtn: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 8,
  background: "var(--card-bg)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
  fontSize: 12,
};

const fieldInput: React.CSSProperties = {
  background: "var(--card-bg)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 10,
  padding: "9px 12px",
  color: "var(--text-primary)",
  fontSize: 13,
};
