// Hand-written types matching supabase/schema.sql.
// Once the project is live, swap these for generated types:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts

export type Role = "admin" | "staff";
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

export function unitTotalModal(unit: Unit, expenses: UnitExpense[]): number {
  return unit.modal_beli + expenses.reduce((sum, e) => sum + e.nominal, 0);
}

export function unitProfit(unit: Unit, expenses: UnitExpense[]): number {
  return (unit.harga_jual ?? 0) - unitTotalModal(unit, expenses);
}
