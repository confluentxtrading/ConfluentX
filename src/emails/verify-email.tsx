import * as React from "react";

import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailText,
} from "./components/email-layout";

export default function VerifyEmail({
  name = "there",
  verifyUrl = "https://confluentx.com/verify-email?token=xxx",
}: {
  name?: string;
  verifyUrl?: string;
}) {
  return (
    <EmailLayout preview="Verify your email to activate your ConfluentX account">
      <EmailHeading>Verify your email</EmailHeading>
      <EmailText>Hi {name},</EmailText>
      <EmailText muted>
        Welcome to ConfluentX. Confirm this email address to activate your account and
        unlock your trading workspace.
      </EmailText>
      <EmailButton href={verifyUrl}>Verify Email Address</EmailButton>
      <EmailText muted>
        This link expires in 1 hour. If you didn&apos;t create a ConfluentX account, you
        can safely ignore this email.
      </EmailText>
    </EmailLayout>
  );
}
