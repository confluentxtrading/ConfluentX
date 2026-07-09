import { requireSession } from "@/lib/api";
import { db } from "@/lib/db";
import { FUTURES_SYMBOLS } from "@/lib/market-data";
import { getDatabentoCandles, hasDatabentoKey } from "@/lib/market-data/live-databento";
import { validateCandles } from "@/lib/market-data/validate";

export const dynamic = "force-dynamic";

/**
 * First-contact verification for the Databento integration:
 * GET /api/health?probe=databento  (session required — probes bill usage).
 *
 * Runs the full checklist against tiny real requests and reports PASS/FAIL
 * per item. Nothing is fabricated: without a key it reports not-ready.
 */
async function probeDatabento() {
  if (!hasDatabentoKey()) {
    return { ready: false, reason: "DATABENTO_API_KEY is not set in this environment" };
  }

  const checks: { name: string; pass: boolean; detail: string }[] = [];
  const add = (name: string, pass: boolean, detail: string) =>
    checks.push({ name, pass, detail });

  const trySymbol = async (symbol: string, timeframe: "1s" | "1m", count: number) => {
    try {
      return { candles: await getDatabentoCandles(symbol, timeframe, count), error: null };
    } catch (error) {
      return { candles: [], error: error instanceof Error ? error.message : "unknown" };
    }
  };

  // Auth + dataset + continuous contract resolution (ES, NQ, YM @ 1m).
  for (const symbol of ["ES", "NQ", "YM"]) {
    const { candles, error } = await trySymbol(symbol, "1m", 30);
    add(
      `continuous contract ${symbol}.c.0 (1m)`,
      candles.length > 0,
      error ?? `${candles.length} bars`
    );
    if (symbol === "ES" && candles.length > 0) {
      const meta = FUTURES_SYMBOLS.find((s) => s.symbol === "ES");
      const last = candles[candles.length - 1];
      const sane =
        meta !== undefined && last.close > meta.basePrice / 5 && last.close < meta.basePrice * 5;
      add(
        "price scaling (1e-9 fixed point)",
        sane,
        `ES last close ${last.close} vs expected magnitude ~${meta?.basePrice}`
      );
      const now = Date.now() / 1000;
      add(
        "timestamp units (ns→s) and recency",
        last.time > now - 30 * 86400 && last.time < now + 86400,
        new Date(last.time * 1000).toISOString()
      );
      add(
        "volume present",
        candles.some((c) => c.volume > 0),
        `max volume ${Math.max(...candles.map((c) => c.volume))}`
      );
      const { report } = validateCandles(candles);
      add(
        "validation layer",
        report.output > 0 && !report.reordered,
        `in=${report.input} out=${report.output} dupes=${report.droppedDuplicates}`
      );
    }
  }

  // Sub-minute entitlement (the capability no other feed provides).
  const oneSec = await trySymbol("ES", "1s", 60);
  add(
    "1-second historical data (ohlcv-1s)",
    oneSec.candles.length > 0,
    oneSec.error ?? `${oneSec.candles.length} bars`
  );

  return { ready: checks.every((c) => c.pass), checks };
}

/**
 * Deploy + feed diagnostics. Reports connectivity only — no data, no secrets
 * (env vars are reported as present/absent booleans).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Databento first-contact verification (session-gated — probes bill usage).
  if (searchParams.get("probe") === "databento") {
    const session = await requireSession();
    if (!session) {
      return Response.json({ error: "Sign in first — this probe issues billable requests" }, { status: 401 });
    }
    return Response.json(await probeDatabento());
  }

  // Upstream feed probe: /api/health?probe=feeds
  if (searchParams.get("probe") === "feeds") {
    const probe = async (name: string, url: string, headers?: Record<string, string>) => {
      try {
        const res = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
        return { name, status: res.status, ok: res.ok };
      } catch (error) {
        return { name, status: 0, ok: false, error: error instanceof Error ? error.message.slice(0, 120) : "unknown" };
      }
    };
    const [binance, yahoo] = await Promise.all([
      probe("binance", "https://data-api.binance.vision/api/v3/ping"),
      probe(
        "yahoo",
        "https://query1.finance.yahoo.com/v8/finance/chart/ES=F?interval=1d&range=1d",
        { "User-Agent": "Mozilla/5.0 (compatible; ConfluentX/1.0)" }
      ),
    ]);
    return Response.json({
      binance,
      yahoo,
      databentoKeyPresent: Boolean(process.env.DATABENTO_API_KEY),
    });
  }

  const url = process.env.DATABASE_URL ?? "";
  const urlShape = {
    present: url.length > 0,
    startsWithQuote: url.startsWith('"') || url.startsWith("'"),
    startsWithPostgres: url.startsWith("postgresql://") || url.startsWith("postgres://"),
    length: url.length,
  };

  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "connected", urlShape });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        urlShape,
        error: error instanceof Error ? error.message.slice(0, 600) : "unknown",
      },
      { status: 500 }
    );
  }
}
