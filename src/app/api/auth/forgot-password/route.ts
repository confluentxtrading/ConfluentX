import { apiError, apiSuccess, isSameOrigin } from "@/lib/api";
import { getUserByEmail } from "@/lib/data/user";
import { sendPasswordResetEmail } from "@/lib/mail";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { generatePasswordResetToken } from "@/lib/tokens";
import { forgotPasswordSchema } from "@/lib/validators/auth";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return apiError("Invalid origin", 403);

  const ip = getClientIp(req.headers);
  const limit = rateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.success) {
    return apiError(`Too many attempts. Try again in ${limit.retryAfter}s.`, 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) return apiError("Enter a valid email");

  const user = await getUserByEmail(parsed.data.email);

  // Always respond identically — never reveal whether an email exists.
  if (user?.passwordHash) {
    const token = await generatePasswordResetToken(user.email);
    await sendPasswordResetEmail({ to: user.email, name: user.name, token: token.token });
  }

  return apiSuccess({
    status: "sent" as const,
    message: "If that email is registered, a reset link is on its way.",
  });
}
