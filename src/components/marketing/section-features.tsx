"use client";

import {
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  CalendarDays,
  CandlestickChart,
  Cloud,
  Gauge,
  Layers,
  LayoutGrid,
  MonitorPlay,
  Monitor,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { SectionHeading, Stagger, StaggerItem } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: CandlestickChart,
    title: "Real-time Charts",
    body: "Tick-accurate candles rendered at 60fps, from the 1-second chart to the monthly.",
    span: true,
  },
  {
    icon: Zap,
    title: "Fast Execution",
    body: "Sub-millisecond order routing with one-click DOM trading and bracket templates.",
    span: true,
  },
  { icon: BarChart3, title: "Advanced Indicators", body: "VWAP, EMAs, volume profile, delta — institutional tools, no scripting required." },
  { icon: Monitor, title: "Multi-Monitor", body: "Detach any panel to its own window. Built for four-screen desks." },
  { icon: Cloud, title: "Cloud Sync", body: "Layouts, journals, and settings follow you to any machine, instantly." },
  { icon: LayoutGrid, title: "Workspaces", body: "Purpose-built layouts per instrument or strategy, one keystroke apart." },
  { icon: Bell, title: "Alerts", body: "Price, indicator, and confluence alerts — pushed to every device." },
  { icon: CalendarDays, title: "Economic Calendar", body: "High-impact events on your chart's timeline before they hit the tape." },
  { icon: BookOpen, title: "Trade Journal", body: "Every fill captured automatically. Tag setups, review, and improve." },
  { icon: ShieldCheck, title: "Risk Management", body: "Daily loss limits, max position guards, and forced flat — enforced by software." },
  { icon: Layers, title: "Order Flow", body: "Live delta, imbalance detection, and aggressive-order tracking." },
  { icon: Boxes, title: "DOM", body: "A depth-of-market ladder that keeps up with the fastest tape." },
  { icon: Gauge, title: "Footprint Charts", body: "Bid × ask volume inside every candle. See who's in control." },
  { icon: MonitorPlay, title: "Market Replay", body: "Re-trade any session tick by tick. Practice without risk." },
];

export function SectionFeatures() {
  return (
    <section id="features" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Capabilities"
          title="Everything a serious desk needs."
          lede="No gimmicks, no clutter. Fourteen precision tools that compound into an edge."
        />

        <Stagger className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.05}>
          {FEATURES.map((f) => (
            <StaggerItem key={f.title} className={cn(f.span && "sm:col-span-2")}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-brand-violet/35 hover:bg-white/[0.045] hover:shadow-[0_24px_48px_-24px_rgba(106,61,255,0.35)]">
                {/* Hover sheen */}
                <div
                  className="pointer-events-none absolute -inset-x-8 -top-24 h-40 rotate-6 bg-gradient-to-b from-brand-violet/12 to-transparent opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100"
                  aria-hidden
                />
                <div className="relative">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-white/5 text-brand-lilac transition-colors duration-500 group-hover:bg-brand-violet/15">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="mb-1.5 font-display text-base font-semibold">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
