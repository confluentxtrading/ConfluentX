import type { Candle, Timeframe } from "./types";

/**
 * StreamingService — real-time kline stream over Binance's public market-data
 * WebSocket (keyless). Crypto only: futures/stocks/FX streaming requires a
 * licensed provider (Databento/Polygon) and is intentionally not faked.
 *
 * Client-side. Handles: automatic reconnect with exponential backoff,
 * a 60s watchdog (Binance pings regularly — silence means a dead socket),
 * and clean teardown for symbol/timeframe switching.
 */

const STREAM_BASE = "wss://data-stream.binance.vision/ws";

const STREAM_PAIRS: Record<string, string> = {
  BTC: "btcusdt",
  ETH: "ethusdt",
};

const STREAM_INTERVALS: Partial<Record<Timeframe, string>> = {
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

export function canStream(symbol: string, timeframe: Timeframe): boolean {
  return symbol.toUpperCase() in STREAM_PAIRS && timeframe in STREAM_INTERVALS;
}

export interface LiveBar extends Candle {
  /** True when the bar just closed — consumers re-sync indicators on this. */
  closed: boolean;
}

interface KlineMessage {
  k?: {
    t: number;
    o: string;
    h: string;
    l: string;
    c: string;
    v: string;
    x: boolean;
  };
}

/** Subscribe to live bars. Returns an unsubscribe function. */
export function subscribeKline(
  symbol: string,
  timeframe: Timeframe,
  onBar: (bar: LiveBar) => void
): () => void {
  const pair = STREAM_PAIRS[symbol.toUpperCase()];
  const interval = STREAM_INTERVALS[timeframe];
  if (!pair || !interval) return () => {};

  const url = `${STREAM_BASE}/${pair}@kline_${interval}`;
  let ws: WebSocket | null = null;
  let stopped = false;
  let retries = 0;
  let watchdog: ReturnType<typeof setTimeout> | undefined;

  const armWatchdog = () => {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => ws?.close(), 60_000);
  };

  const connect = () => {
    if (stopped) return;
    ws = new WebSocket(url);

    ws.onopen = () => {
      retries = 0;
      armWatchdog();
    };

    ws.onmessage = (event) => {
      armWatchdog();
      let msg: KlineMessage;
      try {
        msg = JSON.parse(event.data as string) as KlineMessage;
      } catch {
        return;
      }
      const k = msg.k;
      if (!k) return;
      const bar: LiveBar = {
        time: Math.floor(k.t / 1000),
        open: Number(k.o),
        high: Number(k.h),
        low: Number(k.l),
        close: Number(k.c),
        volume: Number(k.v),
        closed: k.x,
      };
      if (
        Number.isFinite(bar.open) &&
        Number.isFinite(bar.close) &&
        bar.high >= bar.low
      ) {
        onBar(bar);
      }
    };

    ws.onclose = () => {
      clearTimeout(watchdog);
      if (!stopped) {
        const delay = Math.min(15_000, 500 * 2 ** retries++);
        setTimeout(connect, delay);
      }
    };

    ws.onerror = () => ws?.close();
  };

  connect();

  return () => {
    stopped = true;
    clearTimeout(watchdog);
    ws?.close();
  };
}
