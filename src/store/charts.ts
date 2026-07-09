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
  | { id: string; kind: "ray"; a: Anchor; b: Anchor }
  | { id: string; kind: "rect"; a: Anchor; b: Anchor }
  | { id: string; kind: "measure"; a: Anchor; b: Anchor }
  | { id: string; kind: "fib"; a: Anchor; b: Anchor }
  | { id: string; kind: "hline"; price: number }
  | { id: string; kind: "vline"; time: number };

export type DrawingTool = Drawing["kind"] | null;

/* ── Multi-chart layout ──────────────────────────────────────────────────── */

export type ChartLayout = "1" | "2h" | "2v" | "4" | "6" | "9" | "16";

export interface ChartCell {
  symbol: string;
  timeframe: Timeframe;
}

const CELL_ROTATION = ["NQ", "ES", "GC", "CL", "BTC", "ETH", "EURUSD", "AAPL"];

const DEFAULT_CELLS: ChartCell[] = Array.from({ length: 16 }, (_, i) => ({
  symbol: CELL_ROTATION[i % CELL_ROTATION.length],
  timeframe: i < 4 ? "5m" : "15m",
}));

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
        set((s) => {
          // Persisted state from older versions may hold fewer cells — pad.
          const cells = [...s.cells];
          while (cells.length <= index) {
            cells.push(DEFAULT_CELLS[cells.length] ?? { symbol: "NQ", timeframe: "5m" });
          }
          cells[index] = { ...cells[index], ...cell };
          return { cells };
        }),
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
