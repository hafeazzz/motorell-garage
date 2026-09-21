import { SkeletonPageHeader, SkeletonSummaryCard, SkeletonRows } from "@/components/Skeleton";

export default function LaporanLoading() {
  return (
    <div>
      <SkeletonPageHeader />
      <SkeletonSummaryCard height={140} />
      <SkeletonRows count={3} />
    </div>
  );
}
