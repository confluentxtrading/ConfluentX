"use client";

import dynamic from "next/dynamic";
import { Columns2, LayoutGrid, Rows2, Square } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { Timeframe } from "@/lib/market-data";
import { cn } from "@/lib/utils";
import { useCharts, type ChartLayout } from "@/store/charts";

// lightweight-charts touches `window` — client-only, code-split.
const TradingChart = dynamic(
  () => import("@/components/dashboard/trading-chart").then((m) => m.TradingChart),
  { ssr: false, loading: () => <Skeleton className="h-full min-h-[40vh] rounded-2xl" /> }
);

const LAYOUTS: { value: ChartLayout; label: string; icon: React.ComponentType<{ className?: string }>; cells: number }[] = [
  { value: "1", label: "Single", icon: Square, cells: 1 },
  { value: "2h", label: "Two columns", icon: Columns2, cells: 2 },
  { value: "2v", label: "Two rows", icon: Rows2, cells: 2 },
  { value: "4", label: "Grid", icon: LayoutGrid, cells: 4 },
];

const GRID_CLASSES: Record<ChartLayout, string> = {
  "1": "grid-cols-1 grid-rows-1",
  "2h": "grid-cols-2 grid-rows-1",
  "2v": "grid-cols-1 grid-rows-2",
  "4": "grid-cols-2 grid-rows-2",
};

export function ChartsClient({
  defaultSymbol,
  defaultTimeframe,
}: {
  defaultSymbol: string;
  defaultTimeframe: Timeframe;
}) {
  const { layout, cells, setLayout, setCell } = useCharts();
  const cellCount = LAYOUTS.find((l) => l.value === layout)?.cells ?? 1;

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col gap-2">
      <div className="flex items-center justify-end gap-0.5">
        {LAYOUTS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            title={label}
            onClick={() => setLayout(value)}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              layout === value
                ? "bg-brand-violet/15 text-brand-lilac"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>

      <div className={cn("grid min-h-0 flex-1 gap-2", GRID_CLASSES[layout])}>
        {Array.from({ length: cellCount }, (_, i) => {
          const cell = cells[i] ?? {
            symbol: i === 0 ? defaultSymbol : "ES",
            timeframe: defaultTimeframe,
          };
          return (
            <TradingChart
              key={`${layout}-${i}`}
              symbol={cell.symbol}
              timeframe={cell.timeframe}
              onSymbolChange={(symbol) => setCell(i, { symbol })}
              onTimeframeChange={(timeframe) => setCell(i, { timeframe })}
              className="h-full min-h-0"
            />
          );
        })}
      </div>
    </div>
  );
}
