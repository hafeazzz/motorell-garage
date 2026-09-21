import { SkeletonPageHeader, SkeletonBlock, SkeletonRows } from "@/components/Skeleton";

export default function TeamLoading() {
  return (
    <div>
      <SkeletonPageHeader />
      <SkeletonBlock height={140} style={{ borderRadius: 16, marginBottom: 14 }} />
      <SkeletonRows count={4} />
    </div>
  );
}
