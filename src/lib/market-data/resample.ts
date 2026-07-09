import { TIMEFRAMES, type Candle, type Timeframe } from "./types";

/**
 * Multi-timeframe resampling engine.
 *
 * Aggregates fine-grained candles (ticks bucketed to 1s, or any base bars)
 * into any coarser timeframe. This is the piece a live data integration
 * plugs into: fetch the provider's finest granularity once, then serve every
 * chart timeframe from a single dataset.
 *
 * O(n), allocation-light — comfortable with 100k+ input bars in a request
 * handler or a Web Worker.
 */
export function aggregateCandles(candles: Candle[], targetSeconds: number): Candle[] {
  if (candles.length === 0 || targetSeconds <= 0) return [];

  const out: Candle[] = [];
  let bucket = -1;
  let current: Candle | null = null;

  for (const c of candles) {
    const b = Math.floor(c.time / targetSeconds);
    if (b !== bucket) {
      if (current) out.push(current);
      bucket = b;
      current = {
        time: b * targetSeconds,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      };
    } else if (current) {
      current.high = Math.max(current.high, c.high);
      current.low = Math.min(current.low, c.low);
      current.close = c.close;
      current.volume += c.volume;
    }
  }
  if (current) out.push(current);
  return out;
}

/** Convenience: resample to a named timeframe. */
export function resampleTo(candles: Candle[], timeframe: Timeframe): Candle[] {
  const seconds = TIMEFRAMES.find((t) => t.value === timeframe)?.seconds ?? 300;
  return aggregateCandles(candles, seconds);
}
