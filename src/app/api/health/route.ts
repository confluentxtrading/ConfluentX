import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Deploy + feed diagnostics. Reports connectivity only — no data, no secrets
 * (env vars are reported as present/absent booleans).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

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
