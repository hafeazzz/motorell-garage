import { createClient } from "@/lib/supabase/server";
import { formatFullDate, todayIso } from "@/lib/utils";
import { CheckInCard } from "./CheckInCard";
import type { Attendance, AttendanceStatus, Profile } from "@/types/database";

type AbsenProfile = Pick<Profile, "name" | "is_owner" | "tracks_attendance" | "role" | "position">;
type RosterProfile = Pick<Profile, "id" | "name" | "position">;
type RosterAttendance = Pick<Attendance, "user_id" | "status">;

export default async function AbsenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = todayIso();

  // Neither query below depends on the other's result (both only need the
  // already-resolved user id), so they run concurrently instead of as two
  // sequential round trips.
  const [{ data: profile }, { data: myAttendance }] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, is_owner, tracks_attendance, role, position")
      .eq("id", user!.id)
      .single<AbsenProfile>(),
    supabase
      .from("attendance")
      .select("status")
      .eq("user_id", user!.id)
      .eq("date", today)
      .maybeSingle<{ status: AttendanceStatus }>(),
  ]);

  const skipCheckIn = profile?.is_owner || profile?.tracks_attendance === false;

  let roster: RosterProfile[] = [];
  let attendanceToday: RosterAttendance[] = [];
  if (profile?.role === "admin") {
    // These two are also independent of each other — fetched in parallel.
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
    roster = allProfiles ?? [];
    attendanceToday = allAttendance ?? [];
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Attendance</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{formatFullDate(new Date())}</div>
      </div>

      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 24,
          padding: "26px 20px",
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            margin: "0 auto 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 20,
            color: "#fff",
            background: "linear-gradient(135deg,#4A2A63,#E4715A)",
          }}
        >
          {profile?.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{profile?.name}</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20 }}>
          {profile?.is_owner ? "Owner" : profile?.position}
        </div>

        {skipCheckIn ? (
          profile?.is_owner ? null : (
            <p style={{ fontSize: 14, fontWeight: 600 }}>Attendance isn&apos;t tracked for this account.</p>
          )
        ) : (
          <CheckInCard existingStatus={myAttendance?.status ?? null} />
        )}
      </div>

      {profile?.role === "admin" && (
        <div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 12 }}>
            Only admins can see this summary.
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Today&apos;s Team Attendance</div>
          {roster.map((person) => {
            const record = attendanceToday.find((a) => a.user_id === person.id);
            const status = record?.status;
            return (
              <div
                key={person.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 16,
                  padding: "12px 14px",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 13,
                    color: "#fff",
                    background: "linear-gradient(135deg,#1C6FE0,#33D399)",
                    flex: "none",
                  }}
                >
                  {person.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{person.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{person.position}</div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 20,
                    background:
                      status === "masuk"
                        ? "var(--cream-green-bg)"
                        : status === "tidak"
                          ? "var(--cream-orange-bg)"
                          : "rgba(255,255,255,0.06)",
                    color:
                      status === "masuk"
                        ? "var(--cream-green-fg)"
                        : status === "tidak"
                          ? "var(--cream-orange-fg)"
                          : "var(--text-tertiary)",
                  }}
                >
                  {status === "masuk" ? "Present" : status === "tidak" ? "Absent" : "Not yet"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
