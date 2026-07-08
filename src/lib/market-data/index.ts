/**
 * Market data entry point.
 *
 * To integrate a live feed, implement `MarketDataProvider` (see ./types) and
 * change this single export — every chart, widget, and API route consumes
 * the interface, never a concrete provider.
 */
import { mockProvider } from "./mock-provider";
import type { MarketDataProvider } from "./types";

export const marketData: MarketDataProvider = mockProvider;

export * from "./types";
export { FUTURES_SYMBOLS, DEFAULT_WATCHLIST } from "./symbols";
