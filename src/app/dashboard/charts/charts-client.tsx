"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { Timeframe } from "@/lib/market-data";

// lightweight-charts touches `window` — client-only, code-split.
const TradingChart = dynamic(
  () => import("@/components/dashboard/trading-chart").then((m) => m.TradingChart),
  { ssr: false, loading: () => <Skeleton className="h-full min-h-[70vh] rounded-2xl" /> }
);

export function ChartsClient({
  defaultSymbol,
  defaultTimeframe,
}: {
  defaultSymbol: string;
  defaultTimeframe: Timeframe;
}) {
  return (
    <div className="h-[calc(100dvh-7.5rem)]">
      <TradingChart
        initialSymbol={defaultSymbol}
        initialTimeframe={defaultTimeframe}
        className="h-full"
      />
    </div>
  );
}
