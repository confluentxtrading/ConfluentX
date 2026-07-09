import type { BacktestTrade } from "./engine";

/**
 * Bootstrap Monte Carlo over a backtest's trade P&Ls.
 *
 * Resamples the trade distribution with replacement `runs` times to show the
 * spread of outcomes the same edge could have produced in a different order —
 * the honest answer to "was this equity curve luck?".
 */
export interface MonteCarloResult {
  runs: number;
  p5: number;
  p25: number;
  median: number;
  p75: number;
  p95: number;
  /** % of runs whose equity ever dropped `ruinDrawdownPct` below start. */
  riskOfRuinPct: number;
  ruinDrawdownPct: number;
}

export function monteCarlo(
  trades: BacktestTrade[],
  startBalance: number,
  runs = 1000,
  ruinDrawdownPct = 25
): MonteCarloResult | null {
  if (trades.length < 5) return null;

  const pnls = trades.map((t) => t.pnl);
  const n = pnls.length;
  const ruinFloor = startBalance * (1 - ruinDrawdownPct / 100);
  const endings: number[] = new Array(runs);
  let ruined = 0;

  for (let r = 0; r < runs; r++) {
    let equity = startBalance;
    let hitRuin = false;
    for (let i = 0; i < n; i++) {
      equity += pnls[(Math.random() * n) | 0];
      if (equity <= ruinFloor) hitRuin = true;
    }
    endings[r] = equity;
    if (hitRuin) ruined++;
  }

  endings.sort((a, b) => a - b);
  const q = (p: number) => endings[Math.min(runs - 1, Math.floor(p * runs))];

  return {
    runs,
    p5: q(0.05),
    p25: q(0.25),
    median: q(0.5),
    p75: q(0.75),
    p95: q(0.95),
    riskOfRuinPct: (ruined / runs) * 100,
    ruinDrawdownPct,
  };
}
