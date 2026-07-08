import { z } from "zod";

import { apiError, apiSuccess, isSameOrigin, requireSession } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET() {
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const subscription = await db.subscription.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });
  return apiSuccess({ subscription });
}

/**
 * Plan changes. Placeholder for the Stripe checkout flow — when billing is
 * integrated, this becomes "create checkout session" and the webhook updates
 * the row. Kept so the UI contract is stable.
 */
const patchSchema = z.object({
  tier: z.enum(["FREE", "PRO", "INSTITUTIONAL"]),
});

export async function PATCH(req: Request) {
  if (!isSameOrigin(req)) return apiError("Invalid origin", 403);
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid tier");

  if (parsed.data.tier !== "FREE") {
    return apiError("Billing is not yet enabled — contact sales for early access", 400);
  }

  const subscription = await db.subscription.update({
    where: { userId: session.user.id },
    data: { tier: parsed.data.tier },
  });
  return apiSuccess({ subscription });
}
