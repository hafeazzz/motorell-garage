import { SkeletonBlock, SkeletonPageHeader, SkeletonRows } from "@/components/Skeleton";

// Fallback for every (app) route without its own loading.tsx (Home,
// Inspeksi, detail pages). Without it, tapping a tab showed nothing at all
// until the server answered — the app felt frozen.
export default function AppLoading() {
  return (
    <div>
      <SkeletonPageHeader />
      <SkeletonBlock height={96} style={{ borderRadius: 20, marginBottom: 14 }} />
      <SkeletonRows count={4} />
    </div>
  );
}
