"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  ChevronDown,
  Eraser,
  Eye,
  EyeOff,
  Loader2,
  Magnet,
  Minus,
  MoveUpRight,
  PenLine,
  Percent,
  Plus,
  Ruler,
  Square,
  Undo2,
  X,
} from "lucide-react";

import {
  getIndicator,
  INDICATOR_COLORS,
  INDICATOR_PRESETS,
  instanceLabel,
  type IndicatorInstance,
} from "@/lib/indicators";
import {
  FUTURES_SYMBOLS,
  TIMEFRAMES,
  type Candle,
  type Timeframe,
} from "@/lib/market-data";
import { cn, formatPercent, formatPrice } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCharts, type Anchor, type Drawing, type DrawingTool } from "@/store/charts";

/* ── Small helpers ────────────────────────────────────────────────────────── */

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

/** Binary search: index of the candle at/just before `time`. */
function indexForTime(candles: Candle[], time: number): number {
  let lo = 0;
  let hi = candles.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (candles[mid].time <= time) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

/** lucide has no vertical-line glyph — a rotated Minus reads perfectly. */
function VerticalLineIcon({ className }: { className?: string }) {
  return <Minus className={cn("rotate-90", className)} />;
}

const CHART_OPTIONS = {
  layout: {
    background: { type: ColorType.Solid, color: "transparent" },
    textColor: "#8b8d98",
    fontFamily: "var(--font-geist-mono), monospace",
    fontSize: 11,
  },
  grid: {
    vertLines: { color: "rgba(255,255,255,0.04)" },
    horzLines: { color: "rgba(255,255,255,0.04)" },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: { color: "rgba(138,92,255,0.4)", labelBackgroundColor: "#6a3dff" },
    horzLine: { color: "rgba(138,92,255,0.4)", labelBackgroundColor: "#6a3dff" },
  },
  rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
  timeScale: {
    borderColor: "rgba(255,255,255,0.08)",
    timeVisible: true,
    secondsVisible: false,
  },
  autoSize: true,
} as const;

const NO_DRAWINGS: Drawing[] = [];

const DEFAULT_INDICATORS: IndicatorInstance[] = [
  { id: "d1", type: "ema", params: { period: 9 }, color: "#4E6BFF" },
  { id: "d2", type: "ema", params: { period: 21 }, color: "rgba(244,245,250,0.5)" },
  { id: "d3", type: "vwap", params: {}, color: "#8A5CFF" },
];

/* ── Chart component ──────────────────────────────────────────────────────── */

export function TradingChart({
  initialSymbol = "NQ",
  initialTimeframe = "5m",
  symbol: symbolProp,
  timeframe: timeframeProp,
  onSymbolChange,
  onTimeframeChange,
  className,
}: {
  initialSymbol?: string;
  initialTimeframe?: Timeframe;
  /** Controlled mode (multi-chart layouts pass these). */
  symbol?: string;
  timeframe?: Timeframe;
  onSymbolChange?: (symbol: string) => void;
  onTimeframeChange?: (timeframe: Timeframe) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const oscContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const oscChartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const instanceSeriesRef = useRef<Map<string, ISeriesApi<"Line" | "Histogram">[]>>(new Map());
  const candlesRef = useRef<Candle[]>([]);
  const syncingRef = useRef(false);
  const draftRef = useRef<{ tool: Exclude<DrawingTool, null>; a: Anchor; b: Anchor } | null>(null);

  const [internalSymbol, setInternalSymbol] = useState(initialSymbol);
  const [internalTimeframe, setInternalTimeframe] = useState<Timeframe>(initialTimeframe);
  const symbol = symbolProp ?? internalSymbol;
  const timeframe = timeframeProp ?? internalTimeframe;
  const setSymbol = onSymbolChange ?? setInternalSymbol;
  const setTimeframe = onTimeframeChange ?? setInternalTimeframe;

  const [candles, setCandles] = useState<Candle[]>([]);
  const [bars, setBars] = useState(500);
  const [indicators, setIndicators] = useState<IndicatorInstance[]>(DEFAULT_INDICATORS);
  const [showVolume, setShowVolume] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [activeTool, setActiveTool] = useState<DrawingTool>(null);
  const [magnetMode, setMagnetMode] = useState(false);
  const [drawingsHidden, setDrawingsHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ last: number; changePct: number } | null>(null);

  const drawingsForSymbol = useCharts((s) => s.drawings[symbol]);
  const drawings = drawingsForSymbol ?? NO_DRAWINGS;
  const addDrawing = useCharts((s) => s.addDrawing);
  const undoDrawing = useCharts((s) => s.undoDrawing);
  const clearDrawings = useCharts((s) => s.clearDrawings);

  const meta = FUTURES_SYMBOLS.find((s) => s.symbol === symbol);
  const hasOscillators = useMemo(
    () => indicators.some((i) => getIndicator(i.type)?.pane === "oscillator"),
    [indicators]
  );

  /* ── Drawing overlay rendering ──────────────────────────────────────────── */

  const redrawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    const container = containerRef.current;
    if (!canvas || !chart || !series || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const { clientWidth: w, clientHeight: h } = container;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const all = candlesRef.current;
    if (all.length === 0) return;

    // Volume profile: horizontal volume-at-price histogram over the visible
    // window. lightweight-charts has no horizontal series — this is ours.
    if (showProfile) {
      const range = chart.timeScale().getVisibleLogicalRange();
      if (range) {
        const from = Math.max(0, Math.floor(range.from));
        const to = Math.min(all.length - 1, Math.ceil(range.to));
        let minP = Infinity;
        let maxP = -Infinity;
        for (let i = from; i <= to; i++) {
          minP = Math.min(minP, all[i].low);
          maxP = Math.max(maxP, all[i].high);
        }
        if (maxP > minP) {
          const BINS = 24;
          const binSize = (maxP - minP) / BINS;
          const vols = new Array<number>(BINS).fill(0);
          for (let i = from; i <= to; i++) {
            const c = all[i];
            const lo = Math.max(0, Math.min(BINS - 1, Math.floor((c.low - minP) / binSize)));
            const hi = Math.max(0, Math.min(BINS - 1, Math.floor((c.high - minP) / binSize)));
            const span = hi - lo + 1;
            for (let b = lo; b <= hi; b++) vols[b] += c.volume / span;
          }
          const maxVol = Math.max(...vols);
          const poc = vols.indexOf(maxVol);
          const maxWidth = w * 0.22;
          for (let b = 0; b < BINS; b++) {
            const yTop = series.priceToCoordinate(minP + (b + 1) * binSize);
            const yBottom = series.priceToCoordinate(minP + b * binSize);
            if (yTop === null || yBottom === null || maxVol === 0) continue;
            ctx.fillStyle = b === poc ? "rgba(138,92,255,0.32)" : "rgba(138,92,255,0.12)";
            ctx.fillRect(
              0,
              Math.min(yTop, yBottom) + 1,
              (vols[b] / maxVol) * maxWidth,
              Math.abs(yBottom - yTop) - 2
            );
          }
        }
      }
    }

    const xFor = (time: number): number | null => {
      const coord = chart.timeScale().logicalToCoordinate(
        indexForTime(all, time) as Parameters<
          ReturnType<IChartApi["timeScale"]>["logicalToCoordinate"]
        >[0]
      );
      return coord === null ? null : coord;
    };
    const yFor = (price: number): number | null => {
      const coord = series.priceToCoordinate(price);
      return coord === null ? null : coord;
    };

    const drawOne = (d: Drawing | { kind: Exclude<DrawingTool, null>; a: Anchor; b: Anchor }) => {
      ctx.lineWidth = 1.5;
      if (d.kind === "hline") {
        const price = "price" in d ? d.price : d.b.price;
        const y = yFor(price);
        if (y === null) return;
        ctx.strokeStyle = "rgba(138,92,255,0.9)";
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.fillStyle = "rgba(138,92,255,1)";
        ctx.font = "10px var(--font-geist-mono), monospace";
        ctx.fillText(formatPrice(price, meta?.decimals ?? 2), 6, y - 4);
        return;
      }
      if (d.kind === "vline") {
        const time = "time" in d ? d.time : 0;
        const x = xFor(time);
        if (x === null) return;
        ctx.strokeStyle = "rgba(138,92,255,0.7)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
        ctx.setLineDash([]);
        return;
      }
      if (!("a" in d)) return;
      const x1 = xFor(d.a.time);
      const x2 = xFor(d.b.time);
      const y1 = yFor(d.a.price);
      const y2 = yFor(d.b.price);
      if (x1 === null || x2 === null || y1 === null || y2 === null) return;

      if (d.kind === "trend" || d.kind === "ray") {
        ctx.strokeStyle = "rgba(78,107,255,0.95)";
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        if (d.kind === "ray" && x2 !== x1) {
          // Extend through b to the canvas edge.
          const slope = (y2 - y1) / (x2 - x1);
          const xEdge = x2 > x1 ? w : 0;
          ctx.lineTo(xEdge, y1 + slope * (xEdge - x1));
        } else if (d.kind === "ray") {
          ctx.lineTo(x2, y2 > y1 ? h : 0);
        } else {
          ctx.lineTo(x2, y2);
        }
        ctx.stroke();
        for (const [px, py] of d.kind === "ray" ? [[x1, y1]] : [[x1, y1], [x2, y2]]) {
          ctx.fillStyle = "#4E6BFF";
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }

      if (d.kind === "rect") {
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(78,107,255,0.08)";
        ctx.strokeStyle = "rgba(78,107,255,0.7)";
        ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        return;
      }

      if (d.kind === "measure") {
        const dp = d.b.price - d.a.price;
        const up = dp >= 0;
        ctx.setLineDash([]);
        ctx.fillStyle = up ? "rgba(46,189,133,0.12)" : "rgba(229,72,77,0.12)";
        ctx.strokeStyle = up ? "rgba(46,189,133,0.8)" : "rgba(229,72,77,0.8)";
        ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        const barsCount = Math.abs(indexForTime(all, d.b.time) - indexForTime(all, d.a.time));
        const pct = d.a.price !== 0 ? (dp / d.a.price) * 100 : 0;
        const label = `${up ? "+" : ""}${dp.toFixed(meta?.decimals ?? 2)}  (${pct.toFixed(2)}%)  ${barsCount} bars`;
        ctx.font = "11px var(--font-geist-mono), monospace";
        const tw = ctx.measureText(label).width;
        const lx = Math.min(Math.max((x1 + x2) / 2 - tw / 2, 4), w - tw - 4);
        const ly = Math.min(y1, y2) - 8;
        ctx.fillStyle = "rgba(11,11,18,0.85)";
        ctx.fillRect(lx - 4, ly - 12, tw + 8, 16);
        ctx.fillStyle = up ? "#2EBD85" : "#E5484D";
        ctx.fillText(label, lx, ly);
        return;
      }

      // Fibonacci retracement.
      const left = Math.min(x1, x2);
      const right = Math.max(x1, x2);
      const range = d.b.price - d.a.price;
      ctx.font = "10px var(--font-geist-mono), monospace";
      for (const level of FIB_LEVELS) {
        const price = d.b.price - range * level;
        const y = yFor(price);
        if (y === null) continue;
        const emphasis = level === 0.5 || level === 0.618;
        ctx.strokeStyle = emphasis ? "rgba(138,92,255,0.85)" : "rgba(138,92,255,0.4)";
        ctx.setLineDash(emphasis ? [] : [4, 4]);
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
        ctx.fillStyle = "rgba(200,180,255,0.9)";
        ctx.fillText(
          `${(level * 100).toFixed(1)}% ${formatPrice(price, meta?.decimals ?? 2)}`,
          right + 6,
          y + 3
        );
      }
      ctx.setLineDash([]);
    };

    if (!drawingsHidden) {
      for (const d of drawings) drawOne(d);
      if (draftRef.current)
        drawOne({ kind: draftRef.current.tool, a: draftRef.current.a, b: draftRef.current.b });
    }
  }, [drawings, meta?.decimals, showProfile, drawingsHidden]);

  const redrawRef = useRef(redrawOverlay);
  redrawRef.current = redrawOverlay;

  /* ── Create charts once ─────────────────────────────────────────────────── */

  useEffect(() => {
    const el = containerRef.current;
    const oscEl = oscContainerRef.current;
    if (!el || !oscEl) return;

    const chart = createChart(el, CHART_OPTIONS);
    const oscChart = createChart(oscEl, {
      ...CHART_OPTIONS,
      timeScale: { ...CHART_OPTIONS.timeScale, visible: false },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#2EBD85",
      downColor: "#E5484D",
      borderUpColor: "#2EBD85",
      borderDownColor: "#E5484D",
      wickUpColor: "rgba(46,189,133,0.7)",
      wickDownColor: "rgba(229,72,77,0.7)",
    });
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    // Keep the oscillator pane horizontally locked to the main chart.
    const syncFrom = (src: IChartApi, dst: IChartApi) => (range: LogicalRange | null) => {
      if (syncingRef.current || !range) return;
      syncingRef.current = true;
      dst.timeScale().setVisibleLogicalRange(range);
      syncingRef.current = false;
      void src;
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(syncFrom(chart, oscChart));
    oscChart.timeScale().subscribeVisibleLogicalRangeChange(syncFrom(oscChart, chart));

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => redrawRef.current());

    const resizeObserver = new ResizeObserver(() => redrawRef.current());
    resizeObserver.observe(el);

    chartRef.current = chart;
    oscChartRef.current = oscChart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      oscChart.remove();
      chartRef.current = null;
      oscChartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      instanceSeriesRef.current.clear();
    };
  }, []);

  /* ── Data loading ───────────────────────────────────────────────────────── */

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chart?symbol=${symbol}&timeframe=${timeframe}&count=${bars}`);
      if (!res.ok) return;
      const data = (await res.json()) as { candles: Candle[] };
      if (data.candles.length === 0) return;
      setCandles(data.candles);
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, bars]);

  useEffect(() => {
    void loadData();
    const id = setInterval(() => void loadData(), 30_000);
    return () => clearInterval(id);
  }, [loadData]);

  /* ── Base series data ───────────────────────────────────────────────────── */

  useEffect(() => {
    if (candles.length === 0) return;
    candlesRef.current = candles;

    candleSeriesRef.current?.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );
    volumeSeriesRef.current?.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? "rgba(46,189,133,0.35)" : "rgba(229,72,77,0.35)",
      }))
    );
    chartRef.current?.timeScale().fitContent();

    const last = candles[candles.length - 1];
    const first = candles[0];
    setStats({ last: last.close, changePct: ((last.close - first.open) / first.open) * 100 });
    redrawRef.current();
  }, [candles]);

  /* ── Indicator instances → chart series ─────────────────────────────────── */

  useEffect(() => {
    const chart = chartRef.current;
    const oscChart = oscChartRef.current;
    if (!chart || !oscChart || candles.length === 0) return;

    // Tear down previous instance series.
    for (const [, seriesList] of instanceSeriesRef.current) {
      for (const s of seriesList) {
        try {
          chart.removeSeries(s);
        } catch {
          try {
            oscChart.removeSeries(s);
          } catch {
            /* already removed */
          }
        }
      }
    }
    instanceSeriesRef.current.clear();

    for (const inst of indicators) {
      const def = getIndicator(inst.type);
      if (!def) continue;
      const target = def.pane === "oscillator" ? oscChart : chart;
      const outputs = def.compute(candles, inst.params);
      const seriesList: ISeriesApi<"Line" | "Histogram">[] = [];

      let lineIndex = 0;
      for (const out of outputs) {
        // Pad oscillator outputs with whitespace so both charts share one
        // logical timeline and stay pixel-aligned when panning.
        const byTime = new Map(out.points.map((p) => [p.time, p]));
        const data = candles.map((c) => {
          const p = byTime.get(c.time);
          return p
            ? { time: c.time as UTCTimestamp, value: p.value, color: p.color }
            : { time: c.time as UTCTimestamp };
        });

        if (out.style === "histogram") {
          const s = target.addHistogramSeries({
            priceFormat: { type: "price", precision: 2, minMove: 0.01 },
            priceLineVisible: false,
            lastValueVisible: false,
          });
          s.setData(data);
          seriesList.push(s);
        } else {
          const color = lineIndex === 0 ? inst.color : withAlpha(inst.color, 0.45);
          const s = target.addLineSeries({
            color,
            lineWidth: lineIndex === 0 ? 2 : 1,
            lineStyle: out.dashed ? 2 : 0,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          s.setData(data);
          seriesList.push(s);
          lineIndex++;
        }
      }
      instanceSeriesRef.current.set(inst.id, seriesList);
    }
  }, [indicators, candles]);

  /* Volume visibility. */
  useEffect(() => {
    volumeSeriesRef.current?.applyOptions({ visible: showVolume });
  }, [showVolume]);

  /* Show seconds on the axis for sub-minute timeframes. */
  useEffect(() => {
    const secs = TIMEFRAMES.find((t) => t.value === timeframe)?.seconds ?? 300;
    chartRef.current?.timeScale().applyOptions({ secondsVisible: secs < 60 });
  }, [timeframe]);

  /* Redraw the overlay when drawings or overlay toggles change. */
  useEffect(() => {
    redrawRef.current();
  }, [drawings, showProfile, drawingsHidden]);

  /* ── Drawing tool pointer handlers ──────────────────────────────────────── */

  const anchorAt = useCallback(
    (x: number, y: number): Anchor | null => {
      const chart = chartRef.current;
      const series = candleSeriesRef.current;
      const all = candlesRef.current;
      if (!chart || !series || all.length === 0) return null;
      const logical = chart.timeScale().coordinateToLogical(x);
      const price = series.coordinateToPrice(y);
      if (logical === null || price === null) return null;
      const idx = Math.max(0, Math.min(all.length - 1, Math.round(logical)));
      let snapped: number = price;
      if (magnetMode) {
        const c = all[idx];
        snapped = [c.open, c.high, c.low, c.close].reduce((best, v) =>
          Math.abs(v - price) < Math.abs(best - price) ? v : best
        );
      }
      return { time: all[idx].time, price: snapped };
    },
    [magnetMode]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!activeTool) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const anchor = anchorAt(e.clientX - rect.left, e.clientY - rect.top);
      if (!anchor) return;

      if (activeTool === "hline") {
        addDrawing(symbol, { id: crypto.randomUUID(), kind: "hline", price: anchor.price });
        setActiveTool(null);
        return;
      }
      if (activeTool === "vline") {
        addDrawing(symbol, { id: crypto.randomUUID(), kind: "vline", time: anchor.time });
        setActiveTool(null);
        return;
      }
      draftRef.current = { tool: activeTool, a: anchor, b: anchor };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [activeTool, anchorAt, addDrawing, symbol]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!draftRef.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const anchor = anchorAt(e.clientX - rect.left, e.clientY - rect.top);
      if (!anchor) return;
      draftRef.current.b = anchor;
      redrawRef.current();
    },
    [anchorAt]
  );

  const onPointerUp = useCallback(() => {
    const draft = draftRef.current;
    draftRef.current = null;
    if (!draft) return;
    if (draft.a.time !== draft.b.time || draft.a.price !== draft.b.price) {
      addDrawing(symbol, {
        id: crypto.randomUUID(),
        kind: draft.tool as "trend" | "ray" | "rect" | "measure" | "fib",
        a: draft.a,
        b: draft.b,
      });
    }
    setActiveTool(null);
    redrawRef.current();
  }, [addDrawing, symbol]);

  /* ── Toolbar ────────────────────────────────────────────────────────────── */

  const addIndicator = (preset: (typeof INDICATOR_PRESETS)[number]) => {
    setIndicators((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        type: preset.type,
        params: preset.params,
        color: INDICATOR_COLORS[list.length % INDICATOR_COLORS.length],
      },
    ]);
  };

  const toolButtons: { tool: Exclude<DrawingTool, null>; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { tool: "trend", label: "Trendline", icon: PenLine },
    { tool: "ray", label: "Ray (extended trendline)", icon: MoveUpRight },
    { tool: "hline", label: "Horizontal level", icon: Minus },
    { tool: "vline", label: "Vertical line", icon: VerticalLineIcon },
    { tool: "rect", label: "Rectangle zone", icon: Square },
    { tool: "fib", label: "Fib retracement", icon: Percent },
    { tool: "measure", label: "Measure (price / % / bars)", icon: Ruler },
  ];

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/6 bg-surface/70",
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 font-mono text-sm font-semibold text-foreground transition-colors hover:bg-white/8 focus:outline-none">
            {symbol}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {FUTURES_SYMBOLS.map((s) => (
              <DropdownMenuItem key={s.symbol} onClick={() => setSymbol(s.symbol)} className="font-mono">
                <span className="w-10 font-semibold">{s.symbol}</span>
                <span className="text-xs text-muted-foreground">{s.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="mx-1 h-5 w-px bg-white/8" />

        <div className="flex items-center gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={cn(
                "rounded-lg px-2 py-1 font-mono text-xs transition-colors",
                timeframe === tf.value
                  ? "bg-brand-violet/15 text-brand-lilac"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="mx-1 h-5 w-px bg-white/8" />

        {/* Indicators */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground focus:outline-none">
            <Plus className="size-3.5" />
            Indicator
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
            {INDICATOR_PRESETS.map((p) => (
              <DropdownMenuItem key={p.label} onClick={() => addIndicator(p)} className="font-mono text-xs">
                {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => setShowVolume((v) => !v)}
          className={cn(
            "rounded-lg px-2 py-1 font-mono text-[10px] transition-all",
            showVolume ? "bg-white/6 text-muted-foreground" : "text-muted-foreground/40 hover:text-muted-foreground"
          )}
        >
          VOL
        </button>
        <button
          title="Volume profile (volume at price)"
          onClick={() => setShowProfile((v) => !v)}
          className={cn(
            "rounded-lg px-2 py-1 font-mono text-[10px] transition-all",
            showProfile
              ? "bg-brand-violet/15 text-brand-lilac"
              : "text-muted-foreground/40 hover:text-muted-foreground"
          )}
        >
          VP
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            title="History depth"
            className="rounded-lg px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground focus:outline-none"
          >
            {bars >= 1000 ? `${bars / 1000}K` : bars} bars
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {[500, 2000, 5000, 10000].map((n) => (
              <DropdownMenuItem key={n} onClick={() => setBars(n)} className="font-mono text-xs">
                {n.toLocaleString("en-US")} bars
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="mx-1 h-5 w-px bg-white/8" />

        {/* Drawing tools */}
        <div className="flex items-center gap-0.5">
          {toolButtons.map(({ tool, label, icon: Icon }) => (
            <button
              key={tool}
              title={label}
              onClick={() => setActiveTool((t) => (t === tool ? null : tool))}
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                activeTool === tool
                  ? "bg-brand-violet/20 text-brand-lilac"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
            </button>
          ))}
          <button
            title="Magnet mode — snap drawings to OHLC"
            onClick={() => setMagnetMode((v) => !v)}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              magnetMode
                ? "bg-brand-violet/20 text-brand-lilac"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            <Magnet className="size-3.5" />
          </button>
          <button
            title={drawingsHidden ? "Show drawings" : "Hide drawings"}
            onClick={() => setDrawingsHidden((v) => !v)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            {drawingsHidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
          <button
            title="Undo last drawing"
            onClick={() => undoDrawing(symbol)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <Undo2 className="size-3.5" />
          </button>
          <button
            title="Clear drawings"
            onClick={() => clearDrawings(symbol)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <Eraser className="size-3.5" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3 font-mono text-xs">
          {stats ? (
            <>
              <span className="tabular text-foreground">{formatPrice(stats.last, meta?.decimals ?? 2)}</span>
              <span className={cn("tabular", stats.changePct >= 0 ? "text-up" : "text-down")}>
                {formatPercent(stats.changePct)}
              </span>
            </>
          ) : null}
          {loading ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
        </div>
      </div>

      {/* Active indicator chips */}
      {indicators.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1 border-b border-white/5 px-3 py-1.5">
          {indicators.map((inst) => (
            <span
              key={inst.id}
              className="flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[10px]"
              style={{ color: inst.color }}
            >
              {instanceLabel(inst)}
              <button
                onClick={() => setIndicators((list) => list.filter((i) => i.id !== inst.id))}
                className="text-muted-foreground transition-colors hover:text-destructive"
                aria-label={`Remove ${instanceLabel(inst)}`}
              >
                <X className="size-2.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {/* Main chart + drawing overlay */}
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="absolute inset-0" />
        <canvas
          ref={overlayRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={cn(
            "absolute inset-0 z-10 h-full w-full",
            activeTool ? "cursor-crosshair" : "pointer-events-none"
          )}
        />
      </div>

      {/* Oscillator pane */}
      <div
        ref={oscContainerRef}
        className={cn("h-32 shrink-0 border-t border-white/5", !hasOscillators && "hidden")}
      />
    </div>
  );
}
