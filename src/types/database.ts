// Hand-written types matching supabase/schema.sql.
// Once the project is live, swap these for generated types:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts

export type Role = "owner" | "admin" | "manager" | "staff";

// Lower index = more privileged. Used by the helpers below instead of a
// chain of ===/|| checks, so adding a role later only means editing this list.
const ROLE_RANK: Record<Role, number> = { owner: 0, admin: 1, manager: 2, staff: 3 };

export function isOwner(profile: Pick<Profile, "role" | "is_owner">): boolean {
  return profile.role === "owner" || profile.is_owner;
}

export function isAdmin(profile: Pick<Profile, "role">): boolean {
  return profile.role === "admin";
}

/** Owner or admin — full operational access short of literal ownership. */
export function isAdminOrAbove(profile: Pick<Profile, "role" | "is_owner">): boolean {
  return isOwner(profile) || ROLE_RANK[profile.role] <= ROLE_RANK.admin;
}

/** Owner, admin, or manager — the roles allowed into /keuangan and /laporan. */
export function canAccessFinancials(profile: Pick<Profile, "role" | "is_owner">): boolean {
  return isOwner(profile) || ROLE_RANK[profile.role] <= ROLE_RANK.manager;
}

/** Owner or admin — the roles allowed to add/edit/remove team accounts. */
export function canManageUsers(profile: Pick<Profile, "role" | "is_owner">): boolean {
  return isAdminOrAbove(profile);
}
export type UnitStatus = "progress" | "ready" | "booked" | "sold";
export type AttendanceStatus = "masuk" | "tidak";
export type TaskStatus = "pending" | "progress" | "done";

export interface Profile {
  id: string;
  name: string;
  role: Role;
  is_owner: boolean;
  position: string;
  tracks_attendance: boolean;
  profile_photo_url: string | null;
  created_at: string;
}

export interface Unit {
  id: number;
  nama: string;
  tahun: number;
  odometer: string | null;
  plat: string;
  status: UnitStatus;
  modal_beli: number;
  tgl_masuk: string; // date, 'YYYY-MM-DD'
  photo_url: string | null;
  harga_jual: number | null;
  finance_code: string | null;
  booking_nominal: number | null;
  tanggal_jual: string | null; // date, 'YYYY-MM-DD'
  created_at: string;
  updated_at: string;
}

export interface UnitExpense {
  id: number;
  unit_id: number;
  keterangan: string;
  nominal: number;
  tanggal: string; // date
  created_at: string;
}

export interface Attendance {
  id: number;
  user_id: string;
  date: string; // date
  status: AttendanceStatus;
  created_at: string;
}

export interface Task {
  id: number;
  name: string;
  assignee: string | null;
  status: TaskStatus;
  created_at: string;
}

export interface SoldArchiveRow {
  id: number;
  period: string; // 'YYYY-MM'
  nama: string;
  tahun: number | null;
  plat: string | null;
  modal_beli: number | null;
  harga_jual: number | null;
  total_expenses: number | null;
  tanggal_jual: string | null;
  archived_at: string;
}

// Convenience shape used once a unit's expenses are joined in.
export interface UnitWithExpenses extends Unit {
  unit_expenses: UnitExpense[];
}

// What the Team page's roster query selects and TeamRoster renders — skips
// profile_photo_url/created_at, which that page never touches.
export type TeamProfile = Pick<
  Profile,
  "id" | "name" | "role" | "is_owner" | "position" | "tracks_attendance"
>;

// Narrowed to just the fields actually used, so callers that only selected
// those columns from Supabase (instead of the full row) still satisfy this
// signature — any full Unit/UnitExpense still does too, since it's a superset.
export function unitTotalModal(
  unit: Pick<Unit, "modal_beli">,
  expenses: Pick<UnitExpense, "nominal">[]
): number {
  return unit.modal_beli + expenses.reduce((sum, e) => sum + e.nominal, 0);
}

export function unitProfit(
  unit: Pick<Unit, "modal_beli" | "harga_jual">,
  expenses: Pick<UnitExpense, "nominal">[]
): number {
  return (unit.harga_jual ?? 0) - unitTotalModal(unit, expenses);
}
