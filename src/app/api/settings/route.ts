import { z } from "zod";

import { apiError, apiSuccess, isSameOrigin, requireSession } from "@/lib/api";
import { db } from "@/lib/db";
import { TIMEFRAME_VALUES } from "@/lib/market-data";

export async function GET() {
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  // Settings row is provisioned at registration; upsert covers legacy users.
  const settings = await db.userSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });
  return apiSuccess({ settings });
}

const patchSchema = z.object({
  defaultSymbol: z.string().min(1).max(6).optional(),
  defaultTimeframe: z.enum(TIMEFRAME_VALUES).optional(),
  chartType: z.enum(["candles", "bars", "line"]).optional(),
  showVolume: z.boolean().optional(),
  showVwap: z.boolean().optional(),
  emaFast: z.number().int().min(2).max(200).optional(),
  emaSlow: z.number().int().min(2).max(400).optional(),
  riskPerTradePct: z.number().min(0.1).max(10).optional(),
  dailyLossLimit: z.number().min(0).max(1_000_000).optional(),
  maxContracts: z.number().int().min(1).max(500).optional(),
  emailAlerts: z.boolean().optional(),
  emailNewsletter: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  if (!isSameOrigin(req)) return apiError("Invalid origin", 403);
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid settings");

  const settings = await db.userSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...parsed.data },
    update: parsed.data,
  });
  return apiSuccess({ settings });
}
