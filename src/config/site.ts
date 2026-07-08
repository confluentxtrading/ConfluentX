export const siteConfig = {
  name: "ConfluentX",
  tagline: "Precision Meets Confluence.",
  subtitle: "Professional Futures Trading Software.",
  description:
    "ConfluentX is an institutional-grade futures trading platform built around confluence, precision, and execution. Real-time charts, order flow, risk tools, and a trading journal — engineered for serious traders.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  links: {
    twitter: "https://x.com/confluentx",
    discord: "https://discord.gg/confluentx",
    github: "https://github.com/confluentx",
    email: "support@confluentx.com",
  },
} as const;

export type SiteConfig = typeof siteConfig;
