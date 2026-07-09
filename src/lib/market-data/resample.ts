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
const WEEK = 604800;
const MONTH_APPROX = 2629800;
const YEAR_APPROX = 31557600;

/**
 * Bucket id for a timestamp. Fixed intervals use flat division; calendar
 * intervals (week/month/year) must align to real calendar boundaries —
 * flat division would start weeks on Thursday (the epoch's weekday) and
 * drift months/years.
 */
function bucketFor(time: number, targetSeconds: number): number {
  if (targetSeconds === WEEK) {
    // Align to Monday 00:00 UTC. Epoch (Jan 1 1970) was a Thursday: shift 3 days.
    return Math.floor((time + 3 * 86400) / WEEK);
  }
  if (targetSeconds === MONTH_APPROX || targetSeconds === YEAR_APPROX) {
    const d = new Date(time * 1000);
    return targetSeconds === MONTH_APPROX
      ? d.getUTCFullYear() * 12 + d.getUTCMonth()
      : d.getUTCFullYear();
  }
  return Math.floor(time / targetSeconds);
}

/** Canonical open-time for a bucket id (inverse of bucketFor). */
function bucketStart(bucket: number, targetSeconds: number): number {
  if (targetSeconds === WEEK) return bucket * WEEK - 3 * 86400;
  if (targetSeconds === MONTH_APPROX) {
    return Date.UTC(Math.floor(bucket / 12), bucket % 12, 1) / 1000;
  }
  if (targetSeconds === YEAR_APPROX) return Date.UTC(bucket, 0, 1) / 1000;
  return bucket * targetSeconds;
}

export function aggregateCandles(candles: Candle[], targetSeconds: number): Candle[] {
  if (candles.length === 0 || targetSeconds <= 0) return [];

  const out: Candle[] = [];
  let bucket = Number.NaN;
  let current: Candle | null = null;

  for (const c of candles) {
    const b = bucketFor(c.time, targetSeconds);
    if (b !== bucket) {
      if (current) out.push(current);
      bucket = b;
      current = {
        time: bucketStart(b, targetSeconds),
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
