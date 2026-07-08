import { emaValues, rsiValues } from "@/lib/indicators";
import type { Candle, SymbolMeta } from "@/lib/market-data";

/**
 * Client-side strategy simulation over historical candles.
 *
 * Deliberately conservative fills:
 *  - entries happen at the NEXT bar's open after a signal, plus slippage
 *  - if a bar touches both the stop and the target, the stop fills first
 *  - stop/signal/end exits pay slippage; target exits are treated as limit
 *    orders and fill at price
 */

export type EntryRule = "ema-cross" | "rsi-extreme" | "breakout";
export type Direction = "long" | "short" | "both";
export type RiskMode = "fixed" | "percent";

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
  /** trailing stop distance in points; 0 disables trailing */
  trailingPoints: number;
  /** slippage per fill, in points */
  slippagePoints: number;
  /** position sizing */
  riskMode: RiskMode;
  contracts: number;
  startBalance: number;
  /** % of current balance risked per trade (riskMode "percent") */
  riskPercent: number;
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
  trailingPoints: 0,
  slippagePoints: 0.5,
  riskMode: "fixed",
  contracts: 1,
  startBalance: 100_000,
  riskPercent: 1,
  commission: 2.5,
};

export interface BacktestTrade {
  side: "long" | "short";
  contracts: number;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  points: number;
  pnl: number;
  rMultiple: number;
  exitReason: "stop" | "trail" | "target" | "signal" | "end";
}

export interface EquityPoint {
  time: number;
  value: number;
}

export interface BacktestResult {
  trades: BacktestTrade[];
  /** Absolute account equity (startBalance + cumulative P&L). */
  equity: EquityPoint[];
  startBalance: number;
  endBalance: number;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
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

  // breakout — rolling extrema via monotonic deques, O(n) even at 10k bars.
  const lb = cfg.breakoutLookback;
  const hiDeque: number[] = [];
  const loDeque: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i >= lb) {
      const hi = candles[hiDeque[0]].high;
      const lo = candles[loDeque[0]].low;
      if (candles[i].close > hi) signals[i] = 1;
      else if (candles[i].close < lo) signals[i] = -1;
    }
    while (hiDeque.length && candles[hiDeque[hiDeque.length - 1]].high <= candles[i].high)
      hiDeque.pop();
    hiDeque.push(i);
    while (loDeque.length && candles[loDeque[loDeque.length - 1]].low >= candles[i].low)
      loDeque.pop();
    loDeque.push(i);
    while (hiDeque[0] <= i - lb) hiDeque.shift();
    while (loDeque[0] <= i - lb) loDeque.shift();
  }
  return signals;
}

interface OpenPosition {
  side: "long" | "short";
  contracts: number;
  entryPrice: number;
  entryTime: number;
  stopLevel: number;
  initialStop: number;
  best: number;
}

