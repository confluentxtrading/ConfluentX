import type { Metadata } from "next";
import { Mail, MessageCircle, Building2 } from "lucide-react";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Contact" };

const CHANNELS = [
  {
    icon: Mail,
    title: "Support",
    body: "Product questions, account help, billing.",
    action: { label: siteConfig.links.email, href: `mailto:${siteConfig.links.email}` },
  },
  {
    icon: Building2,
    title: "Institutional Sales",
    body: "Multi-seat desks, dedicated infrastructure, SLAs.",
    action: { label: "sales@confluentx.com", href: "mailto:sales@confluentx.com" },
  },
  {
    icon: MessageCircle,
    title: "Community",
    body: "Join traders on our Discord for setups and support.",
    action: { label: "discord.gg/confluentx", href: siteConfig.links.discord },
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-36 sm:px-6">
      <div className="text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Talk to us.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Whether you&apos;re a solo trader or running a desk, we respond fast — usually
          within one trading session.
        </p>
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {CHANNELS.map((ch) => (
          <a
            key={ch.title}
            href={ch.action.href}
            className="group rounded-3xl border border-white/8 bg-white/[0.02] p-8 transition-all duration-500 hover:-translate-y-1 hover:border-brand-violet/35"
          >
            <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-brand-violet/12 text-brand-lilac">
              <ch.icon className="size-5" />
            </div>
            <h2 className="font-display text-lg font-semibold">{ch.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ch.body}</p>
            <p className="mt-5 text-sm font-medium text-brand-lilac transition-colors group-hover:text-brand-blue">
              {ch.action.label} →
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
