import crypto from "crypto";

import { db } from "@/lib/db";

const HOUR = 60 * 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;

/** Email-verification token — single active token per email, 1 hour TTL. */
export async function generateVerificationToken(email: string) {
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + HOUR);

  await db.verificationToken.deleteMany({ where: { email } });

  return db.verificationToken.create({
    data: { email, token, expires },
  });
}

/** Password-reset token — single active token per email, 1 hour TTL. */
export async function generatePasswordResetToken(email: string) {
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + HOUR);

  await db.passwordResetToken.deleteMany({ where: { email } });

  return db.passwordResetToken.create({
    data: { email, token, expires },
  });
}

/** Two-factor login code — 6 digits, 10 minute TTL. */
export async function generateTwoFactorToken(email: string) {
  const token = crypto.randomInt(100_000, 1_000_000).toString();
  const expires = new Date(Date.now() + TEN_MINUTES);

  await db.twoFactorToken.deleteMany({ where: { email } });

  return db.twoFactorToken.create({
    data: { email, token, expires },
  });
}

export async function getVerificationTokenByToken(token: string) {
  return db.verificationToken.findUnique({ where: { token } });
}

export async function getPasswordResetTokenByToken(token: string) {
  return db.passwordResetToken.findUnique({ where: { token } });
}

export async function getTwoFactorTokenByEmail(email: string) {
  return db.twoFactorToken.findFirst({ where: { email } });
}
