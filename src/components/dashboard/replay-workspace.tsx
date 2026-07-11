"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FUTURES_SYMBOLS,
  TIMEFRAMES,
  type Candle,
  type Timeframe,
} from "@/lib/market-data";
import { cn, formatPnl, formatPrice } from "@/lib/utils";

const selectClass =
  "h-8 rounded-lg border border-white/8 bg-white/5 px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand-violet [&>option]:bg-surface";

const SPEEDS = [1, 2, 5, 10, 20];
const WARMUP_BARS = 200;
const FETCH_BARS = 3000;

interface OpenPosition {
  side: "long" | "short";
  contracts: number;
  entry: number;
  stop: number;
  target: number;
  entryTime: number;
}

interface ClosedTrade {
  side: "long" | "short";
  contracts: number;
  entry: number;
  exit: number;
  pnl: number;
  entryTime: number;
  exitTime: number;
  reason: "stop" | "target" | "manual" | "reset";
}

export function ReplayWorkspace({ defaultSymbol }: { defaultSymbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const lastCursorRef = useRef(-1);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [symbol, setSymbol] = useState(defaultSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>("1m");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(WARMUP_BARS);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);

  const [startBalance, setStartBalance] = useState(100_000);
  const [balance, setBalance] = useState(100_000);
  const [riskPct, setRiskPct] = useState(1);
  const [stopPts, setStopPts] = useState(20);
  const [targetPts, setTargetPts] = useState(40);
  const [autoJournal, setAutoJournal] = useState(true);

  const [position, setPosition] = useState<OpenPosition | null>(null);
  const [trades, setTrades] = useState<ClosedTrade[]>([]);

  const meta = FUTURES_SYMBOLS.find((s) => s.symbol === symbol);
  const pointValue = meta?.pointValue ?? 1;
  const decimals = meta?.decimals ?? 2;
  const currentBar = candles[cursor];

  /* ── Journal auto-log ───────────────────────────────────────────────────── */

  const journalTrade = useCallback(
    (t: ClosedTrade) => {
      if (!autoJournal) return;
      void fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          side: t.side === "long" ? "LONG" : "SHORT",
          quantity: t.contracts,
          entryPrice: t.entry,
          exitPrice: t.exit,
          pnl: t.pnl,
          setup: "Replay session",
          notes: `Replay ${timeframe} · exit: ${t.reason}`,
          tags: ["replay"],
          executedAt: new Date(t.entryTime * 1000).toISOString(),
        }),
      }).catch(() => console.warn("[replay] journal write failed"));
    },
    [autoJournal, symbol, timeframe]
  );

  /* ── Position lifecycle ─────────────────────────────────────────────────── */

  const clearPriceLines = useCallback(() => {
    const series = seriesRef.current;
    if (series) for (const l of priceLinesRef.current) series.removePriceLine(l);
    priceLinesRef.current = [];
  }, []);

  const closePosition = useCallback(
    (p: OpenPosition, exit: number, exitTime: number, reason: ClosedTrade["reason"]) => {
      const points = p.side === "long" ? exit - p.entry : p.entry - exit;
      const pnl = points * pointValue * p.contracts;
      const trade: ClosedTrade = {
        side: p.side,
        contracts: p.contracts,
        entry: p.entry,
        exit,
        pnl,
        entryTime: p.entryTime,
        exitTime,
        reason,
      };
      setBalance((b) => b + pnl);
      setTrades((list) => [...list, trade]);
      setPosition(null);
      clearPriceLines();
      journalTrade(trade);
    },
    [pointValue, clearPriceLines, journalTrade]
  );

  /** Advance the cursor n bars, processing stops/targets bar by bar. */
  const step = useCallback(
    (n: number) => {
      setCursor((prev) => {
        let idx = prev;
        setPosition((pos) => {
          let p = pos;
          for (let k = 0; k < n && idx < candles.length - 1; k++) {
            idx++;
            const bar = candles[idx];
            if (p) {
              const stopHit = p.side === "long" ? bar.low <= p.stop : bar.high >= p.stop;
              const targetHit = p.side === "long" ? bar.high >= p.target : bar.low <= p.target;
              if (stopHit) {
                closePosition(p, p.stop, bar.time, "stop");
                p = null;
              } else if (targetHit) {
                closePosition(p, p.target, bar.time, "target");
                p = null;
              }
            }
          }
          return p;
        });
        return idx;
      });
    },
    [candles, closePosition]
  );

  const placeOrder = useCallback(
    (side: "long" | "short") => {
      if (position || !currentBar || stopPts <= 0) return;
      const riskDollars = balance * (riskPct / 100);
      const contracts = Math.floor(riskDollars / (stopPts * pointValue));
      if (contracts < 1) return;
      const entry = currentBar.close;
      const p: OpenPosition = {
        side,
        contracts,
        entry,
        stop: side === "long" ? entry - stopPts : entry + stopPts,
        target: side === "long" ? entry + targetPts : entry - targetPts,
        entryTime: currentBar.time,
      };
      setPosition(p);

      const series = seriesRef.current;
      if (series) {
        priceLinesRef.current = [
          series.createPriceLine({
            price: p.entry,
            color: "#4E6BFF",
            lineWidth: 1,
            lineStyle: 0,
            axisLabelVisible: true,
            title: `${side.toUpperCase()} ${contracts}`,
          }),
          series.createPriceLine({
            price: p.stop,
            color: "#E5484D",
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "SL",
          }),
          series.createPriceLine({
            price: p.target,
            color: "#2EBD85",
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "TP",
          }),
        ];
      }
    },
    [position, currentBar, balance, riskPct, stopPts, targetPts, pointValue]
  );

  const resetSession = useCallback(() => {
    setPlaying(false);
    setPosition(null);
    clearPriceLines();
    setTrades([]);
    setBalance(startBalance);
    setCursor(Math.min(WARMUP_BARS, Math.max(0, candles.length - 1)));
    lastCursorRef.current = -1;
  }, [candles.length, clearPriceLines, startBalance]);

  /* ── Draggable SL/TP lines ──────────────────────────────────────────────── */

  const positionLiveRef = useRef<OpenPosition | null>(null);
  useEffect(() => {
    positionLiveRef.current = position;
  }, [position]);
  const tickLiveRef = useRef({ tick: 0.25, decimals: 2 });
  useEffect(() => {
    tickLiveRef.current = { tick: meta?.tickSize ?? 0.25, decimals };
  }, [meta?.tickSize, decimals]);
  const dragLevelRef = useRef<"stop" | "target" | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const HIT_PX = 7;

    const levelAt = (y: number): "stop" | "target" | null => {
      const p = positionLiveRef.current;
      const series = seriesRef.current;
      if (!p || !series) return null;
      const ys = series.priceToCoordinate(p.stop);
      const yt = series.priceToCoordinate(p.target);
      if (ys !== null && Math.abs(y - ys) <= HIT_PX) return "stop";
      if (yt !== null && Math.abs(y - yt) <= HIT_PX) return "target";
      return null;
    };

    const onDown = (e: PointerEvent) => {
      const level = levelAt(e.clientY - el.getBoundingClientRect().top);
      if (!level) return;
      dragLevelRef.current = level;
      e.preventDefault();
      e.stopPropagation(); // steal this gesture from the chart's pan handler
      el.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      const y = e.clientY - el.getBoundingClientRect().top;
      const level = dragLevelRef.current;
      if (!level) {
        el.style.cursor = levelAt(y) ? "ns-resize" : "";
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const p = positionLiveRef.current;
      const series = seriesRef.current;
      if (!p || !series) return;
      const raw = series.coordinateToPrice(y);
      if (raw === null) return;
      const { tick, decimals: dp } = tickLiveRef.current;
      let price = Number((Math.round(Number(raw) / tick) * tick).toFixed(dp));
      // Exit levels stay on their own side of the entry (size never changes).
      if (level === "stop") {
        price = p.side === "long" ? Math.min(price, p.entry - tick) : Math.max(price, p.entry + tick);
      } else {
        price = p.side === "long" ? Math.max(price, p.entry + tick) : Math.min(price, p.entry - tick);
      }
      priceLinesRef.current[level === "stop" ? 1 : 2]?.applyOptions({ price });
      setPosition((prev) => (prev ? { ...prev, [level]: price } : prev));
    };

    const onUp = (e: PointerEvent) => {
      if (!dragLevelRef.current) return;
      dragLevelRef.current = null;
      el.style.cursor = "";
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };

    el.addEventListener("pointerdown", onDown, true);
    el.addEventListener("pointermove", onMove, true);
    el.addEventListener("pointerup", onUp, true);
    return () => {
      el.removeEventListener("pointerdown", onDown, true);
      el.removeEventListener("pointermove", onMove, true);
      el.removeEventListener("pointerup", onUp, true);
    };
  }, []);

  /* ── Chart setup ────────────────────────────────────────────────────────── */

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
        rightOffset: 6,
      },
      autoSize: true,
    });
    const series = chart.addCandlestickSeries({
      upColor: "#2EBD85",
      downColor: "#E5484D",
      borderUpColor: "#2EBD85",
      borderDownColor: "#E5484D",
      wickUpColor: "rgba(46,189,133,0.7)",
      wickDownColor: "rgba(229,72,77,0.7)",
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, []);

  /* ── Data loading (resets the session) ──────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPlaying(false);
      try {
        const res = await fetch(
          `/api/chart?symbol=${symbol}&timeframe=${timeframe}&count=${FETCH_BARS}`
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { candles: Candle[] };
        if (cancelled) return;
        setCandles(data.candles);
        setPosition(null);
        clearPriceLines();
        setTrades([]);
        setBalance(startBalance);
        setCursor(Math.min(WARMUP_BARS, data.candles.length - 1));
        lastCursorRef.current = -1;
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // startBalance intentionally omitted — changing it mid-session must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe]);

  /* ── Reveal bars up to the cursor ───────────────────────────────────────── */

  useEffect(() => {
    const series = seriesRef.current;
    if (!series || candles.length === 0) return;
    const toBar = (c: Candle) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    });
    if (cursor === lastCursorRef.current + 1) {
      series.update(toBar(candles[cursor]));
    } else {
      series.setData(candles.slice(0, cursor + 1).map(toBar));
      chartRef.current?.timeScale().scrollToRealTime();
    }
    lastCursorRef.current = cursor;
  }, [cursor, candles]);

  /* ── Playback timer ─────────────────────────────────────────────────────── */

  useEffect(() => {
    if (playTimerRef.current) clearInterval(playTimerRef.current);
    if (!playing) return;
    playTimerRef.current = setInterval(() => step(1), Math.max(30, 1000 / speed));
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [playing, speed, step]);

  useEffect(() => {
    if (cursor >= candles.length - 1) setPlaying(false);
  }, [cursor, candles.length]);

  /* ── Hotkeys ────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(e.shiftKey ? 10 : 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (!position) setCursor((c) => Math.max(1, c - (e.shiftKey ? 10 : 1)));
      } else if (e.key.toLowerCase() === "b") {
        placeOrder("long");
      } else if (e.key.toLowerCase() === "s") {
        placeOrder("short");
      } else if (e.key.toLowerCase() === "c" && position && currentBar) {
        closePosition(position, currentBar.close, currentBar.time, "manual");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, placeOrder, position, currentBar, closePosition]);

  /* ── Session metrics ────────────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const wins = trades.filter((t) => t.pnl > 0);
    const losses = trades.filter((t) => t.pnl <= 0);
    const grossWin = wins.reduce((a, t) => a + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
    let equity = startBalance;
    let peak = startBalance;
    let maxDD = 0;
    for (const t of trades) {
      equity += t.pnl;
      peak = Math.max(peak, equity);
      maxDD = Math.max(maxDD, peak - equity);
    }
    return {
      net: trades.reduce((a, t) => a + t.pnl, 0),
      winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
      pf: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
      maxDD,
    };
  }, [trades, startBalance]);

  const openPnl =
    position && currentBar
      ? (position.side === "long"
          ? currentBar.close - position.entry
          : position.entry - currentBar.close) *
        pointValue *
        position.contracts
      : 0;

  const barDate = currentBar
    ? new Date(currentBar.time * 1000).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  /* ── UI ─────────────────────────────────────────────────────────────────── */

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col gap-2">
      {/* Transport bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/6 bg-surface/70 px-3 py-2">
        <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className={selectClass}>
          {FUTURES_SYMBOLS.map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol}
            </option>
          ))}
        </select>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as Timeframe)}
          className={selectClass}
        >
          {TIMEFRAMES.map((tf) => (
            <option key={tf.value} value={tf.value}>
              {tf.label}
            </option>
          ))}
        </select>

        <div className="mx-1 h-5 w-px bg-white/8" />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => !position && setCursor((c) => Math.max(1, c - 1))}
          disabled={!!position}
          title="Step back (←) — flat only"
        >
          <ChevronLeft />
        </Button>
        <Button
          size="icon-sm"
          onClick={() => setPlaying((p) => !p)}
          title="Play / pause (space)"
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => step(1)} title="Step forward (→)">
          <ChevronRight />
        </Button>

        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className={selectClass}
          title="Playback speed"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s} bar/s
            </option>
          ))}
        </select>

        <input
          type="range"
          min={1}
          max={Math.max(1, candles.length - 1)}
          value={cursor}
          onChange={(e) => {
            const target = Number(e.target.value);
            if (target > cursor) step(target - cursor);
            else if (!position) setCursor(target);
          }}
          className="min-w-32 flex-1 accent-brand-violet"
          title="Scrub through history (forward processes your stops)"
        />
        <span className="font-mono text-[11px] text-muted-foreground">{barDate}</span>
        <Button variant="ghost" size="icon-sm" onClick={resetSession} title="Reset session">
          <RotateCcw />
        </Button>
        {loading ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
      </div>

      {/* Chart + side panel */}
      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[1fr_280px]">
        <div className="relative min-h-64 overflow-hidden rounded-2xl border border-white/6 bg-surface/70">
          <div ref={containerRef} className="absolute inset-0" />
        </div>

        <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
          {/* Order ticket */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Order ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Risk %</Label>
                  <Input
                    type="number"
                    value={riskPct}
                    min={0.1}
                    max={10}
                    step={0.1}
                    onChange={(e) => setRiskPct(Number(e.target.value) || 1)}
                    className="h-8 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">SL (pts)</Label>
                  <Input
                    type="number"
                    value={stopPts}
                    min={0.25}
                    step={0.25}
                    onChange={(e) => setStopPts(Number(e.target.value) || 1)}
                    className="h-8 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">TP (pts)</Label>
                  <Input
                    type="number"
                    value={targetPts}
                    min={0.25}
                    step={0.25}
                    onChange={(e) => setTargetPts(Number(e.target.value) || 1)}
                    className="h-8 font-mono text-xs"
                  />
                </div>
              </div>

              {position ? (
                <div className="space-y-2">
                  <div className="rounded-lg bg-white/[0.04] p-2 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className={position.side === "long" ? "text-up" : "text-down"}>
                        {position.side.toUpperCase()} {position.contracts}
                      </span>
                      <span className={cn("tabular", openPnl >= 0 ? "text-up" : "text-down")}>
                        {formatPnl(openPnl)}
                      </span>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      @ {formatPrice(position.entry, decimals)} · SL{" "}
                      {formatPrice(position.stop, decimals)} · TP{" "}
                      {formatPrice(position.target, decimals)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      currentBar &&
                      closePosition(position, currentBar.close, currentBar.time, "manual")
                    }
                  >
                    Close position (C)
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="bg-up font-semibold text-black hover:bg-up/90"
                    onClick={() => placeOrder("long")}
                  >
                    Buy (B)
                  </Button>
                  <Button
                    className="bg-down font-semibold hover:bg-down/90"
                    onClick={() => placeOrder("short")}
                  >
                    Sell (S)
                  </Button>
                </div>
              )}

              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={autoJournal}
                  onChange={(e) => setAutoJournal(e.target.checked)}
                  className="accent-brand-violet"
                />
                Auto-log closed trades to Journal
              </label>
            </CardContent>
          </Card>

          {/* Session stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Session</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="rounded-lg bg-white/[0.04] p-2">
                <div className="text-[10px] text-muted-foreground">Balance</div>
                <div className="tabular text-foreground">${formatPrice(balance, 0)}</div>
              </div>
              <div className="rounded-lg bg-white/[0.04] p-2">
                <div className="text-[10px] text-muted-foreground">Net P&L</div>
                <div className={cn("tabular", stats.net >= 0 ? "text-up" : "text-down")}>
                  {formatPnl(stats.net)}
                </div>
              </div>
              <div className="rounded-lg bg-white/[0.04] p-2">
                <div className="text-[10px] text-muted-foreground">Win rate</div>
                <div className="tabular">{stats.winRate.toFixed(0)}%</div>
              </div>
              <div className="rounded-lg bg-white/[0.04] p-2">
                <div className="text-[10px] text-muted-foreground">Profit factor</div>
                <div className="tabular">
                  {Number.isFinite(stats.pf) ? stats.pf.toFixed(2) : "∞"}
                </div>
              </div>
              <div className="col-span-2 rounded-lg bg-white/[0.04] p-2">
                <div className="text-[10px] text-muted-foreground">Max drawdown</div>
                <div className="tabular text-down">{formatPnl(-stats.maxDD)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Trade list */}
          <Card className="min-h-0 flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Trades ({trades.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 overflow-y-auto font-mono text-[11px]">
              {trades.length === 0 ? (
                <p className="text-muted-foreground/60">
                  Press play, then B to buy or S to sell.
                </p>
              ) : (
                [...trades].reverse().map((t, i) => (
                  <div
                    key={trades.length - i}
                    className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2 py-1.5"
                  >
                    <span className={t.side === "long" ? "text-up" : "text-down"}>
                      {t.side === "long" ? "L" : "S"}×{t.contracts}
                    </span>
                    <span className="text-muted-foreground">{t.reason}</span>
                    <span className={cn("tabular", t.pnl >= 0 ? "text-up" : "text-down")}>
                      {formatPnl(t.pnl)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
