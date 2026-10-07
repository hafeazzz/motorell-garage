"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/utils";
import type { Attendance, Inspection, Profile, Task, Unit, UnitExpense } from "@/types/database";

// Motorell Ops-style data layer: everything the app shows is loaded ONCE
// into memory when the app opens, kept fresh by Supabase Realtime (plus a
// refetch whenever the app comes back to the foreground), and every page
// renders straight from it. Switching tabs never waits on a server.
//
// Writes still go through the server actions (they hold the permission
// checks), but the screen updates first (optimistic) and rolls back with a
// toast if the server says no — same as Ops' unitOps/taskOps.

export type InspectionRow = Inspection & { item_count: number };

export interface GarageData {
  profile: Profile;
  profiles: Profile[];
  units: Unit[];
  expenses: UnitExpense[];
  tasks: Task[];
  attendanceToday: Attendance[];
  inspections: InspectionRow[];
  monthlyTarget: number;
}

export type Table = "profiles" | "units" | "expenses" | "tasks" | "attendance" | "inspections" | "settings";
const ALL_TABLES: Table[] = ["profiles", "units", "expenses", "tasks", "attendance", "inspections", "settings"];

type Supabase = ReturnType<typeof createClient>;

// One query per slice. Each returns a partial patch so a single slice can be
// refreshed on its own (after a write, or when Realtime reports a change).
async function fetchSlice(sb: Supabase, table: Table, userId: string): Promise<Partial<GarageData>> {
  switch (table) {
    case "profiles": {
      const { data, error } = await sb.from("profiles").select("*").order("name").limit(500).returns<Profile[]>();
      if (error) throw error;
      const me = data?.find((p) => p.id === userId);
      return me ? { profiles: data ?? [], profile: me } : { profiles: data ?? [] };
    }
    case "units": {
      const { data, error } = await sb.from("units").select("*").order("tgl_masuk", { ascending: false }).limit(2000).returns<Unit[]>();
      if (error) throw error;
      return { units: data ?? [] };
    }
    case "expenses": {
      const { data, error } = await sb.from("unit_expenses").select("*").order("tanggal", { ascending: false }).limit(5000).returns<UnitExpense[]>();
      if (error) throw error;
      return { expenses: data ?? [] };
    }
    case "tasks": {
      const { data, error } = await sb.from("tasks").select("*").order("created_at").limit(500).returns<Task[]>();
      if (error) throw error;
      return { tasks: data ?? [] };
    }
    case "attendance": {
      const { data, error } = await sb.from("attendance").select("*").eq("date", todayIso()).limit(500).returns<Attendance[]>();
      if (error) throw error;
      return { attendanceToday: data ?? [] };
    }
    case "inspections": {
      const { data, error } = await sb
        .from("inspections")
        .select("*, inspection_items(count)")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(500)
        .returns<(Inspection & { inspection_items: { count: number }[] })[]>();
      if (error) throw error;
      return {
        inspections: (data ?? []).map(({ inspection_items, ...r }) => ({ ...r, item_count: inspection_items?.[0]?.count ?? 0 })),
      };
    }
    case "settings": {
      // Owner/admin-readable only in some setups — a failure just keeps the default.
      const { data } = await sb.from("settings").select("value").eq("key", "monthly_target").maybeSingle();
      return data ? { monthlyTarget: Number(data.value) || 25_000_000 } : {};
    }
  }
}

// Realtime table name -> slice it invalidates.
const REALTIME: Record<string, Table> = {
  profiles: "profiles",
  units: "units",
  unit_expenses: "expenses",
  tasks: "tasks",
  attendance: "attendance",
  inspections: "inspections",
  inspection_items: "inspections",
  settings: "settings",
};

interface Store {
  data: GarageData;
  /** Re-read the given slices from Supabase (in the background). */
  reload: (tables?: Table[]) => Promise<void>;
  /** Apply a local change immediately (optimistic). */
  patch: (fn: (d: GarageData) => GarageData) => void;
  /**
   * Optimistic write: `optimistic` updates the screen now, `action` runs the
   * server action; on failure the change is rolled back and a toast shows the
   * reason. `reload` slices are re-read afterwards either way.
   */
  run: <T>(opts: {
    optimistic?: (d: GarageData) => GarageData;
    action: () => Promise<T>;
    reload?: Table[];
    success?: string;
    error?: string;
  }) => Promise<T | undefined>;
}

