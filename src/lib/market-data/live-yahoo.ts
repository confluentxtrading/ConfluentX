import { aggregateCandles } from "./resample";
import type { Candle, Quote, Timeframe } from "./types";

/**
 * Live futures / FX / equities datafeed — Yahoo Finance public chart API.
 *
 * Real (≈15-minute delayed) OHLCV for CME continuous futures (ES=F, NQ=F, …),
 * forex pairs, and stocks, with no API key. Unofficial endpoint: fine for a
 * personal simulator, NOT a licensed source to build a commercial product
 * on — that's what Databento/Polygon subscriptions are for. Every failure
 * falls back to the mock provider upstream.
 *
 * No sub-minute granularity here (Yahoo's floor is 1m); 1s/10s/30s requests
 * return [] so the caller falls back to mock for those.
 */

const BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const UA = { "User-Agent": "Mozilla/5.0 (compatible; ConfluentX/1.0)" };

const YAHOO_SYMBOLS: Record<string, string> = {
  NQ: "NQ=F",
  ES: "ES=F",
  MNQ: "MNQ=F",
  MES: "MES=F",
  YM: "YM=F",
  RTY: "RTY=F",
  CL: "CL=F",
  GC: "GC=F",
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  AAPL: "AAPL",
  TSLA: "TSLA",
};

export function isLiveYahoo(symbol: string): boolean {
  return symbol.toUpperCase() in YAHOO_SYMBOLS;
}

/** Yahoo interval + widest allowed range, per timeframe. */
const INTERVAL_MAP: Partial<
  Record<Timeframe, { interval: string; range: string; resampleTo?: number }>
> = {
  "1m": { interval: "1m", range: "7d" },
  "5m": { interval: "5m", range: "60d" },
  "15m": { interval: "15m", range: "60d" },
  "1h": { interval: "60m", range: "730d" },
  "4h": { interval: "60m", range: "730d", resampleTo: 14400 },
  "1d": { interval: "1d", range: "10y" },
  "1w": { interval: "1wk", range: "max" },
  "1mo": { interval: "1mo", range: "max" },
  "1y": { interval: "1mo", range: "max", resampleTo: 31557600 },
};

interface YahooChart {
  chart: {
    result?: {
      meta: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        regularMarketVolume?: number;
      };
      timestamp?: number[];
      indicators: {
        quote: {
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
          volume: (number | null)[];
        }[];
      };
    }[];
    error?: unknown;
  };
}

async function fetchChart(
  yahooSymbol: string,
  interval: string,
  range: string
): Promise<YahooChart["chart"]["result"]> {
  const url = `${BASE}/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, { headers: UA, cache: "no-store" });
  if (!res.ok) throw new Error(`Yahoo chart ${res.status}`);
  const data = (await res.json()) as YahooChart;
  return data.chart.result;
}

export async function getYahooCandles(
  symbol: string,
  timeframe: Timeframe,
  count: number
): Promise<Candle[]> {
  const yahooSymbol = YAHOO_SYMBOLS[symbol.toUpperCase()];
  const spec = INTERVAL_MAP[timeframe];
  if (!yahooSymbol || !spec) return [];

  const result = await fetchChart(yahooSymbol, spec.interval, spec.range);
  const r = result?.[0];
  const times = r?.timestamp;
  const q = r?.indicators.quote[0];
  if (!times || !q) return [];

  const candles: Candle[] = [];
  for (let i = 0; i < times.length; i++) {
    const { open, high, low, close, volume } = {
      open: q.open[i],
      high: q.high[i],
      low: q.low[i],
      close: q.close[i],
      volume: q.volume[i],
    };
    if (open === null || high === null || low === null || close === null) continue;
    candles.push({ time: times[i], open, high, low, close, volume: volume ?? 0 });
  }

  const out = spec.resampleTo ? aggregateCandles(candles, spec.resampleTo) : candles;
  return out.slice(-count);
}

/* Quotes piggyback on the 1m chart call; cached briefly to stay polite. */
const quoteCache = new Map<string, { quote: Quote; at: number }>();
const QUOTE_TTL_MS = 10_000;

export async function getYahooQuote(symbol: string): Promise<Quote> {
  const key = symbol.toUpperCase();
  const cached = quoteCache.get(key);
  if (cached && Date.now() - cached.at < QUOTE_TTL_MS) return cached.quote;

  const yahooSymbol = YAHOO_SYMBOLS[key];
  const result = await fetchChart(yahooSymbol, "1m", "1d");
  const meta = result?.[0]?.meta;
  const last = meta?.regularMarketPrice;
  if (last === undefined) throw new Error("Yahoo quote missing price");
  const prev = meta?.chartPreviousClose ?? last;
  const change = last - prev;

  const quote: Quote = {
    symbol: key,
    last,
    change,
    changePercent: prev !== 0 ? (change / prev) * 100 : 0,
    bid: last,
    ask: last,
    volume: meta?.regularMarketVolume ?? 0,
    updatedAt: Date.now(),
  };
  quoteCache.set(key, { quote, at: Date.now() });
  return quote;
}
