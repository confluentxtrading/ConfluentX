import * as React from "react";

import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailText,
} from "./components/email-layout";

export default function WelcomeEmail({
  name = "there",
  dashboardUrl = "https://confluentx.com/dashboard",
}: {
  name?: string;
  dashboardUrl?: string;
}) {
  return (
    <EmailLayout preview="Welcome to ConfluentX — your edge starts here">
      <EmailHeading>Welcome to ConfluentX</EmailHeading>
      <EmailText>Hi {name},</EmailText>
      <EmailText muted>
        Your account is verified and your workspace is live. ConfluentX brings
        institutional-grade charting, order flow, risk management, and a trading journal
        into one precise, fast platform.
      </EmailText>
      <EmailText muted>
        Start by opening the dashboard, loading NQ or ES, and building your first
        watchlist.
      </EmailText>
      <EmailButton href={dashboardUrl}>Open Dashboard</EmailButton>
      <EmailText muted>
        Precision meets confluence. We&apos;re glad you&apos;re here.
      </EmailText>
    </EmailLayout>
  );
}
