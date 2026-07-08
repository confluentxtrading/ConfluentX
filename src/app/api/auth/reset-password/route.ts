import bcrypt from "bcryptjs";

import { apiError, apiSuccess, isSameOrigin } from "@/lib/api";
import { getUserByEmail } from "@/lib/data/user";
import { db } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { getPasswordResetTokenByToken } from "@/lib/tokens";
import { resetPasswordSchema } from "@/lib/validators/auth";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return apiError("Invalid origin", 403);

  const ip = getClientIp(req.headers);
  const limit = rateLimit(`reset:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.success) {
    return apiError(`Too many attempts. Try again in ${limit.retryAfter}s.`, 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const resetToken = await getPasswordResetTokenByToken(parsed.data.token);
  if (!resetToken) return apiError("Invalid or expired reset link", 400);
  if (resetToken.expires < new Date()) {
    return apiError("Reset link expired — request a new one", 400);
  }

  const user = await getUserByEmail(resetToken.email);
  if (!user) return apiError("Invalid or expired reset link", 400);

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash } }),
    db.passwordResetToken.delete({ where: { id: resetToken.id } }),
  ]);

  return apiSuccess({
    status: "success" as const,
    message: "Password updated. You can now sign in.",
  });
}
