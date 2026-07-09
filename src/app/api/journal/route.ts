import { z } from "zod";

import { apiError, apiSuccess, isSameOrigin, requireSession } from "@/lib/api";
import { db } from "@/lib/db";

const createSchema = z.object({
  symbol: z.string().min(1).max(10),
  side: z.enum(["LONG", "SHORT"]),
  quantity: z.number().int().min(1).max(10000),
  entryPrice: z.number().finite(),
  exitPrice: z.number().finite().nullable().optional(),
  pnl: z.number().finite().nullable().optional(),
  fees: z.number().min(0).max(100000).optional(),
  setup: z.string().max(80).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(24)).max(10).optional(),
  executedAt: z.coerce.date(),
});

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return apiError("Invalid origin", 403);
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid journal entry");
  }

  const entry = await db.journalEntry.create({
    data: { userId: session.user.id, ...parsed.data },
  });
  return apiSuccess({ entry }, 201);
}
