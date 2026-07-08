import { z } from "zod";

import { apiError, apiSuccess, isSameOrigin, requireSession } from "@/lib/api";
import { db } from "@/lib/db";

const patchSchema = z.object({
  active: z.boolean().optional(),
  price: z.number().positive().optional(),
  note: z.string().max(200).nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  if (!isSameOrigin(req)) return apiError("Invalid origin", 403);
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid update");

  // Scoped update — a user can only touch their own alerts.
  const result = await db.alert.updateMany({
    where: { id, userId: session.user.id },
    data: parsed.data,
  });
  if (result.count === 0) return apiError("Alert not found", 404);

  return apiSuccess({ status: "updated" as const });
}

export async function DELETE(req: Request, { params }: Params) {
  if (!isSameOrigin(req)) return apiError("Invalid origin", 403);
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const { id } = await params;
  const result = await db.alert.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (result.count === 0) return apiError("Alert not found", 404);

  return apiSuccess({ status: "deleted" as const });
}
