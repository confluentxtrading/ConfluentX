import { Section, Text } from "@react-email/components";
import * as React from "react";

import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailText,
  emailTheme,
} from "./components/email-layout";

export default function NewDeviceEmail({
  name = "there",
  browser = "Chrome",
  os = "Windows",
  ip = "0.0.0.0",
  time = "just now",
  securityUrl = "https://confluentx.com/dashboard/account",
}: {
  name?: string;
  browser?: string;
  os?: string;
  ip?: string;
  time?: string;
  securityUrl?: string;
}) {
  const row = (label: string, value: string) => (
    <Text style={{ fontSize: 13, margin: "0 0 6px", lineHeight: "22px" }}>
      <span style={{ color: emailTheme.faint }}>{label}</span>{" "}
      <span style={{ color: emailTheme.text, fontWeight: 600 }}>{value}</span>
    </Text>
  );

  return (
    <EmailLayout preview="New sign-in to your ConfluentX account">
      <EmailHeading>New device sign-in</EmailHeading>
      <EmailText>Hi {name},</EmailText>
      <EmailText muted>
        Your ConfluentX account was just accessed from a device we haven&apos;t seen
        before:
      </EmailText>
      <Section
        style={{
          backgroundColor: "#161622",
          border: `1px solid ${emailTheme.border}`,
          borderRadius: 12,
          padding: "16px 20px",
          margin: "0 0 20px",
        }}
      >
        {row("Device", `${browser} on ${os}`)}
        {row("IP address", ip)}
        {row("Time", time)}
      </Section>
      <EmailText muted>
        If this was you, no action is needed. If you don&apos;t recognize this activity,
        secure your account now.
      </EmailText>
      <EmailButton href={securityUrl}>Review Account Security</EmailButton>
    </EmailLayout>
  );
}
