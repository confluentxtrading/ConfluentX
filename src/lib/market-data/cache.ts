import type { Candle } from "./types";

/**
 * CacheService — small in-memory TTL cache for historical candle requests.
 *
 * Purpose: charts poll every 30s and multi-chart grids fan out identical
 * requests; this keeps us polite to upstream feeds (Yahoo especially) and
 * makes symbol switching snappy. Per-instance by design — swap for Redis
 * only if the app ever scales horizontally.
 */

interface Entry {
  candles: Candle[];
  live: boolean;
  expiresAt: number;
}

const store = new Map<string, Entry>();
const MAX_ENTRIES = 200;

/** Short TTL for fast timeframes (bars mutate), longer for slow ones. */
export function ttlForTimeframe(tfSeconds: number): number {
  if (tfSeconds <= 60) return 5_000;
  if (tfSeconds <= 3600) return 20_000;
  if (tfSeconds <= 86400) return 60_000;
  return 300_000;
}

export function cacheGet(key: string): { candles: Candle[]; live: boolean } | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return { candles: entry.candles, live: entry.live };
}

export function cacheSet(key: string, candles: Candle[], live: boolean, ttlMs: number): void {
  if (store.size >= MAX_ENTRIES) {
    // Drop the oldest-expiring entry — cheap approximation of LRU.
    let oldestKey: string | null = null;
    let oldest = Infinity;
    for (const [k, v] of store) {
      if (v.expiresAt < oldest) {
        oldest = v.expiresAt;
        oldestKey = k;
      }
    }
    if (oldestKey) store.delete(oldestKey);
  }
  store.set(key, { candles, live, expiresAt: Date.now() + ttlMs });
}
