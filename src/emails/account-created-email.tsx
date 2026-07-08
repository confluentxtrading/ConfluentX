import * as React from "react";

import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailText,
} from "./components/email-layout";

export default function AccountCreatedEmail({
  name = "there",
  loginUrl = "https://confluentx.com/login",
}: {
  name?: string;
  loginUrl?: string;
}) {
  return (
    <EmailLayout preview="Your ConfluentX account has been created">
      <EmailHeading>Account created successfully</EmailHeading>
      <EmailText>Hi {name},</EmailText>
      <EmailText muted>
        Your ConfluentX account is set up and ready. Once your email is verified, you can
        sign in and start configuring your trading workspace — charts, watchlists, risk
        parameters, and your journal.
      </EmailText>
      <EmailButton href={loginUrl}>Sign In</EmailButton>
      <EmailText muted>
        Tip: enable two-factor authentication in Settings for an extra layer of account
        security.
      </EmailText>
    </EmailLayout>
  );
}
