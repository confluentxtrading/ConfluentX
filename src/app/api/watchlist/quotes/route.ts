import { apiError, apiSuccess, requireSession } from "@/lib/api";
import { getQuotesAsync, marketData } from "@/lib/market-data";

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const symbols = (searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 30);

  if (symbols.length === 0) return apiError("Missing symbols");

  const quotes = await getQuotesAsync(symbols.filter((s) => marketData.getSymbol(s)));
  return apiSuccess({ quotes });
}
