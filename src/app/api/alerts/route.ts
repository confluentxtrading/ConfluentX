import { z } from "zod";

import { apiError, apiSuccess, isSameOrigin, requireSession } from "@/lib/api";
import { db } from "@/lib/db";
import { marketData } from "@/lib/market-data";

export async function GET() {
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const alerts = await db.alert.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return apiSuccess({ alerts });
}

const createSchema = z.object({
  symbol: z.string().min(1).max(6),
  condition: z.enum(["PRICE_ABOVE", "PRICE_BELOW", "CROSSES"]),
  price: z.number().positive(),
  note: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return apiError("Invalid origin", 403);
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid alert");

  const symbol = parsed.data.symbol.toUpperCase();
  if (!marketData.getSymbol(symbol)) return apiError(`Unknown symbol: ${symbol}`, 404);

  const count = await db.alert.count({ where: { userId: session.user.id, active: true } });
  if (count >= 50) return apiError("Active alert limit reached (50)", 400);

  const alert = await db.alert.create({
    data: {
      userId: session.user.id,
      symbol,
      condition: parsed.data.condition,
      price: parsed.data.price,
      note: parsed.data.note,
    },
  });
  return apiSuccess({ alert }, 201);
}
