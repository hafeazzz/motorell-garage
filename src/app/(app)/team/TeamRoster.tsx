"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  updatePosition,
  updateRole,
  updateTracksAttendance,
  renameProfile,
  deleteAccount,
} from "./actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TeamProfile, Role } from "@/types/database";

const POSITIONS = ["Freelancer", "Mechanic", "Field", "Finance", "Admin", "Master"];
const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin access",
  manager: "Manager access",
  staff: "Staff access",
};

export function TeamRoster({ profiles }: { profiles: TeamProfile[] }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
      {profiles.map((p) =>
        p.is_owner ? <OwnerCard key={p.id} profile={p} /> : <MemberCard key={p.id} profile={p} />
      )}
    </div>
  );
}

function InitialsAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar className={className ?? "size-10"}>
      <AvatarFallback className="bg-[linear-gradient(135deg,#4A2A63,#E4715A)] text-sm font-bold text-white">
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

function OwnerCard({ profile }: { profile: TeamProfile }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(profile.name);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-3">
        <InitialsAvatar name={profile.name} />
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13.5px] font-bold">{profile.name}</span>
            <Badge className="rounded-full bg-[image:var(--cream-green-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--cream-green-fg)]">
              Owner
            </Badge>
            <Button
              variant="ghost"
              size="icon-xs"
              className="rounded-lg bg-secondary"
              onClick={() => setRenaming((v) => !v)}
              aria-label="Rename"
            >
              <Pencil className="size-3" />
            </Button>
          </div>
          <div className="text-[11.5px] text-muted-foreground">Owner</div>
        </div>
      </div>
      {renaming && (
        <div className="mt-2.5 flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 flex-1 bg-secondary text-xs"
          />
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                if (name.trim()) await renameProfile(profile.id, name);
                setRenaming(false);
              })
            }
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

function MemberCard({ profile }: { profile: TeamProfile }) {
  const [isPending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(profile.name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-3">
        <InitialsAvatar name={profile.name} />
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13.5px] font-bold">{profile.name}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="rounded-lg bg-secondary"
              onClick={() => setRenaming((v) => !v)}
              aria-label="Rename"
            >
              <Pencil className="size-3" />
            </Button>
          </div>
          <div className="text-[11.5px] text-muted-foreground">
            {profile.position} · {ROLE_LABEL[profile.role]}
          </div>
        </div>
        <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
          <Button
            variant="ghost"
            size="icon-xs"
            className="rounded-lg bg-secondary"
            onClick={() => setConfirmingDelete(true)}
            aria-label="Remove account"
          >
            <Trash2 className="size-3" />
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove {profile.name}&apos;s account?</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={() => startTransition(() => deleteAccount(profile.id))}
              >
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {renaming && (
        <div className="mt-2.5 flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 flex-1 bg-secondary text-xs"
          />
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                if (name.trim()) await renameProfile(profile.id, name);
                setRenaming(false);
              })
            }
          >
            Save
          </Button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Select
          defaultValue={profile.position}
          onValueChange={(v) => v && startTransition(() => updatePosition(profile.id, v))}
        >
          <SelectTrigger size="sm" className="bg-secondary text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POSITIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          defaultValue={profile.role}
          onValueChange={(v) => v && startTransition(() => updateRole(profile.id, v as Role))}
        >
          <SelectTrigger size="sm" className="bg-secondary text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Label className="ml-auto flex items-center gap-1.5 text-[11px] font-normal text-muted-foreground">
          <input
            type="checkbox"
            defaultChecked={profile.tracks_attendance}
            onChange={(e) => startTransition(() => updateTracksAttendance(profile.id, e.target.checked))}
            className="size-3.5 accent-primary"
          />
          Attendance
        </Label>
      </div>
    </div>
  );
}
