"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { Loader2 } from "lucide-react";

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
import { ChevronDown } from "lucide-react";

/* ── Indicator math ───────────────────────────────────────────────────────── */

function emaSeries(candles: Candle[], period: number) {
  const k = 2 / (period + 1);
  let prev = candles[0]?.close ?? 0;
  return candles.map((c, i) => {
    prev = i === 0 ? c.close : c.close * k + prev * (1 - k);
    return { time: c.time as UTCTimestamp, value: prev };
  });
}

function vwapSeries(candles: Candle[]) {
  let cumPV = 0;
  let cumV = 0;
  return candles.map((c) => {
    const typical = (c.high + c.low + c.close) / 3;
    cumPV += typical * c.volume;
    cumV += c.volume;
    return { time: c.time as UTCTimestamp, value: cumPV / Math.max(1, cumV) };
  });
}

/* ── Chart component ──────────────────────────────────────────────────────── */

interface Indicators {
  volume: boolean;
  vwap: boolean;
  emaFast: boolean;
  emaSlow: boolean;
}

export function TradingChart({
  initialSymbol = "NQ",
  initialTimeframe = "5m",
  className,
}: {
  initialSymbol?: string;
  initialTimeframe?: Timeframe;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaFastRef = useRef<ISeriesApi<"Line"> | null>(null);
  const emaSlowRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [indicators, setIndicators] = useState<Indicators>({
    volume: true,
    vwap: true,
    emaFast: true,
    emaSlow: true,
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ last: number; changePct: number } | null>(null);

  const meta = FUTURES_SYMBOLS.find((s) => s.symbol === symbol);

  /* Create the chart once. */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
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
    });

    const candles = chart.addCandlestickSeries({
      upColor: "#2EBD85",
      downColor: "#E5484D",
      borderUpColor: "#2EBD85",
      borderDownColor: "#E5484D",
      wickUpColor: "rgba(46,189,133,0.7)",
      wickDownColor: "rgba(229,72,77,0.7)",
    });

    const volume = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    const vwap = chart.addLineSeries({
      color: "#8A5CFF",
      lineWidth: 2,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const emaFast = chart.addLineSeries({
      color: "#4E6BFF",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const emaSlow = chart.addLineSeries({
      color: "rgba(244,245,250,0.5)",
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candles;
    volumeSeriesRef.current = volume;
    vwapSeriesRef.current = vwap;
    emaFastRef.current = emaFast;
    emaSlowRef.current = emaSlow;

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  /* Load data whenever symbol/timeframe changes. */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chart?symbol=${symbol}&timeframe=${timeframe}&count=300`);
      if (!res.ok) return;
      const data = (await res.json()) as { candles: Candle[] };
      const candles = data.candles;
      if (candles.length === 0) return;

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
      vwapSeriesRef.current?.setData(vwapSeries(candles));
      emaFastRef.current?.setData(emaSeries(candles, 9));
      emaSlowRef.current?.setData(emaSeries(candles, 21));
      chartRef.current?.timeScale().fitContent();

      const last = candles[candles.length - 1];
      const first = candles[0];
      setStats({
        last: last.close,
        changePct: ((last.close - first.open) / first.open) * 100,
      });
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    void loadData();
    // Refresh the last bar periodically — mirrors a live feed's cadence.
    const id = setInterval(() => void loadData(), 30_000);
    return () => clearInterval(id);
  }, [loadData]);

  /* Indicator visibility. */
  useEffect(() => {
    volumeSeriesRef.current?.applyOptions({ visible: indicators.volume });
    vwapSeriesRef.current?.applyOptions({ visible: indicators.vwap });
    emaFastRef.current?.applyOptions({ visible: indicators.emaFast });
    emaSlowRef.current?.applyOptions({ visible: indicators.emaSlow });
  }, [indicators]);

  const indicatorButtons: { key: keyof Indicators; label: string; color: string }[] = [
    { key: "volume", label: "VOL", color: "text-muted-foreground" },
    { key: "vwap", label: "VWAP", color: "text-brand-lilac" },
    { key: "emaFast", label: "EMA 9", color: "text-brand-blue" },
    { key: "emaSlow", label: "EMA 21", color: "text-foreground/60" },
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
              <DropdownMenuItem
                key={s.symbol}
                onClick={() => setSymbol(s.symbol)}
                className="font-mono"
              >
                <span className="w-10 font-semibold">{s.symbol}</span>
                <span className="text-xs text-muted-foreground">{s.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden text-xs text-muted-foreground sm:block">{meta?.name}</div>

        <div className="mx-1 h-5 w-px bg-white/8" />

        <div className="flex items-center gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={cn(
                "rounded-lg px-2.5 py-1 font-mono text-xs transition-colors",
                timeframe === tf.value
                  ? "bg-brand-violet/15 text-brand-lilac"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="mx-1 hidden h-5 w-px bg-white/8 md:block" />

        <div className="hidden items-center gap-0.5 md:flex">
          {indicatorButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setIndicators((s) => ({ ...s, [btn.key]: !s[btn.key] }))}
              className={cn(
                "rounded-lg px-2 py-1 font-mono text-[10px] transition-all",
                indicators[btn.key]
                  ? cn("bg-white/6", btn.color)
                  : "text-muted-foreground/40 hover:text-muted-foreground"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 font-mono text-xs">
          {stats ? (
            <>
              <span className="tabular text-foreground">
                {formatPrice(stats.last, meta?.decimals ?? 2)}
              </span>
              <span
                className={cn("tabular", stats.changePct >= 0 ? "text-up" : "text-down")}
              >
                {formatPercent(stats.changePct)}
              </span>
            </>
          ) : null}
          {loading ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
        </div>
      </div>

      {/* Chart canvas */}
      <div ref={containerRef} className="min-h-0 flex-1" />
    </div>
  );
}
