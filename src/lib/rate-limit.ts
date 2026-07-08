/**
 * Lightweight sliding-window rate limiter.
 *
 * In-memory — perfect for a single Node instance and for development.
 * On serverless/multi-instance deployments swap the store for Upstash Redis
 * (`@upstash/ratelimit`) — the call-site API below stays identical.
 */

type Window = { count: number; resetAt: number };

const store = new Map<string, Window>();

// Periodically evict expired windows so the map can't grow unbounded.
const SWEEP_INTERVAL = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweep() {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL) return;
  lastSweep = now;
  for (const [key, win] of store) {
    if (win.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
}

/**
 * @param key      Unique bucket, e.g. `login:{ip}:{email}`
 * @param limit    Max requests per window
 * @param windowMs Window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  sweep();
  const now = Date.now();
  const win = store.get(key);

  if (!win || win.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (win.count >= limit) {
    return {
      success: false,
      remaining: 0,
      retryAfter: Math.ceil((win.resetAt - now) / 1000),
    };
  }

  win.count += 1;
  return { success: true, remaining: limit - win.count, retryAfter: 0 };
}

/** Extract the caller IP from proxy headers (Vercel / nginx / cloudflare). */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
