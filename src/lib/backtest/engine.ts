import { emaValues, rsiValues } from "@/lib/indicators";
import type { Candle, SymbolMeta } from "@/lib/market-data";

/**
 * Client-side strategy simulation over historical candles.
 *
 * Deliberately conservative fills: entries happen at the NEXT bar's open
 * after a signal, and if a bar touches both the stop and the target, the
 * stop is assumed to fill first.
 */

export type EntryRule = "ema-cross" | "rsi-extreme" | "breakout";
export type Direction = "long" | "short" | "both";

export interface StrategyConfig {
  entry: EntryRule;
  direction: Direction;
  /** ema-cross */
  emaFast: number;
  emaSlow: number;
  /** rsi-extreme */
  rsiPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;
  /** breakout */
  breakoutLookback: number;
  /** risk, in points */
  stopPoints: number;
  targetPoints: number;
  contracts: number;
  /** flat commission per contract per side, $ */
  commission: number;
}

export const DEFAULT_STRATEGY: StrategyConfig = {
  entry: "ema-cross",
  direction: "both",
  emaFast: 9,
  emaSlow: 21,
  rsiPeriod: 14,
  rsiOversold: 30,
  rsiOverbought: 70,
  breakoutLookback: 20,
  stopPoints: 20,
  targetPoints: 40,
  contracts: 1,
  commission: 2.5,
};

export interface BacktestTrade {
  side: "long" | "short";
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  points: number;
  pnl: number;
  rMultiple: number;
  exitReason: "stop" | "target" | "signal" | "end";
}

export interface EquityPoint {
  time: number;
  value: number;
}

export interface BacktestResult {
  trades: BacktestTrade[];
  equity: EquityPoint[];
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpe: number;
  expectancyR: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  maxConsecutiveLosses: number;
  totalCommission: number;
}

type Signal = 1 | -1 | 0;

/** Signal at bar i (computed on closed data up to and including i). */
function buildSignals(candles: Candle[], cfg: StrategyConfig): Signal[] {
  const n = candles.length;
  const signals: Signal[] = new Array(n).fill(0);

  if (cfg.entry === "ema-cross") {
    const closes = candles.map((c) => c.close);
    const fast = emaValues(closes, cfg.emaFast);
    const slow = emaValues(closes, cfg.emaSlow);
    const warmup = Math.max(cfg.emaFast, cfg.emaSlow);
    for (let i = warmup + 1; i < n; i++) {
      if (fast[i - 1] <= slow[i - 1] && fast[i] > slow[i]) signals[i] = 1;
      else if (fast[i - 1] >= slow[i - 1] && fast[i] < slow[i]) signals[i] = -1;
    }
    return signals;
  }

  if (cfg.entry === "rsi-extreme") {
    const rsi = rsiValues(candles, cfg.rsiPeriod);
    const byTime = new Map(rsi.map((p) => [p.time, p.value]));
    let prev: number | undefined;
    for (let i = 0; i < n; i++) {
      const v = byTime.get(candles[i].time);
      if (v === undefined) continue;
      if (prev !== undefined) {
        if (prev < cfg.rsiOversold && v >= cfg.rsiOversold) signals[i] = 1;
        else if (prev > cfg.rsiOverbought && v <= cfg.rsiOverbought) signals[i] = -1;
      }
      prev = v;
    }
    return signals;
  }

  // breakout
  for (let i = cfg.breakoutLookback; i < n; i++) {
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - cfg.breakoutLookback; j < i; j++) {
      hi = Math.max(hi, candles[j].high);
      lo = Math.min(lo, candles[j].low);
    }
    if (candles[i].close > hi) signals[i] = 1;
    else if (candles[i].close < lo) signals[i] = -1;
  }
  return signals;
}

