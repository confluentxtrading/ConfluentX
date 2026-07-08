"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { SectionHeading, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Learn the platform with delayed data and core charting.",
    cta: "Start Free",
    href: "/register",
    highlight: false,
    features: [
      "Delayed market data (15 min)",
      "Core charting & indicators",
      "1 workspace",
      "Trade journal (50 entries)",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$49",
    period: "per month",
    description: "Real-time data, order flow, and the full risk suite.",
    cta: "Start 14-Day Trial",
    href: "/register",
    highlight: true,
    features: [
      "Real-time CME data",
      "Order flow, DOM & footprint",
      "Unlimited workspaces & alerts",
      "Unlimited journal + analytics",
      "Market replay",
      "Cloud sync across devices",
      "Priority support",
    ],
  },
  {
    name: "Institutional",
    price: "Custom",
    period: "annual contract",
    description: "Multi-seat desks, dedicated infrastructure, and SLAs.",
    cta: "Contact Sales",
    href: "/contact",
    highlight: false,
    features: [
      "Everything in Pro",
      "Multi-seat management",
      "Dedicated low-latency gateways",
      "Custom integrations & API",
      "99.99% uptime SLA",
      "Dedicated account engineer",
    ],
  },
];

export function SectionPricing() {
  return (
    <section id="pricing" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Pricing"
          title="Priced like a tool. Built like infrastructure."
          lede="Start free. Upgrade when the edge pays for itself."
        />

        <Stagger className="mt-16 grid gap-5 lg:grid-cols-3" stagger={0.12}>
          {PLANS.map((plan) => (
            <StaggerItem key={plan.name}>
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-3xl p-8 transition-all duration-500",
                  plan.highlight
                    ? "border-gradient glow-violet lg:-my-3 lg:py-11"
                    : "border border-white/8 bg-white/[0.02] hover:border-white/15"
                )}
              >
                {plan.highlight ? (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                ) : null}

                <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-semibold tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {plan.description}
                </p>

                <ul className="mt-7 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/85">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand-lilac" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={plan.highlight ? "gradient" : "glass"}
                  size="lg"
                  className="mt-8 w-full"
                >
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
