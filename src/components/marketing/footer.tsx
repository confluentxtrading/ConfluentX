import Link from "next/link";
import { Github, Mail, MessageCircle, Twitter } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { siteConfig } from "@/config/site";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Platform", href: "/#platform" },
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Institutional-grade futures trading software built around confluence,
              precision, and execution.
            </p>
            <div className="flex gap-2">
              {[
                { icon: Twitter, href: siteConfig.links.twitter, label: "X / Twitter" },
                { icon: MessageCircle, href: siteConfig.links.discord, label: "Discord" },
                { icon: Github, href: siteConfig.links.github, label: "GitHub" },
                { icon: Mail, href: `mailto:${siteConfig.links.email}`, label: "Email" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noreferrer"
                  className="flex size-9 items-center justify-center rounded-xl border border-white/8 text-muted-foreground transition-all hover:border-brand-violet/50 hover:text-foreground"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 text-sm font-semibold text-foreground">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/5 pt-8 text-xs text-muted-foreground/70 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} ConfluentX. All rights reserved.</p>
          <p className="max-w-xl leading-relaxed">
            Futures trading involves substantial risk of loss and is not suitable for all
            investors. Past performance is not indicative of future results.
          </p>
        </div>
      </div>
    </footer>
  );
}
