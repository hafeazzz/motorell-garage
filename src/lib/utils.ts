export function rupiah(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** '2026-09-17' -> '17 September 2026' */
export function formatDateStr(iso: string | null | undefined): string {
  if (!iso) return "Not set";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Date -> 'Thursday, 17 September' */
export function formatFullDate(date: Date): string {
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** Date -> 'September 2026' */
export function formatMonthYear(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Date -> '2026-09' */
export function periodKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** 'YYYY-MM' -> 'September 2026' */
export function formatPeriodLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Period = "pagi" | "siang" | "sore" | "malam";

export function getGreetingPeriod(hour: number): { key: Period; label: string } {
  if (hour >= 4 && hour < 11) return { key: "pagi", label: "Good morning" };
  if (hour >= 11 && hour < 15) return { key: "siang", label: "Good afternoon" };
  if (hour >= 15 && hour < 18) return { key: "sore", label: "Good evening" };
  return { key: "malam", label: "Good night" };
}
