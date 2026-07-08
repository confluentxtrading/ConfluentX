import { z } from "zod";

import { apiError, apiSuccess, isSameOrigin, requireSession } from "@/lib/api";
import { db } from "@/lib/db";

export async function GET() {
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      emailVerified: true,
      isTwoFactorEnabled: true,
      role: true,
      createdAt: true,
    },
  });
  if (!user) return apiError("Not found", 404);

  return apiSuccess({ user });
}

const patchSchema = z.object({
  name: z.string().min(2).max(64).optional(),
  isTwoFactorEnabled: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  if (!isSameOrigin(req)) return apiError("Invalid origin", 403);
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid update");

  // 2FA requires a password credential (email codes gate credentials logins).
  if (parsed.data.isTwoFactorEnabled) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) {
      return apiError("Two-factor requires an email/password credential", 400);
    }
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: { id: true, name: true, isTwoFactorEnabled: true },
  });
  return apiSuccess({ user });
}
