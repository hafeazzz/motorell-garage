import { redirect } from "next/navigation";

// Finance and Report are one menu now (/laporan). This keeps old bookmarks
// and links to /finance working.
export default function FinancePage() {
  redirect("/laporan");
}
