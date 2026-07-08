"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Download, FlaskConical, Loader2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_STRATEGY,
  runBacktest,
  tradesToCsv,
  type BacktestResult,
  type StrategyConfig,
} from "@/lib/backtest/engine";
import {
  FUTURES_SYMBOLS,
  TIMEFRAMES,
  type Candle,
  type SymbolMeta,
  type Timeframe,
} from "@/lib/market-data";
import { cn, formatPnl, formatPrice } from "@/lib/utils";

const EquityCurve = dynamic(
  () => import("@/components/dashboard/equity-curve").then((m) => m.EquityCurve),
  { ssr: false, loading: () => <Skeleton className="h-64 rounded-xl" /> }
);

const selectClass =
  "h-9 w-full rounded-lg border border-white/8 bg-white/5 px-2.5 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand-violet [&>option]:bg-surface";

const ENTRY_RULES: { value: StrategyConfig["entry"]; label: string; hint: string }[] = [
  { value: "ema-cross", label: "EMA crossover", hint: "Fast EMA crossing the slow EMA" },
  { value: "rsi-extreme", label: "RSI reversal", hint: "RSI recovering from oversold / overbought" },
  { value: "breakout", label: "Range breakout", hint: "Close beyond the N-bar high / low" },
];

function NumberField({
  label,
  value,
  onChange,
  min = 1,
  max = 10000,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        className="h-9 font-mono"
      />
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.03] p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 font-mono text-lg font-semibold tabular",
          tone === "up" && "text-up",
          tone === "down" && "text-down"
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function BacktestClient({ defaultSymbol }: { defaultSymbol: string }) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [bars, setBars] = useState(1000);
  const [cfg, setCfg] = useState<StrategyConfig>(DEFAULT_STRATEGY);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const set = <K extends keyof StrategyConfig>(key: K, value: StrategyConfig[K]) =>
    setCfg((c) => ({ ...c, [key]: value }));

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/chart?symbol=${symbol}&timeframe=${timeframe}&count=${bars}`);
      if (!res.ok) {
        setError("Could not load historical data.");
        return;
      }
      const data = (await res.json()) as { candles: Candle[]; meta: SymbolMeta };
      setResult(runBacktest(data.candles, data.meta, cfg));
    } finally {
      setRunning(false);
    }
  };

  const meta = FUTURES_SYMBOLS.find((s) => s.symbol === symbol);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* ── Strategy builder ─────────────────────────────────────────────── */}
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="size-4 text-brand-lilac" />
            Strategy builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Symbol</Label>
              <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className={selectClass}>
                {FUTURES_SYMBOLS.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Timeframe</Label>
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
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">History (bars)</Label>
            <select
              value={bars}
              onChange={(e) => setBars(Number(e.target.value))}
              className={selectClass}
            >
              {[300, 500, 1000, 2000, 5000, 10000].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Entry rule</Label>
            <select
              value={cfg.entry}
              onChange={(e) => set("entry", e.target.value as StrategyConfig["entry"])}
              className={selectClass}
            >
              {ENTRY_RULES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground/70">
              {ENTRY_RULES.find((r) => r.value === cfg.entry)?.hint}
            </p>
          </div>

          {cfg.entry === "ema-cross" ? (
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Fast EMA" value={cfg.emaFast} onChange={(v) => set("emaFast", v)} max={200} />
              <NumberField label="Slow EMA" value={cfg.emaSlow} onChange={(v) => set("emaSlow", v)} max={400} />
            </div>
          ) : null}
          {cfg.entry === "rsi-extreme" ? (
            <div className="grid grid-cols-3 gap-3">
              <NumberField label="Period" value={cfg.rsiPeriod} onChange={(v) => set("rsiPeriod", v)} max={100} />
              <NumberField label="Oversold" value={cfg.rsiOversold} onChange={(v) => set("rsiOversold", v)} max={50} />
              <NumberField label="Overbought" value={cfg.rsiOverbought} onChange={(v) => set("rsiOverbought", v)} min={50} max={99} />
            </div>
          ) : null}
          {cfg.entry === "breakout" ? (
            <NumberField
              label="Lookback (bars)"
              value={cfg.breakoutLookback}
              onChange={(v) => set("breakoutLookback", v)}
              min={5}
              max={200}
            />
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Direction</Label>
            <select
              value={cfg.direction}
              onChange={(e) => set("direction", e.target.value as StrategyConfig["direction"])}
              className={selectClass}
            >
              <option value="both">Long + short</option>
              <option value="long">Long only</option>
              <option value="short">Short only</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Stop (pts)" value={cfg.stopPoints} onChange={(v) => set("stopPoints", v)} step={0.25} />
            <NumberField label="Target (pts)" value={cfg.targetPoints} onChange={(v) => set("targetPoints", v)} step={0.25} />
            <NumberField
              label="Trailing (pts, 0 = off)"
              value={cfg.trailingPoints}
              onChange={(v) => set("trailingPoints", v)}
              min={0}
              step={0.25}
            />
            <NumberField
              label="Slippage (pts/fill)"
              value={cfg.slippagePoints}
              onChange={(v) => set("slippagePoints", v)}
              min={0}
              max={20}
              step={0.25}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Position sizing</Label>
            <select
              value={cfg.riskMode}
              onChange={(e) => set("riskMode", e.target.value as StrategyConfig["riskMode"])}
              className={selectClass}
            >
              <option value="fixed">Fixed contracts</option>
              <option value="percent">Risk % of balance</option>
            </select>
          </div>

          {cfg.riskMode === "fixed" ? (
            <NumberField label="Contracts" value={cfg.contracts} onChange={(v) => set("contracts", v)} max={100} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Start balance ($)"
                value={cfg.startBalance}
                onChange={(v) => set("startBalance", v)}
                min={1000}
                max={100000000}
                step={1000}
              />
              <NumberField
                label="Risk per trade (%)"
                value={cfg.riskPercent}
                onChange={(v) => set("riskPercent", v)}
                min={0.1}
                max={10}
                step={0.1}
              />
            </div>
          )}

          <Button onClick={() => void run()} disabled={running} className="w-full">
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            Run backtest
          </Button>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <p className="text-[11px] leading-relaxed text-muted-foreground/60">
            Simulated fills on historical data ({meta?.name ?? symbol}, $
            {meta?.pointValue ?? "—"}/pt). Entries at next-bar open plus slippage; stops fill
            before targets; targets fill as limit orders. Past performance never guarantees
            future results.
          </p>
        </CardContent>
      </Card>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      <div className="min-w-0 space-y-4">
        {!result ? (
          <Card className="flex h-64 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Configure a strategy and hit <span className="text-foreground">Run backtest</span>.
            </p>
          </Card>
        ) : result.trades.length === 0 ? (
          <Card className="flex h-64 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No trades were generated — try a different entry rule, timeframe, or more history.
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricTile
                label="Net P&L"
                value={formatPnl(result.netPnl)}
                tone={result.netPnl >= 0 ? "up" : "down"}
              />
              <MetricTile label="Win rate" value={`${result.winRate.toFixed(1)}%`} />
              <MetricTile
                label="Profit factor"
                value={Number.isFinite(result.profitFactor) ? result.profitFactor.toFixed(2) : "∞"}
              />
              <MetricTile
                label="Max drawdown"
                value={`${result.maxDrawdownPct.toFixed(1)}% (${formatPnl(-result.maxDrawdown)})`}
                tone="down"
              />
              <MetricTile label="Sharpe (trades)" value={result.sharpe.toFixed(2)} />
              <MetricTile label="Expectancy" value={`${result.expectancyR.toFixed(2)}R`} />
              <MetricTile label="Trades" value={String(result.trades.length)} />
              <MetricTile
                label="Avg win / loss"
                value={`$${formatPrice(result.avgWin, 0)} / $${formatPrice(result.avgLoss, 0)}`}
              />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Equity curve</CardTitle>
              </CardHeader>
              <CardContent>
                <EquityCurve points={result.equity} className="h-64" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Trades ({result.trades.length})
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([tradesToCsv(result)], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `confluentx-backtest-${symbol}-${timeframe}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="size-3.5" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full font-mono text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-normal">Entry</th>
                      <th className="pb-2 pr-4 font-normal">Side</th>
                      <th className="pb-2 pr-4 font-normal">Qty</th>
                      <th className="pb-2 pr-4 font-normal">In</th>
                      <th className="pb-2 pr-4 font-normal">Out</th>
                      <th className="pb-2 pr-4 font-normal">Pts</th>
                      <th className="pb-2 pr-4 font-normal">P&L</th>
                      <th className="pb-2 font-normal">Exit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="py-1.5 pr-4 text-muted-foreground">
                          {new Date(t.entryTime * 1000).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td
                          className={cn(
                            "py-1.5 pr-4 font-semibold",
                            t.side === "long" ? "text-up" : "text-down"
                          )}
                        >
                          {t.side.toUpperCase()}
                        </td>
                        <td className="py-1.5 pr-4">{t.contracts}</td>
                        <td className="py-1.5 pr-4">{formatPrice(t.entryPrice, meta?.decimals ?? 2)}</td>
                        <td className="py-1.5 pr-4">{formatPrice(t.exitPrice, meta?.decimals ?? 2)}</td>
                        <td className={cn("py-1.5 pr-4 tabular", t.points >= 0 ? "text-up" : "text-down")}>
                          {t.points >= 0 ? "+" : ""}
                          {t.points.toFixed(2)}
                        </td>
                        <td className={cn("py-1.5 pr-4 tabular", t.pnl >= 0 ? "text-up" : "text-down")}>
                          {formatPnl(t.pnl)}
                        </td>
                        <td className="py-1.5 text-muted-foreground">{t.exitReason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
