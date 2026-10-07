import { AppShell } from "@/components/AppShell";

// Static on purpose: no server data here, so every (app) page is prerendered
// and tab switches are pure client-side navigations. Auth is enforced by
// proxy.ts on every request; data is loaded in the browser by the store
// (src/lib/store.tsx), Motorell Ops style.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
