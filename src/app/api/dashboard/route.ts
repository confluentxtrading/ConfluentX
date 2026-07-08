import { apiError, apiSuccess, requireSession } from "@/lib/api";
import { db } from "@/lib/db";
import { DEFAULT_WATCHLIST, FUTURES_SYMBOLS, marketData } from "@/lib/market-data";
import { getDashboardData } from "@/lib/mock/dashboard";

/** Aggregated payload for the dashboard overview. */
export async function GET() {
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const items = await db.watchlistItem.findMany({
    where: { userId: session.user.id },
    orderBy: { sortOrder: "asc" },
    select: { symbol: true },
  });
  const watchlistSymbols =
    items.length > 0 ? items.map((i) => i.symbol) : DEFAULT_WATCHLIST;

  const data = getDashboardData();

  return apiSuccess({
    ...data,
    watchlist: marketData.getQuotes(watchlistSymbols),
    movers: marketData.getQuotes(FUTURES_SYMBOLS.map((s) => s.symbol)),
  });
}
