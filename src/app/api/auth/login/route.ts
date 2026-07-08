import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { apiError, apiSuccess, isSameOrigin } from "@/lib/api";
import { getUserByEmail } from "@/lib/data/user";
import { db } from "@/lib/db";
import { recordDeviceSession } from "@/lib/device";
import { sendTwoFactorEmail, sendVerificationEmail } from "@/lib/mail";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import {
  generateTwoFactorToken,
  generateVerificationToken,
  getTwoFactorTokenByEmail,
} from "@/lib/tokens";
import { loginSchema } from "@/lib/validators/auth";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return apiError("Invalid origin", 403);

  const ip = getClientIp(req.headers);

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { email, password, code } = parsed.data;

  const limit = rateLimit(`login:${ip}:${email}`, 8, 15 * 60 * 1000);
  if (!limit.success) {
    return apiError(`Too many attempts. Try again in ${limit.retryAfter}s.`, 429);
  }

  const user = await getUserByEmail(email);
  if (!user?.passwordHash) return apiError("Invalid email or password", 401);

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) return apiError("Invalid email or password", 401);

  // Unverified email → re-send the verification link instead of signing in.
  if (!user.emailVerified) {
    const token = await generateVerificationToken(email);
    await sendVerificationEmail({ to: email, name: user.name, token: token.token });
    return apiSuccess({
      status: "verification_sent" as const,
      message: "Please verify your email — we just sent you a new link.",
    });
  }

  // Two-factor flow.
  if (user.isTwoFactorEnabled) {
    if (code) {
      const twoFactorToken = await getTwoFactorTokenByEmail(email);
      if (!twoFactorToken || twoFactorToken.token !== code) {
        return apiError("Invalid code", 401);
      }
      if (twoFactorToken.expires < new Date()) {
        return apiError("Code expired — request a new one", 401);
      }
      await db.twoFactorToken.delete({ where: { id: twoFactorToken.id } });
      // Proof for the signIn callback that 2FA passed.
      await db.twoFactorConfirmation.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
    } else {
      const twoFactorToken = await generateTwoFactorToken(email);
      await sendTwoFactorEmail({ to: email, name: user.name, code: twoFactorToken.token });
      return apiSuccess({
        status: "two_factor_required" as const,
        message: "Enter the 6-digit code we sent to your email.",
      });
    }
  }

  try {
    await signIn("credentials", { email, password, code, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError("Invalid email or password", 401);
    }
    throw error;
  }

  // Device auditing — fires the "new device" email when needed.
  await recordDeviceSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    userAgent: req.headers.get("user-agent") ?? "unknown",
    ip,
  }).catch((err) => console.error("[device] failed to record session:", err));

  return apiSuccess({ status: "success" as const });
}
