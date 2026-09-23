export { cn } from "cn";

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
  if (hour >= 5 && hour < 11) return { key: "pagi", label: "Good morning" };
  if (hour >= 11 && hour < 15) return { key: "siang", label: "Good afternoon" };
  if (hour >= 15 && hour < 19) return { key: "sore", label: "Good evening" };
  return { key: "malam", label: "Good night" };
}

// WIB (Western Indonesia Time, UTC+7, no DST) — hardcoded rather than read
// from the process's own timezone, because that's the wrong source of truth
// here: Vercel runs Node server processes in UTC regardless of where the
// garage's staff actually are, so `new Date().getHours()` on the server
// returns the UTC hour, not Indonesia's. This is what caused "Good Night"
// to show at 9am WIB (2am UTC falls in the night bucket).
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function jakartaParts(date: Date) {
  const shifted = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  // Reading UTC fields off the shifted timestamp — rather than local fields
  // off the original — makes this correct regardless of the host process's
  // own timezone (UTC on Vercel, possibly something else in local dev).
  return {
    hour: shifted.getUTCHours(),
    dayOfWeek: shifted.getUTCDay(),
    date: shifted.getUTCDate(),
    month: shifted.getUTCMonth(),
  };
}

/** Indonesia (WIB) hour-of-day for `date`, independent of server timezone. */
export function jakartaHour(date: Date): number {
  return jakartaParts(date).hour;
}

/** Like formatFullDate, but reads Indonesia (WIB) wall-clock fields instead
 * of whatever timezone the server process happens to run in. */
export function formatFullDateJakarta(date: Date): string {
  const p = jakartaParts(date);
  return `${DAYS[p.dayOfWeek]}, ${p.date} ${MONTHS[p.month]}`;
}
