import bcrypt from "bcryptjs";

import { apiError, apiSuccess, isSameOrigin } from "@/lib/api";
import { getUserByEmail } from "@/lib/data/user";
import { db } from "@/lib/db";
import { sendAccountCreatedEmail, sendVerificationEmail } from "@/lib/mail";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { generateVerificationToken } from "@/lib/tokens";
import { registerSchema } from "@/lib/validators/auth";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return apiError("Invalid origin", 403);

  const ip = getClientIp(req.headers);
  const limit = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.success) {
    return apiError(`Too many attempts. Try again in ${limit.retryAfter}s.`, 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { name, email, password } = parsed.data;

  const existing = await getUserByEmail(email);
  if (existing) {
    // Same response shape as success — don't leak which emails are registered.
    return apiSuccess({
      status: "verification_sent" as const,
      message: "Check your inbox to verify your email.",
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      settings: { create: {} },
      subscription: { create: {} },
    },
  });

  const verificationToken = await generateVerificationToken(email);

  await Promise.all([
    sendVerificationEmail({ to: email, name: user.name, token: verificationToken.token }),
    sendAccountCreatedEmail({ to: email, name: user.name }),
  ]);

  return apiSuccess(
    {
      status: "verification_sent" as const,
      message: "Account created. Check your inbox to verify your email.",
    },
    201
  );
}
