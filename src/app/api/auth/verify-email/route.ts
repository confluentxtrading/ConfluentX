import { apiError, apiSuccess, isSameOrigin } from "@/lib/api";
import { getUserByEmail } from "@/lib/data/user";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/mail";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { getVerificationTokenByToken } from "@/lib/tokens";
import { verifyEmailSchema } from "@/lib/validators/auth";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return apiError("Invalid origin", 403);

  const ip = getClientIp(req.headers);
  const limit = rateLimit(`verify:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.success) {
    return apiError(`Too many attempts. Try again in ${limit.retryAfter}s.`, 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid verification link");

  const verificationToken = await getVerificationTokenByToken(parsed.data.token);
  if (!verificationToken) return apiError("Invalid or expired verification link", 400);
  if (verificationToken.expires < new Date()) {
    return apiError("Verification link expired — sign in to receive a new one", 400);
  }

  const user = await getUserByEmail(verificationToken.email);
  if (!user) return apiError("Invalid or expired verification link", 400);

  const alreadyVerified = Boolean(user.emailVerified);

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date(), email: verificationToken.email },
    }),
    db.verificationToken.delete({ where: { id: verificationToken.id } }),
  ]);

  if (!alreadyVerified) {
    await sendWelcomeEmail({ to: user.email, name: user.name });
  }

  return apiSuccess({
    status: "success" as const,
    message: "Email verified — welcome to ConfluentX.",
  });
}
