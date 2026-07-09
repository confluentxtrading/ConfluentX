import { aggregateCandles } from "./resample";
import type { Candle, Quote, Timeframe } from "./types";

/**
 * Live crypto datafeed — Binance public market-data API.
 *
 * `data-api.binance.vision` is Binance's official keyless, market-data-only
 * host (no account, no geo-block on data). Real OHLCV for the crypto
 * symbols; other asset classes stay on the mock until a paid provider
 * (Polygon, Databento, …) is configured.
 */

const BASE = process.env.BINANCE_DATA_API ?? "https://data-api.binance.vision";

const CRYPTO_PAIRS: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
};

export function isLiveCrypto(symbol: string): boolean {
  return symbol.toUpperCase() in CRYPTO_PAIRS;
}

/** Binance kline interval per timeframe; missing ones are resampled. */
const INTERVAL_MAP: Partial<Record<Timeframe, string>> = {
  "1s": "1s",
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
  "1w": "1w",
  "1mo": "1M",
};

type RawKline = [number, string, string, string, string, string, ...unknown[]];

async function fetchKlines(
  pair: string,
  interval: string,
  limit: number,
  endTime?: number
): Promise<Candle[]> {
  const params = new URLSearchParams({
    symbol: pair,
    interval,
    limit: String(Math.min(1000, limit)),
  });
  if (endTime) params.set("endTime", String(endTime));
  const res = await fetch(`${BASE}/api/v3/klines?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Binance klines ${res.status}`);
  const raw = (await res.json()) as RawKline[];
  return raw.map((k) => ({
    time: Math.floor(k[0] / 1000),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

/** Fetch `count` bars, paginating backwards past Binance's 1000/request cap. */
async function fetchPaginated(pair: string, interval: string, count: number): Promise<Candle[]> {
  const out: Candle[] = [];
  let endTime: number | undefined;
  for (let i = 0; i < 5 && out.length < count; i++) {
    const batch = await fetchKlines(pair, interval, count - out.length, endTime);
    if (batch.length === 0) break;
    out.unshift(...batch);
    endTime = batch[0].time * 1000 - 1;
    if (batch.length < 1000) break;
  }
  return out.slice(-count);
}

export async function getCryptoCandles(
  symbol: string,
  timeframe: Timeframe,
  count: number
): Promise<Candle[]> {
  const pair = CRYPTO_PAIRS[symbol.toUpperCase()];
  if (!pair) return [];

  if (timeframe === "10s" || timeframe === "30s") {
    const target = timeframe === "10s" ? 10 : 30;
    const raw = await fetchPaginated(pair, "1s", Math.min(count * target, 5000));
    return aggregateCandles(raw, target).slice(-count);
  }
  if (timeframe === "1y") {
    const months = await fetchPaginated(pair, "1M", 1000);
    return aggregateCandles(months, 31557600).slice(-count);
  }
  const interval = INTERVAL_MAP[timeframe];
  if (!interval) return [];
  return fetchPaginated(pair, interval, count);
}

interface Ticker24h {
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  bidPrice: string;
  askPrice: string;
  volume: string;
}

export async function getCryptoQuote(symbol: string): Promise<Quote> {
  const pair = CRYPTO_PAIRS[symbol.toUpperCase()];
  const res = await fetch(`${BASE}/api/v3/ticker/24hr?symbol=${pair}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Binance ticker ${res.status}`);
  const t = (await res.json()) as Ticker24h;
  return {
    symbol: symbol.toUpperCase(),
    last: Number(t.lastPrice),
    change: Number(t.priceChange),
    changePercent: Number(t.priceChangePercent),
    bid: Number(t.bidPrice),
    ask: Number(t.askPrice),
    volume: Math.round(Number(t.volume)),
    updatedAt: Date.now(),
  };
}
