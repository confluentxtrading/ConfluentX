import { aggregateCandles } from "./resample";
import type { Candle, Timeframe } from "./types";

/**
 * Professional CME futures datafeed — Databento historical API.
 *
 * DORMANT until `DATABENTO_API_KEY` is set (no key → callers fall through to
 * the Yahoo/mock chain). Continuous front-month contracts (`ES.c.0`, …) from
 * the CME Globex MDP 3.0 dataset.
 *
 * ⚠ First-run verification (this module was written without live
 * credentials): confirm price scaling (Databento OHLCV prices are documented
 * as 1e-9 fixed-point integers), timestamp units (ns), and JSON field names
 * against a real response before trusting it in production.
 */

const HIST_BASE = "https://hist.databento.com/v0/timeseries.get_range";
const DATASET = process.env.DATABENTO_DATASET ?? "GLBX.MDP3";

const DATABENTO_SYMBOLS: Record<string, string> = {
  ES: "ES.c.0",
  NQ: "NQ.c.0",
  YM: "YM.c.0",
  RTY: "RTY.c.0",
  CL: "CL.c.0",
  GC: "GC.c.0",
  MES: "MES.c.0",
  MNQ: "MNQ.c.0",
};

export function hasDatabentoKey(): boolean {
  return Boolean(process.env.DATABENTO_API_KEY);
}

export function isDatabentoSymbol(symbol: string): boolean {
  return symbol.toUpperCase() in DATABENTO_SYMBOLS;
}

/** Base schema per timeframe; coarser frames resample from these. */
const SCHEMA_MAP: Partial<
  Record<Timeframe, { schema: string; baseSeconds: number; resampleTo?: number }>
> = {
  "1s": { schema: "ohlcv-1s", baseSeconds: 1 },
  "10s": { schema: "ohlcv-1s", baseSeconds: 1, resampleTo: 10 },
  "30s": { schema: "ohlcv-1s", baseSeconds: 1, resampleTo: 30 },
  "1m": { schema: "ohlcv-1m", baseSeconds: 60 },
  "5m": { schema: "ohlcv-1m", baseSeconds: 60, resampleTo: 300 },
  "15m": { schema: "ohlcv-1m", baseSeconds: 60, resampleTo: 900 },
  "1h": { schema: "ohlcv-1h", baseSeconds: 3600 },
  "4h": { schema: "ohlcv-1h", baseSeconds: 3600, resampleTo: 14400 },
  "1d": { schema: "ohlcv-1d", baseSeconds: 86400 },
  "1w": { schema: "ohlcv-1d", baseSeconds: 86400, resampleTo: 604800 },
  "1mo": { schema: "ohlcv-1d", baseSeconds: 86400, resampleTo: 2629800 },
  "1y": { schema: "ohlcv-1d", baseSeconds: 86400, resampleTo: 31557600 },
};

/** Fixed-point 1e-9 price → float; tolerant of string-encoded int64. */
function scalePrice(value: number | string): number {
  return Number(value) / 1e9;
}

interface DbnOhlcvRecord {
  hd?: { ts_event?: number | string };
  ts_event?: number | string;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume: number | string;
}

export async function getDatabentoCandles(
  symbol: string,
  timeframe: Timeframe,
  count: number
): Promise<Candle[]> {
  const key = process.env.DATABENTO_API_KEY;
  const dbSymbol = DATABENTO_SYMBOLS[symbol.toUpperCase()];
  const spec = SCHEMA_MAP[timeframe];
  if (!key || !dbSymbol || !spec) return [];

  // Window sizing: base bars needed × 1.7 buffer for weekends/halts.
  const baseBarsNeeded = spec.resampleTo
    ? Math.ceil((count * spec.resampleTo) / spec.baseSeconds)
    : count;
  const spanSeconds = Math.min(
    baseBarsNeeded * spec.baseSeconds * 1.7,
    5 * 365 * 86400 // hard cap: 5 years per request
  );
  const end = new Date();
  const start = new Date(end.getTime() - spanSeconds * 1000);

  const params = new URLSearchParams({
    dataset: DATASET,
    symbols: dbSymbol,
    stype_in: "continuous",
    schema: spec.schema,
    start: start.toISOString(),
    end: end.toISOString(),
    encoding: "json",
  });

  const res = await fetch(`${HIST_BASE}?${params}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Databento ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  // encoding=json returns newline-delimited JSON records.
  const text = await res.text();
  const candles: Candle[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let rec: DbnOhlcvRecord;
    try {
      rec = JSON.parse(line) as DbnOhlcvRecord;
    } catch {
      continue;
    }
    const tsRaw = rec.hd?.ts_event ?? rec.ts_event;
    if (tsRaw === undefined) continue;
    const time = Math.floor(Number(tsRaw) / 1e9); // ns → s
    const candle: Candle = {
      time,
      open: scalePrice(rec.open),
      high: scalePrice(rec.high),
      low: scalePrice(rec.low),
      close: scalePrice(rec.close),
      volume: Number(rec.volume),
    };
    if (Number.isFinite(candle.time) && Number.isFinite(candle.close)) {
      candles.push(candle);
    }
  }

  const out = spec.resampleTo ? aggregateCandles(candles, spec.resampleTo) : candles;
  return out.slice(-count);
}
