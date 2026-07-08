import { z } from "zod";

import { apiError, apiSuccess, isSameOrigin, requireSession } from "@/lib/api";
import { db } from "@/lib/db";
import { marketData } from "@/lib/market-data";

export async function GET() {
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const items = await db.watchlistItem.findMany({
    where: { userId: session.user.id },
    orderBy: { sortOrder: "asc" },
    select: { symbol: true, sortOrder: true, createdAt: true },
  });
  return apiSuccess({ items });
}

const addSchema = z.object({ symbol: z.string().min(1).max(6) });

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return apiError("Invalid origin", 403);
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid symbol");

  const symbol = parsed.data.symbol.toUpperCase();
  if (!marketData.getSymbol(symbol)) return apiError(`Unknown symbol: ${symbol}`, 404);

  const count = await db.watchlistItem.count({ where: { userId: session.user.id } });
  if (count >= 30) return apiError("Watchlist limit reached (30 symbols)", 400);

  const item = await db.watchlistItem.upsert({
    where: { userId_symbol: { userId: session.user.id, symbol } },
    create: { userId: session.user.id, symbol, sortOrder: count },
    update: {},
  });
  return apiSuccess({ item }, 201);
}

export async function DELETE(req: Request) {
  if (!isSameOrigin(req)) return apiError("Invalid origin", 403);
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  if (!symbol) return apiError("Missing symbol");

  await db.watchlistItem.deleteMany({
    where: { userId: session.user.id, symbol },
  });
  return apiSuccess({ status: "deleted" as const });
}
