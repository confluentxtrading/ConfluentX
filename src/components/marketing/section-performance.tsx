"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";

import { Reveal, SectionHeading } from "@/components/motion/reveal";

function Counter({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 2,
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const value = useMotionValue(0);
  const rendered = useTransform(value, (v) =>
    `${prefix}${v.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`
  );

  useEffect(() => {
    if (!inView) return;
    const controls = animate(value, to, { duration, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [inView, to, duration, value]);

  return (
    <motion.span ref={ref} className="tabular">
      {rendered}
    </motion.span>
  );
}

const STATS = [
  { label: "Order round-trip", to: 0.8, decimals: 1, suffix: "ms", note: "co-located routing" },
  { label: "Chart render", to: 60, suffix: "fps", note: "even at 12 panels" },
  { label: "Market uptime", to: 99.99, decimals: 2, suffix: "%", note: "last 12 months" },
  { label: "Ticks processed daily", to: 4.2, decimals: 1, suffix: "B", note: "across CME futures" },
];

export function SectionPerformance() {
  return (
    <section id="performance" className="relative py-28 sm:py-36">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-violet/40 to-transparent"
        aria-hidden
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Performance"
          title="Engineered like infrastructure."
          lede="Speed isn't a feature — it's the foundation. Every layer of ConfluentX is measured, profiled, and rebuilt until it disappears."
        />

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.1}>
              <div className="border-gradient h-full rounded-2xl p-8 text-center">
                <div className="font-display text-4xl font-semibold tracking-tight text-foreground lg:text-5xl">
                  <Counter
                    to={stat.to}
                    decimals={stat.decimals ?? 0}
                    suffix={stat.suffix ?? ""}
                  />
                </div>
                <div className="mt-3 text-sm font-medium text-foreground/80">{stat.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{stat.note}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
