import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Timeframe } from "@/lib/market-data";

/* ── Drawings (per symbol — a trendline on NQ shows on every NQ chart) ───── */

export interface Anchor {
  time: number;
  price: number;
}

export type Drawing =
  | { id: string; kind: "trend"; a: Anchor; b: Anchor }
  | { id: string; kind: "hline"; price: number }
  | { id: string; kind: "fib"; a: Anchor; b: Anchor };

export type DrawingTool = Drawing["kind"] | null;

/* ── Multi-chart layout ──────────────────────────────────────────────────── */

export type ChartLayout = "1" | "2h" | "2v" | "4";

export interface ChartCell {
  symbol: string;
  timeframe: Timeframe;
}

const DEFAULT_CELLS: ChartCell[] = [
  { symbol: "NQ", timeframe: "5m" },
  { symbol: "ES", timeframe: "5m" },
  { symbol: "GC", timeframe: "15m" },
  { symbol: "CL", timeframe: "15m" },
];

interface ChartsState {
  layout: ChartLayout;
  cells: ChartCell[];
  drawings: Record<string, Drawing[]>;
  setLayout: (layout: ChartLayout) => void;
  setCell: (index: number, cell: Partial<ChartCell>) => void;
  addDrawing: (symbol: string, drawing: Drawing) => void;
  undoDrawing: (symbol: string) => void;
  clearDrawings: (symbol: string) => void;
}

export const useCharts = create<ChartsState>()(
  persist(
    (set) => ({
      layout: "1",
      cells: DEFAULT_CELLS,
      drawings: {},
      setLayout: (layout) => set({ layout }),
      setCell: (index, cell) =>
        set((s) => ({
          cells: s.cells.map((c, i) => (i === index ? { ...c, ...cell } : c)),
        })),
      addDrawing: (symbol, drawing) =>
        set((s) => ({
          drawings: { ...s.drawings, [symbol]: [...(s.drawings[symbol] ?? []), drawing] },
        })),
      undoDrawing: (symbol) =>
        set((s) => ({
          drawings: { ...s.drawings, [symbol]: (s.drawings[symbol] ?? []).slice(0, -1) },
        })),
      clearDrawings: (symbol) =>
        set((s) => ({ drawings: { ...s.drawings, [symbol]: [] } })),
    }),
    { name: "cx-charts" }
  )
);
