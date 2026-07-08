import { FUTURES_SYMBOLS } from "./symbols";
import {
  TIMEFRAMES,
  type Candle,
  type MarketDataProvider,
  type Quote,
  type SymbolMeta,
  type Timeframe,
} from "./types";

/**
 * Deterministic mock market data.
 *
 * Prices are generated with a seeded random walk anchored to wall-clock time
 * buckets, so:
 *  - the same request always returns the same series (SSR/CSR consistent),
 *  - the series naturally "advances" as real time passes,
 *  - symbols keep their character (NQ is fast, ES is steady, GC drifts).
 *
 * Swap this file's export in `index.ts` for a live implementation later.
 */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSymbol(symbol: string): number {
  let h = 2166136261;
  for (let i = 0; i < symbol.length; i++) {
    h ^= symbol.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function tfSeconds(tf: Timeframe): number {
  return TIMEFRAMES.find((t) => t.value === tf)?.seconds ?? 300;
}

function roundToTick(value: number, tickSize: number, decimals: number): number {
  return Number((Math.round(value / tickSize) * tickSize).toFixed(decimals));
}

/**
 * Deterministic per-bar pseudo-random value in [0,1) derived from
 * (symbol, timeframe, bucketIndex) — the walk is stateless and can be
 * evaluated for any window of history.
 */
function barNoise(symbolHash: number, tfSecs: number, bucket: number): () => number {
  return mulberry32((symbolHash ^ (tfSecs * 2654435761) ^ (bucket * 40503)) >>> 0);
}

function generateCandle(meta: SymbolMeta, tf: Timeframe, bucket: number): Candle {
  const secs = tfSeconds(tf);
  const symbolHash = hashSymbol(meta.symbol);
  const rnd = barNoise(symbolHash, secs, bucket);

  // Price level: base + slow sinusoidal regime + accumulated per-bucket drift.
  // Using deterministic trig of the bucket keeps it stateless.
  const regime =
    Math.sin(bucket / 97) * meta.volatility * 14 +
    Math.sin(bucket / 29) * meta.volatility * 6 +
    Math.cos(bucket / 11) * meta.volatility * 2.5;
  const level = meta.basePrice + regime;

  const dir = rnd() - 0.5;
  const range = (0.4 + rnd() * 1.4) * meta.volatility;
  const open = level + (rnd() - 0.5) * meta.volatility * 0.9;
  const close = open + dir * range;
  const high = Math.max(open, close) + rnd() * range * 0.45;
  const low = Math.min(open, close) - rnd() * range * 0.45;
  const volume = Math.floor(500 + rnd() * 4500 * (1 + Math.abs(dir) * 2));

  return {
    time: bucket * secs,
    open: roundToTick(open, meta.tickSize, meta.decimals),
    high: roundToTick(high, meta.tickSize, meta.decimals),
    low: roundToTick(low, meta.tickSize, meta.decimals),
    close: roundToTick(close, meta.tickSize, meta.decimals),
    volume,
  };
}

class MockMarketDataProvider implements MarketDataProvider {
  getSymbols(): SymbolMeta[] {
    return FUTURES_SYMBOLS;
  }

  getSymbol(symbol: string): SymbolMeta | undefined {
    return FUTURES_SYMBOLS.find((s) => s.symbol === symbol.toUpperCase());
  }

  getCandles(symbol: string, timeframe: Timeframe, count: number): Candle[] {
    const meta = this.getSymbol(symbol);
    if (!meta) return [];
    const secs = tfSeconds(timeframe);
    const currentBucket = Math.floor(Date.now() / 1000 / secs);
    const candles: Candle[] = [];
    for (let i = count - 1; i >= 0; i--) {
      candles.push(generateCandle(meta, timeframe, currentBucket - i));
    }
    return candles;
  }

  getQuote(symbol: string): Quote {
    const meta = this.getSymbol(symbol);
    if (!meta) {
      return {
        symbol,
        last: 0,
        change: 0,
        changePercent: 0,
        bid: 0,
        ask: 0,
        volume: 0,
        updatedAt: Date.now(),
      };
    }
    // Last = close of the current 1m bar, plus intra-bar oscillation.
    const secs = 60;
    const bucket = Math.floor(Date.now() / 1000 / secs);
    const bar = generateCandle(meta, "1m", bucket);
    const sessionOpenBar = generateCandle(meta, "1d", Math.floor(Date.now() / 1000 / 86400));
    const phase = (Date.now() / 1000) % secs;
    const wobble = Math.sin(phase * 0.7 + bucket) * meta.volatility * 0.18;
    const last = roundToTick(bar.close + wobble, meta.tickSize, meta.decimals);
    const change = Number((last - sessionOpenBar.open).toFixed(meta.decimals));

    return {
      symbol: meta.symbol,
      last,
      change,
      changePercent: Number(((change / sessionOpenBar.open) * 100).toFixed(2)),
      bid: roundToTick(last - meta.tickSize, meta.tickSize, meta.decimals),
      ask: roundToTick(last + meta.tickSize, meta.tickSize, meta.decimals),
      volume: 120_000 + Math.floor((hashSymbol(meta.symbol) % 900) * 100 + bar.volume * 40),
      updatedAt: Date.now(),
    };
  }

  getQuotes(symbols: string[]): Quote[] {
    return symbols.map((s) => this.getQuote(s));
  }
}

export const mockProvider = new MockMarketDataProvider();
