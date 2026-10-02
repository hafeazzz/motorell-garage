"use client";

import dynamic from "next/dynamic";
import { SkeletonBlock } from "@/components/Skeleton";

// ssr:false is only allowed in a Client Component, which is why this thin
// wrapper exists instead of calling dynamic() straight from the page.
export const CashflowChartLazy = dynamic(() => import("./CashflowChart"), {
  ssr: false,
  loading: () => <SkeletonBlock height={224} style={{ borderRadius: 12 }} />,
});
