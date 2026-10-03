import { createClient } from "@/lib/supabase/server";
import { formatFullDate, todayIso } from "@/lib/utils";
import { CheckInCard } from "./CheckInCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getMyProfile, getSessionUserId } from "@/lib/session";
import { isAdminOrAbove, isOwner } from "@/types/database";
import type { Attendance, AttendanceStatus, Profile } from "@/types/database";

type AbsenProfile = Pick<Profile, "name" | "is_owner" | "tracks_attendance" | "role" | "position">;
type RosterProfile = Pick<Profile, "id" | "name" | "position">;
type RosterAttendance = Pick<Attendance, "user_id" | "status">;

const STATUS_BADGE: Record<"masuk" | "tidak" | "pending", string> = {
  masuk: "bg-[image:var(--cream-green-bg)] text-[var(--cream-green-fg)]",
  tidak: "bg-[image:var(--cream-orange-bg)] text-[var(--cream-orange-fg)]",
  pending: "bg-white/[0.06] text-muted-foreground",
};

export default async function AbsenPage() {
  const supabase = await createClient();
  const today = todayIso();

  // Profile is the layout's per-request cached copy (no extra query).
  const profile: AbsenProfile | null = await getMyProfile();
  const userId = (await getSessionUserId())!;
  const canSeeTeam = !!profile && isAdminOrAbove(profile);

  const skipCheckIn = (profile && isOwner(profile)) || profile?.tracks_attendance === false;

  let roster: RosterProfile[] = [];
  let attendanceToday: RosterAttendance[] = [];
  // My own status and (for owner/admin) the team roster are independent —
  // one parallel round trip.
  const [{ data: myAttendance }, team] = await Promise.all([
    supabase
      .from("attendance")
      .select("status")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle<{ status: AttendanceStatus }>(),
    canSeeTeam ? loadTeam() : null,
  ]);
  if (team) {
    roster = team.roster;
    attendanceToday = team.attendanceToday;
  }

  async function loadTeam() {
    const [{ data: allProfiles }, { data: allAttendance }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, position")
        .eq("tracks_attendance", true)
        .limit(200)
        .returns<RosterProfile[]>(),
      supabase
        .from("attendance")
        .select("user_id, status")
        .eq("date", today)
        .limit(200)
        .returns<RosterAttendance[]>(),
    ]);
    return { roster: allProfiles ?? [], attendanceToday: allAttendance ?? [] };
  }

  return (
    <div>
      <div className="mb-4 sm:mb-5 md:mb-6">
        <h1 className="mb-1 text-xl font-extrabold sm:text-[22px] md:text-2xl">Attendance</h1>
        <p className="text-sm text-muted-foreground">{formatFullDate(new Date())}</p>
      </div>

      <div className="mb-5 rounded-3xl border border-border bg-card px-5 py-6 text-center sm:px-6 sm:py-7 md:mb-6">
        <Avatar className="mx-auto mb-3.5 size-14">
          <AvatarFallback className="bg-[linear-gradient(135deg,#4A2A63,#E4715A)] text-xl font-extrabold text-white">
            {profile?.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-base font-bold">{profile?.name}</div>
        <div className="mb-5 text-xs text-muted-foreground">
          {profile && isOwner(profile) ? "Owner" : profile?.position}
        </div>

        {skipCheckIn ? (
          profile && isOwner(profile) ? null : (
            <p className="text-sm font-semibold">Attendance isn&apos;t tracked for this account.</p>
          )
        ) : (
          <CheckInCard existingStatus={myAttendance?.status ?? null} />
        )}
      </div>

      {canSeeTeam && (
        <div>
          <div className="mb-3 text-xs text-muted-foreground">Hanya owner dan admin yang bisa melihat rekap ini.</div>
          <div className="mb-3 text-sm font-bold">Today&apos;s Team Attendance</div>
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            {roster.map((person) => {
              const record = attendanceToday.find((a) => a.user_id === person.id);
              const status = record?.status ?? "pending";
              return (
                <div
                  key={person.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-3"
                >
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-[linear-gradient(135deg,#1C6FE0,#33D399)] text-[13px] font-bold text-white">
                      {person.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold">{person.name}</div>
                    <div className="text-[11px] text-muted-foreground">{person.position}</div>
                  </div>
                  <Badge className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", STATUS_BADGE[status])}>
                    {status === "masuk" ? "Present" : status === "tidak" ? "Absent" : "Not yet"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
