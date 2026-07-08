import { Resend } from "resend";
import type { ReactElement } from "react";

import AccountCreatedEmail from "@/emails/account-created-email";
import NewDeviceEmail from "@/emails/new-device-email";
import ResetPasswordEmail from "@/emails/reset-password-email";
import TwoFactorEmail from "@/emails/two-factor-email";
import VerifyEmail from "@/emails/verify-email";
import WelcomeEmail from "@/emails/welcome-email";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const from = process.env.MAIL_FROM ?? "ConfluentX <onboarding@resend.dev>";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Send an email via Resend. Without RESEND_API_KEY (local dev) the payload is
 * logged instead so auth flows remain fully testable offline.
 */
async function send(to: string, subject: string, react: ReactElement) {
  if (!resend) {
    console.info(`[mail:dev] to=${to} subject="${subject}" (RESEND_API_KEY not set)`);
    return;
  }
  const { error } = await resend.emails.send({ from, to, subject, react });
  if (error) {
    // Never let a mail failure take down an auth flow — log and continue.
    console.error(`[mail] failed to send "${subject}" to ${to}:`, error);
  }
}

export async function sendVerificationEmail(params: {
  to: string;
  name?: string | null;
  token: string;
}) {
  const verifyUrl = `${appUrl}/verify-email?token=${params.token}`;
  await send(
    params.to,
    "Verify your ConfluentX email",
    VerifyEmail({ name: params.name ?? "there", verifyUrl })
  );
  // Dev convenience: surface the link in the server console.
  if (!resend) console.info(`[mail:dev] verify link: ${verifyUrl}`);
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name?: string | null;
  token: string;
}) {
  const resetUrl = `${appUrl}/reset-password?token=${params.token}`;
  await send(
    params.to,
    "Reset your ConfluentX password",
    ResetPasswordEmail({ name: params.name ?? "there", resetUrl })
  );
  if (!resend) console.info(`[mail:dev] reset link: ${resetUrl}`);
}

export async function sendTwoFactorEmail(params: {
  to: string;
  name?: string | null;
  code: string;
}) {
  await send(
    params.to,
    `${params.code} is your ConfluentX verification code`,
    TwoFactorEmail({ name: params.name ?? "there", code: params.code })
  );
  if (!resend) console.info(`[mail:dev] 2FA code: ${params.code}`);
}

export async function sendNewDeviceEmail(params: {
  to: string;
  name?: string | null;
  browser: string;
  os: string;
  ip: string;
  time: Date;
}) {
  await send(
    params.to,
    "New device sign-in to ConfluentX",
    NewDeviceEmail({
      name: params.name ?? "there",
      browser: params.browser,
      os: params.os,
      ip: params.ip,
      time: params.time.toUTCString(),
      securityUrl: `${appUrl}/dashboard/account`,
    })
  );
}

export async function sendWelcomeEmail(params: { to: string; name?: string | null }) {
  await send(
    params.to,
    "Welcome to ConfluentX",
    WelcomeEmail({ name: params.name ?? "there", dashboardUrl: `${appUrl}/dashboard` })
  );
}

export async function sendAccountCreatedEmail(params: { to: string; name?: string | null }) {
  await send(
    params.to,
    "Your ConfluentX account has been created",
    AccountCreatedEmail({ name: params.name ?? "there", loginUrl: `${appUrl}/login` })
  );
}
