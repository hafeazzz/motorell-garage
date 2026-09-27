import { SkeletonPageHeader, SkeletonBlock, SkeletonRows } from "@/components/Skeleton";

export default function InventoriLoading() {
  return (
    <div>
      <SkeletonPageHeader />
      <SkeletonBlock height={44} style={{ borderRadius: 16, marginBottom: 14 }} />
      <SkeletonRows count={5} />
    </div>
  );
}