const StoreContext = createContext<Store | null>(null);

export function useGarage(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useGarage() must be used inside the app shell");
  return s;
}

/** Loads everything, then renders children; `fallback` shows while the first load runs. */
export function GarageStoreProvider({
  userId,
  fallback,
  onNoProfile,
  children,
}: {
  userId: string;
  fallback: React.ReactNode;
  onNoProfile: () => void;
  children: React.ReactNode;
}) {
  const sb = useMemo(() => createClient(), []);
  const [data, setData] = useState<GarageData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const dataRef = useRef<GarageData | null>(null);
  dataRef.current = data;
  const lastFull = useRef(0);

  const reload = useCallback(
    async (tables: Table[] = ALL_TABLES) => {
      const results = await Promise.allSettled(tables.map((t) => fetchSlice(sb, t, userId)));
      const merged: Partial<GarageData> = {};
      for (const r of results) {
        if (r.status === "fulfilled") Object.assign(merged, r.value);
        else console.error("store: refresh failed", r.reason);
      }
      setData((prev) => (prev ? { ...prev, ...merged } : prev));
      return;
    },
    [sb, userId]
  );

  // First load: every slice in parallel — one round of requests, like Ops.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled(ALL_TABLES.map((t) => fetchSlice(sb, t, userId)));
      if (cancelled) return;
      const merged: Partial<GarageData> = {};
      for (const r of results) {
        if (r.status === "fulfilled") Object.assign(merged, r.value);
        else console.error("store: initial load failed", r.reason);
      }
      // Network/server trouble on the profiles read: offer a retry. Only a
      // successful read WITHOUT this user in it means there is no profile.
      const profilesResult = results[ALL_TABLES.indexOf("profiles")];
      if (profilesResult.status === "rejected") return setFailed(true);
      if (!merged.profile) return onNoProfile();
      lastFull.current = Date.now();
      setData({
        profiles: [],
        units: [],
        expenses: [],
        tasks: [],
        attendanceToday: [],
        inspections: [],
        monthlyTarget: 25_000_000,
        ...merged,
      } as GarageData);
    })();
    return () => {
      cancelled = true;
    };
  }, [sb, userId, onNoProfile, attempt]);

  // Realtime: any change by anyone re-reads that slice (debounced, so a
  // burst of checklist taps is one query). Tables that aren't in the
  // supabase_realtime publication simply never fire — the foreground
  // refresh below still catches them.
  useEffect(() => {
    if (!data) return;
    const pending = new Set<Table>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = (t: Table) => {
      pending.add(t);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const tables = [...pending];
        pending.clear();
        void reload(tables);
      }, 400);
    };
    const channel = sb.channel("garage-store");
    for (const table of Object.keys(REALTIME)) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => schedule(REALTIME[table]));
    }
    channel.subscribe();

    // Back in the foreground (phone unlocked, tab switched back): catch up.
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFull.current > 15_000) {
        lastFull.current = Date.now();
        void reload();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      void sb.removeChannel(channel);
    };
    // Subscribe once, after the first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!data, sb, reload]);

  const patch = useCallback((fn: (d: GarageData) => GarageData) => {
    setData((prev) => (prev ? fn(prev) : prev));
  }, []);

  const run = useCallback<Store["run"]>(
    async ({ optimistic, action, reload: tables, success, error }) => {
      const before = dataRef.current;
      if (optimistic) patch(optimistic);
      try {
        const result = await action();
        if (success) toast.success(success);
        return result;
      } catch (err) {
        // Roll back to exactly what was on screen before this change.
        if (optimistic && before) setData(before);
        toast.error(err instanceof Error && err.message ? err.message : (error ?? "Gagal menyimpan."));
        return undefined;
      } finally {
        if (tables?.length) void reload(tables);
      }
    },
    [patch, reload]
  );

  if (failed) {
    return (
      <div className="app-shell fixed inset-0 flex flex-col items-center justify-center gap-3 bg-card px-6 text-center">
        <p className="text-sm text-muted-foreground">Gagal memuat data — cek koneksi internet.</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
        >
          Coba lagi
        </button>
      </div>
    );
  }
  if (!data) return <>{fallback}</>;
  return <StoreContext.Provider value={{ data, reload, patch, run }}>{children}</StoreContext.Provider>;
}
