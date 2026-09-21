import { SkeletonPageHeader, SkeletonBlock, SkeletonRows } from "@/components/Skeleton";

export default function AbsenLoading() {
  return (
    <div>
      <SkeletonPageHeader />
      <SkeletonBlock height={220} style={{ borderRadius: 24, marginBottom: 20 }} />
      <SkeletonRows count={4} />
    </div>
  );
}
