/**
 * Market data entry point.
 *
 * Symbols route per asset class: crypto is served live from Binance's public
 * data API; everything else uses the deterministic mock until a paid provider
 * (Polygon, Databento, …) is configured. Server code should prefer the async
 * `getCandlesAsync` / `getQuotesAsync` wrappers — they pick the live feed per
 * symbol and always fall back to the mock on feed errors.
 */
import { getCryptoCandles, getCryptoQuote, isLiveCrypto } from "./live-crypto";
import { mockProvider } from "./mock-provider";
import type { Candle, MarketDataProvider, Quote, Timeframe } from "./types";

export const marketData: MarketDataProvider = mockProvider;

export async function getCandlesAsync(
  symbol: string,
  timeframe: Timeframe,
  count: number
): Promise<{ candles: Candle[]; live: boolean }> {
  if (isLiveCrypto(symbol)) {
    try {
      const candles = await getCryptoCandles(symbol, timeframe, count);
      if (candles.length > 0) return { candles, live: true };
    } catch (error) {
      console.error(`[market-data] live feed failed for ${symbol}, using mock:`, error);
    }
  }
  return { candles: mockProvider.getCandles(symbol, timeframe, count), live: false };
}

export async function getQuotesAsync(symbols: string[]): Promise<Quote[]> {
  return Promise.all(
    symbols.map(async (s) => {
      if (isLiveCrypto(s)) {
        try {
          return await getCryptoQuote(s);
        } catch (error) {
          console.error(`[market-data] live quote failed for ${s}, using mock:`, error);
        }
      }
      return mockProvider.getQuote(s);
    })
  );
}

export { isLiveCrypto } from "./live-crypto";
export * from "./types";
export { FUTURES_SYMBOLS, DEFAULT_WATCHLIST } from "./symbols";
export { aggregateCandles, resampleTo } from "./resample";
