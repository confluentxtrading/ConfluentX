/**
 * Market data contracts.
 *
 * Everything in the app consumes `MarketDataProvider` — the mock
 * implementation can be replaced with a live feed (CME via a broker API,
 * Databento, dxFeed, …) without touching any UI code.
 */

export type Timeframe =
  | "1s"
  | "10s"
  | "30s"
  | "1m"
  | "5m"
  | "15m"
  | "1h"
  | "4h"
  | "1d"
  | "1w"
  | "1mo"
  | "1y";

export const TIMEFRAME_VALUES = [
  "1s",
  "10s",
  "30s",
  "1m",
  "5m",
  "15m",
  "1h",
  "4h",
  "1d",
  "1w",
  "1mo",
  "1y",
] as const;

export const TIMEFRAMES: { value: Timeframe; label: string; seconds: number }[] = [
  { value: "1s", label: "1s", seconds: 1 },
  { value: "10s", label: "10s", seconds: 10 },
  { value: "30s", label: "30s", seconds: 30 },
  { value: "1m", label: "1m", seconds: 60 },
  { value: "5m", label: "5m", seconds: 300 },
  { value: "15m", label: "15m", seconds: 900 },
  { value: "1h", label: "1H", seconds: 3600 },
  { value: "4h", label: "4H", seconds: 14400 },
  { value: "1d", label: "1D", seconds: 86400 },
  { value: "1w", label: "1W", seconds: 604800 },
  { value: "1mo", label: "1Mo", seconds: 2629800 },
  { value: "1y", label: "1Y", seconds: 31557600 },
];

export interface Candle {
  /** Unix seconds (UTC) — matches lightweight-charts' expectations. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  symbol: string;
  last: number;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
  volume: number;
  updatedAt: number;
}

export interface SymbolMeta {
  symbol: string;
  name: string;
  exchange: string;
  category: "index" | "energy" | "metals" | "crypto" | "fx" | "equity";
  tickSize: number;
  tickValue: number;
  pointValue: number;
  decimals: number;
  /** Anchor price for the mock generator. */
  basePrice: number;
  /** Per-bar volatility for the mock generator (in points). */
  volatility: number;
}

export interface MarketDataProvider {
  getSymbols(): SymbolMeta[];
  getSymbol(symbol: string): SymbolMeta | undefined;
  getCandles(symbol: string, timeframe: Timeframe, count: number): Candle[];
  getQuote(symbol: string): Quote;
  getQuotes(symbols: string[]): Quote[];
}
