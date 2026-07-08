import { z } from "zod";

import { apiError, apiSuccess, requireSession } from "@/lib/api";
import { marketData, type Timeframe } from "@/lib/market-data";

const querySchema = z.object({
  symbol: z.string().min(1).max(6),
  timeframe: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("5m"),
  count: z.coerce.number().int().min(10).max(10000).default(300),
});

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    symbol: searchParams.get("symbol") ?? "",
    timeframe: searchParams.get("timeframe") ?? undefined,
    count: searchParams.get("count") ?? undefined,
  });
  if (!parsed.success) return apiError("Invalid chart query");

  const { symbol, timeframe, count } = parsed.data;
  const meta = marketData.getSymbol(symbol);
  if (!meta) return apiError(`Unknown symbol: ${symbol}`, 404);

  const candles = marketData.getCandles(symbol, timeframe as Timeframe, count);
  return apiSuccess({ symbol: meta.symbol, timeframe, meta, candles });
}
