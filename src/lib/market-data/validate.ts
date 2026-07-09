import type { Candle } from "./types";

/**
 * ValidationService — every candle from a live feed passes through here
 * before reaching a chart or engine.
 *
 * Guarantees on output: finite numbers, high ≥ max(o,c), low ≤ min(o,c),
 * volume ≥ 0, strictly increasing unique timestamps.
 */

export interface ValidationReport {
  input: number;
  output: number;
  droppedInvalid: number;
  droppedDuplicates: number;
  reordered: boolean;
}

function isValidCandle(c: Candle): boolean {
  return (
    Number.isFinite(c.time) &&
    c.time > 0 &&
    Number.isFinite(c.open) &&
    Number.isFinite(c.high) &&
    Number.isFinite(c.low) &&
    Number.isFinite(c.close) &&
    Number.isFinite(c.volume) &&
    c.high >= c.low &&
    c.high >= Math.max(c.open, c.close) - 1e-9 &&
    c.low <= Math.min(c.open, c.close) + 1e-9 &&
    c.volume >= 0
  );
}

export function validateCandles(
  candles: Candle[]
): { candles: Candle[]; report: ValidationReport } {
  const input = candles.length;

  const valid = candles.filter(isValidCandle);
  const droppedInvalid = input - valid.length;

  let reordered = false;
  for (let i = 1; i < valid.length; i++) {
    if (valid[i].time < valid[i - 1].time) {
      reordered = true;
      valid.sort((a, b) => a.time - b.time);
      break;
    }
  }

  // Dedupe by timestamp — last write wins (later record is the corrected one).
  let droppedDuplicates = 0;
  const out: Candle[] = [];
  for (const c of valid) {
    const prev = out[out.length - 1];
    if (prev && prev.time === c.time) {
      out[out.length - 1] = c;
      droppedDuplicates++;
    } else {
      out.push(c);
    }
  }

  return {
    candles: out,
    report: { input, output: out.length, droppedInvalid, droppedDuplicates, reordered },
  };
}

/**
 * Gap detection: timestamps missing from a fixed-interval series. Calendar
 * timeframes (1w/1mo/1y) and session-based markets legitimately skip
 * intervals (weekends, halts), so this reports rather than rejects.
 */
export function detectGaps(candles: Candle[], intervalSeconds: number): number {
  let gaps = 0;
  for (let i = 1; i < candles.length; i++) {
    const delta = candles[i].time - candles[i - 1].time;
    if (delta > intervalSeconds) gaps += Math.floor(delta / intervalSeconds) - 1;
  }
  return gaps;
}
