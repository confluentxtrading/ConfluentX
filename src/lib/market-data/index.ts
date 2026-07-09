/**
 * Market data entry point.
 *
 * Symbols route per asset class: crypto is served live from Binance's public
 * data API; everything else uses the deterministic mock until a paid provider
 * (Polygon, Databento, …) is configured. Server code should prefer the async
 * `getCandlesAsync` / `getQuotesAsync` wrappers — they pick the live feed per
 * symbol and always fall back to the mock on feed errors.
 */
import { cacheGet, cacheSet, ttlForTimeframe } from "./cache";
import { getCryptoCandles, getCryptoQuote, isLiveCrypto } from "./live-crypto";
import { getDatabentoCandles, hasDatabentoKey, isDatabentoSymbol } from "./live-databento";
import { getYahooCandles, getYahooQuote, isLiveYahoo } from "./live-yahoo";
import { mockProvider } from "./mock-provider";
import { TIMEFRAMES, type Candle, type MarketDataProvider, type Quote, type Timeframe } from "./types";
import { validateCandles } from "./validate";

export const marketData: MarketDataProvider = mockProvider;

export async function getCandlesAsync(
  symbol: string,
  timeframe: Timeframe,
  count: number
): Promise<{ candles: Candle[]; live: boolean }> {
  const key = `${symbol.toUpperCase()}|${timeframe}|${count}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  try {
    let raw: Candle[] = [];
    if (isLiveCrypto(symbol)) {
      raw = await getCryptoCandles(symbol, timeframe, count);
    } else if (isDatabentoSymbol(symbol) && hasDatabentoKey()) {
      // Professional CME feed — active only when DATABENTO_API_KEY is set.
      try {
        raw = await getDatabentoCandles(symbol, timeframe, count);
      } catch (error) {
        console.error(`[market-data] Databento failed for ${symbol}, trying Yahoo:`, error);
      }
      if (raw.length === 0 && isLiveYahoo(symbol)) {
        raw = await getYahooCandles(symbol, timeframe, count);
      }
    } else if (isLiveYahoo(symbol)) {
      // Yahoo has no sub-minute bars — those fall through to the mock.
      raw = await getYahooCandles(symbol, timeframe, count);
    }
    if (raw.length > 0) {
      const { candles, report } = validateCandles(raw);
      if (report.droppedInvalid > 0 || report.droppedDuplicates > 0 || report.reordered) {
        console.warn(`[market-data] ${symbol} ${timeframe} cleaned:`, report);
      }
      if (candles.length > 0) {
        const tfSecs = TIMEFRAMES.find((t) => t.value === timeframe)?.seconds ?? 300;
        cacheSet(key, candles, true, ttlForTimeframe(tfSecs));
        return { candles, live: true };
      }
    }
  } catch (error) {
    console.error(`[market-data] live feed failed for ${symbol}, using mock:`, error);
  }
  return { candles: mockProvider.getCandles(symbol, timeframe, count), live: false };
}

export async function getQuotesAsync(symbols: string[]): Promise<Quote[]> {
  return Promise.all(
    symbols.map(async (s) => {
      try {
        if (isLiveCrypto(s)) return await getCryptoQuote(s);
        if (isLiveYahoo(s)) return await getYahooQuote(s);
      } catch (error) {
        console.error(`[market-data] live quote failed for ${s}, using mock:`, error);
      }
      return mockProvider.getQuote(s);
    })
  );
}

export { isLiveCrypto } from "./live-crypto";
export * from "./types";
export { FUTURES_SYMBOLS, DEFAULT_WATCHLIST } from "./symbols";
export { aggregateCandles, resampleTo } from "./resample";
