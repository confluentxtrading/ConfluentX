import { apiError, apiSuccess, isSameOrigin, requireSession } from "@/lib/api";
import { db } from "@/lib/db";

/** Account summary: profile + subscription + device sessions. */
export async function GET() {
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  const [user, devices] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        emailVerified: true,
        isTwoFactorEnabled: true,
        createdAt: true,
        subscription: {
          select: { tier: true, status: true, currentPeriodEnd: true },
        },
      },
    }),
    db.deviceSession.findMany({
      where: { userId: session.user.id },
      orderBy: { lastActiveAt: "desc" },
      select: {
        id: true,
        browser: true,
        os: true,
        ip: true,
        lastActiveAt: true,
        createdAt: true,
      },
    }),
  ]);
  if (!user) return apiError("Not found", 404);

  return apiSuccess({ account: user, devices });
}

/** Hard-delete the account and all owned data (cascading FKs). */
export async function DELETE(req: Request) {
  if (!isSameOrigin(req)) return apiError("Invalid origin", 403);
  const session = await requireSession();
  if (!session) return apiError("Unauthorized", 401);

  await db.user.delete({ where: { id: session.user.id } });
  return apiSuccess({ status: "deleted" as const });
}
