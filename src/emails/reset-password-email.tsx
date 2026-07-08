import * as React from "react";

import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailText,
} from "./components/email-layout";

export default function ResetPasswordEmail({
  name = "there",
  resetUrl = "https://confluentx.com/reset-password?token=xxx",
}: {
  name?: string;
  resetUrl?: string;
}) {
  return (
    <EmailLayout preview="Reset your ConfluentX password">
      <EmailHeading>Reset your password</EmailHeading>
      <EmailText>Hi {name},</EmailText>
      <EmailText muted>
        We received a request to reset the password on your ConfluentX account. Click
        below to choose a new one.
      </EmailText>
      <EmailButton href={resetUrl}>Reset Password</EmailButton>
      <EmailText muted>
        This link expires in 1 hour. If you didn&apos;t request a reset, no action is
        needed — your password is unchanged.
      </EmailText>
    </EmailLayout>
  );
}