export function runBacktest(
  candles: Candle[],
  meta: Pick<SymbolMeta, "pointValue">,
  cfg: StrategyConfig
): BacktestResult {
  const signals = buildSignals(candles, cfg);
  const trades: BacktestTrade[] = [];
  const slip = cfg.slippagePoints;

  let balance = cfg.startBalance;
  let position: OpenPosition | null = null;

  const sizeFor = (): number => {
    if (cfg.riskMode === "fixed") return cfg.contracts;
    const riskDollars = balance * (cfg.riskPercent / 100);
    const perContract = cfg.stopPoints * meta.pointValue;
    return perContract > 0 ? Math.floor(riskDollars / perContract) : 0;
  };

  const closeTrade = (
    rawExit: number,
    exitTime: number,
    exitReason: BacktestTrade["exitReason"]
  ) => {
    if (!position) return;
    const paysSlippage = exitReason !== "target";
    const exitPrice =
      position.side === "long"
        ? rawExit - (paysSlippage ? slip : 0)
        : rawExit + (paysSlippage ? slip : 0);
    const points =
      position.side === "long" ? exitPrice - position.entryPrice : position.entryPrice - exitPrice;
    const pnl =
      points * meta.pointValue * position.contracts -
      cfg.commission * position.contracts * 2;
    balance += pnl;
    trades.push({
      side: position.side,
      contracts: position.contracts,
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

    // Manage the open position first: stop (with trailing ratchet) / target.
    if (position) {
      const p = position as OpenPosition;
      const target =
        p.side === "long" ? p.entryPrice + cfg.targetPoints : p.entryPrice - cfg.targetPoints;
      const stopHit = p.side === "long" ? bar.low <= p.stopLevel : bar.high >= p.stopLevel;
      const targetHit = p.side === "long" ? bar.high >= target : bar.low <= target;

      if (stopHit) {
        const trailed =
          cfg.trailingPoints > 0 &&
          (p.side === "long" ? p.stopLevel > p.initialStop : p.stopLevel < p.initialStop);
        closeTrade(p.stopLevel, bar.time, trailed ? "trail" : "stop"); // stop before target
      } else if (targetHit) {
        closeTrade(target, bar.time, "target");
      } else if (
        signals[i] !== 0 &&
        ((p.side === "long" && signals[i] === -1) || (p.side === "short" && signals[i] === 1))
      ) {
        closeTrade(bar.close, bar.time, "signal");
      } else if (cfg.trailingPoints > 0) {
        // Survived the bar — ratchet the trailing stop off the new extreme.
        if (p.side === "long") {
          p.best = Math.max(p.best, bar.high);
          p.stopLevel = Math.max(p.stopLevel, p.best - cfg.trailingPoints);
        } else {
          p.best = Math.min(p.best, bar.low);
          p.stopLevel = Math.min(p.stopLevel, p.best + cfg.trailingPoints);
        }
      }
    }

    // Entries fill at the next bar's open, plus slippage.
    if (!position && i + 1 < candles.length && signals[i] !== 0) {
      const wantLong = signals[i] === 1;
      if ((wantLong && cfg.direction !== "short") || (!wantLong && cfg.direction !== "long")) {
        const contracts = sizeFor();
        if (contracts > 0) {
          const entryPrice = wantLong
            ? candles[i + 1].open + slip
            : candles[i + 1].open - slip;
          const initialStop = wantLong
            ? entryPrice - cfg.stopPoints
            : entryPrice + cfg.stopPoints;
          position = {
            side: wantLong ? "long" : "short",
            contracts,
            entryPrice,
            entryTime: candles[i + 1].time,
            stopLevel: initialStop,
            initialStop,
            best: entryPrice,
          };
        }
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
  let peakEquity = cfg.startBalance;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;
  for (const t of trades) {
    cumulative += t.pnl;
    const eq = cfg.startBalance + cumulative;
    peakEquity = Math.max(peakEquity, eq);
    const dd = peakEquity - eq;
    maxDrawdown = Math.max(maxDrawdown, dd);
    if (peakEquity > 0) maxDrawdownPct = Math.max(maxDrawdownPct, (dd / peakEquity) * 100);
    equity.push({ time: t.exitTime, value: eq });
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
    startBalance: cfg.startBalance,
    endBalance: cfg.startBalance + cumulative,
    netPnl: cumulative,
    grossProfit,
    grossLoss,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    maxDrawdown,
    maxDrawdownPct,
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
    totalCommission: trades.reduce((a, t) => a + cfg.commission * t.contracts * 2, 0),
  };
}

/** Serialize a result's trade list as CSV for download. */
export function tradesToCsv(result: BacktestResult): string {
  const header =
    "entry_time,exit_time,side,contracts,entry_price,exit_price,points,pnl,r_multiple,exit_reason";
  const rows = result.trades.map((t) =>
    [
      new Date(t.entryTime * 1000).toISOString(),
      new Date(t.exitTime * 1000).toISOString(),
      t.side,
      t.contracts,
      t.entryPrice.toFixed(4),
      t.exitPrice.toFixed(4),
      t.points.toFixed(4),
      t.pnl.toFixed(2),
      t.rMultiple.toFixed(3),
      t.exitReason,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}
