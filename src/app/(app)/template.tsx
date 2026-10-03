// Remounts on every navigation (unlike layout.tsx), so each screen eases in
// like a native app page instead of hard-swapping.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out">{children}</div>;
}
