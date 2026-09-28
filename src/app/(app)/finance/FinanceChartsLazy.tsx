"use client";

import dynamic from "next/dynamic";
import { SkeletonBlock } from "@/components/Skeleton";

// ssr:false is only allowed in a Client Component, which is why this thin
// wrapper exists instead of calling dynamic() straight from the page.
export const FinanceChartsLazy = dynamic(() => import("./FinanceCharts"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
      <SkeletonBlock height={296} style={{ borderRadius: 16 }} />
      <SkeletonBlock height={296} style={{ borderRadius: 16 }} />
    </div>
  ),
});
