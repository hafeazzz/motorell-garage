import { SkeletonPageHeader, SkeletonBlock } from "@/components/Skeleton";

export default function FinanceLoading() {
  return (
    <div>
      <SkeletonPageHeader />
      <div className="mb-3.5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SkeletonBlock height={96} style={{ borderRadius: 20 }} />
        <SkeletonBlock height={96} style={{ borderRadius: 20 }} />
        <SkeletonBlock height={96} style={{ borderRadius: 20 }} />
        <SkeletonBlock height={96} style={{ borderRadius: 20 }} />
      </div>
      <SkeletonBlock height={200} style={{ borderRadius: 16, marginBottom: 14 }} />
      <SkeletonBlock height={296} style={{ borderRadius: 16 }} />
    </div>
  );
}
