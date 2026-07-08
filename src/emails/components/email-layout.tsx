import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

/**
 * ConfluentX email shell — dark-native design that reads identically in
 * light- and dark-mode clients (colors are hard-coded, not scheme-dependent),
 * with a color-scheme hint for clients that support it.
 */

export const emailTheme = {
  bg: "#050507",
  card: "#0e0e16",
  border: "#22222e",
  text: "#e8e9f1",
  muted: "#8b8d98",
  faint: "#5c5e6b",
  violet: "#6a3dff",
  lilac: "#8a5cff",
  blue: "#4e6bff",
} as const;

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: emailTheme.bg,
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <Container style={{ maxWidth: 520, margin: "0 auto", padding: "40px 20px" }}>
          {/* Wordmark */}
          <Section style={{ textAlign: "center" as const, paddingBottom: 28 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: emailTheme.text,
                margin: 0,
              }}
            >
              Confluent
              <span style={{ color: emailTheme.lilac }}>X</span>
            </Text>
            <Text
              style={{
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase" as const,
                color: emailTheme.faint,
                margin: "6px 0 0",
              }}
            >
              Precision · Confluence · Execution
            </Text>
          </Section>

          {/* Card */}
          <Section
            style={{
              backgroundColor: emailTheme.card,
              border: `1px solid ${emailTheme.border}`,
              borderRadius: 16,
              padding: "36px 32px",
            }}
          >
            {children}
          </Section>

          {/* Footer */}
          <Section style={{ textAlign: "center" as const, paddingTop: 28 }}>
            <Text style={{ fontSize: 12, color: emailTheme.faint, margin: 0, lineHeight: "20px" }}>
              ConfluentX — Professional Futures Trading Software
            </Text>
            <Text style={{ fontSize: 12, color: emailTheme.faint, margin: "4px 0 0" }}>
              <Link href="https://confluentx.com/privacy" style={{ color: emailTheme.muted }}>
                Privacy
              </Link>
              {"  ·  "}
              <Link href="https://confluentx.com/terms" style={{ color: emailTheme.muted }}>
                Terms
              </Link>
              {"  ·  "}
              <Link href="mailto:support@confluentx.com" style={{ color: emailTheme.muted }}>
                Support
              </Link>
            </Text>
            <Hr style={{ borderColor: emailTheme.border, margin: "20px 0 12px" }} />
            <Text style={{ fontSize: 11, color: emailTheme.faint, margin: 0, lineHeight: "18px" }}>
              You received this email because of activity on your ConfluentX account.
              <br />
              Trading futures involves substantial risk of loss.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: "-0.01em",
        color: emailTheme.text,
        margin: "0 0 12px",
        lineHeight: "30px",
      }}
    >
      {children}
    </Text>
  );
}

export function EmailText({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <Text
      style={{
        fontSize: 14,
        color: muted ? emailTheme.muted : emailTheme.text,
        lineHeight: "24px",
        margin: "0 0 16px",
      }}
    >
      {children}
    </Text>
  );
}

export function EmailButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ textAlign: "center" as const, padding: "8px 0 16px" }}>
      <Link
        href={href}
        style={{
          display: "inline-block",
          backgroundColor: emailTheme.violet,
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 600,
          padding: "13px 32px",
          borderRadius: 12,
          textDecoration: "none",
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

export function EmailCode({ code }: { code: string }) {
  return (
    <Section style={{ textAlign: "center" as const, padding: "8px 0 16px" }}>
      <Text
        style={{
          display: "inline-block",
          backgroundColor: "#161622",
          border: `1px solid ${emailTheme.border}`,
          borderRadius: 12,
          color: emailTheme.text,
          fontFamily: "'SF Mono', 'Roboto Mono', Consolas, monospace",
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "0.35em",
          padding: "16px 28px 16px 40px",
          margin: 0,
        }}
      >
        {code}
      </Text>
    </Section>
  );
}