export function runBacktest(
  candles: Candle[],
  meta: Pick<SymbolMeta, "pointValue">,
  cfg: StrategyConfig
): BacktestResult {
  const signals = buildSignals(candles, cfg);
  const trades: BacktestTrade[] = [];
  const pointValue = meta.pointValue * cfg.contracts;
  const commissionPerTrade = cfg.commission * cfg.contracts * 2; // in + out

  let position: { side: "long" | "short"; entryPrice: number; entryTime: number } | null = null;

  const closeTrade = (
    exitPrice: number,
    exitTime: number,
    exitReason: BacktestTrade["exitReason"]
  ) => {
    if (!position) return;
    const points =
      position.side === "long" ? exitPrice - position.entryPrice : position.entryPrice - exitPrice;
    const pnl = points * pointValue - commissionPerTrade;
    trades.push({
      side: position.side,
      entryTime: position.entryTime,
      exitTime,
      entryPrice: position.entryPrice,
      exitPrice,
      points,
      pnl,
      rMultiple: cfg.stopPoints > 0 ? points / cfg.stopPoints : 0,
      exitReason,
    });
    position = null;
  };

  for (let i = 0; i < candles.length; i++) {
    const bar = candles[i];

    // Manage the open position first: stop/target intrabar.
    if (position) {
      const p = position as { side: "long" | "short"; entryPrice: number; entryTime: number };
      const stop =
        p.side === "long" ? p.entryPrice - cfg.stopPoints : p.entryPrice + cfg.stopPoints;
      const target =
        p.side === "long" ? p.entryPrice + cfg.targetPoints : p.entryPrice - cfg.targetPoints;
      const stopHit = p.side === "long" ? bar.low <= stop : bar.high >= stop;
      const targetHit = p.side === "long" ? bar.high >= target : bar.low <= target;

      if (stopHit) {
        closeTrade(stop, bar.time, "stop"); // conservative: stop before target
      } else if (targetHit) {
        closeTrade(target, bar.time, "target");
      } else if (
        signals[i] !== 0 &&
        ((p.side === "long" && signals[i] === -1) || (p.side === "short" && signals[i] === 1))
      ) {
        closeTrade(bar.close, bar.time, "signal");
      }
    }

    // Entries fill at the next bar's open.
    if (!position && i + 1 < candles.length && signals[i] !== 0) {
      const wantLong = signals[i] === 1;
      if (
        (wantLong && cfg.direction !== "short") ||
        (!wantLong && cfg.direction !== "long")
      ) {
        position = {
          side: wantLong ? "long" : "short",
          entryPrice: candles[i + 1].open,
          entryTime: candles[i + 1].time,
        };
      }
    }
  }
  if (position) {
    const last = candles[candles.length - 1];
    closeTrade(last.close, last.time, "end");
  }

  /* ── Metrics ────────────────────────────────────────────────────────────── */

  const equity: EquityPoint[] = [];
  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const t of trades) {
    cumulative += t.pnl;
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative);
    equity.push({ time: t.exitTime, value: cumulative });
  }

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const grossProfit = wins.reduce((a, t) => a + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));

  const mean = trades.length ? cumulative / trades.length : 0;
  const variance = trades.length
    ? trades.reduce((a, t) => a + (t.pnl - mean) ** 2, 0) / trades.length
    : 0;
  const std = Math.sqrt(variance);

  let maxConsecutiveLosses = 0;
  let streak = 0;
  for (const t of trades) {
    streak = t.pnl <= 0 ? streak + 1 : 0;
    maxConsecutiveLosses = Math.max(maxConsecutiveLosses, streak);
  }

  return {
    trades,
    equity,
    netPnl: cumulative,
    grossProfit,
    grossLoss,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    maxDrawdown,
    // Trade-based Sharpe (per-trade PnL mean/std, annualization-free).
    sharpe: std > 0 ? (mean / std) * Math.sqrt(trades.length) : 0,
    expectancyR: trades.length
      ? trades.reduce((a, t) => a + t.rMultiple, 0) / trades.length
      : 0,
    avgWin: wins.length ? grossProfit / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    largestWin: wins.length ? Math.max(...wins.map((t) => t.pnl)) : 0,
    largestLoss: losses.length ? Math.min(...losses.map((t) => t.pnl)) : 0,
    maxConsecutiveLosses,
    totalCommission: trades.length * commissionPerTrade,
  };
}
