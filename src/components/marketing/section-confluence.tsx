"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Crosshair,
  Droplets,
  GitMerge,
  LineChart,
  TrendingUp,
} from "lucide-react";

import { Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/motion/reveal";

const PILLARS = [
  {
    icon: GitMerge,
    title: "Confluence",
    body: "One signal is noise. Multiple independent signals aligning at the same price is an edge. ConfluentX is built to surface exactly those moments.",
  },
  {
    icon: LineChart,
    title: "Market Structure",
    body: "Swing highs, swing lows, breaks and shifts — structure mapped automatically so you always know where you are in the auction.",
  },
  {
    icon: TrendingUp,
    title: "Trend",
    body: "Multi-timeframe trend context at a glance. Trade with the flow of the higher timeframe, execute on the lower.",
  },
  {
    icon: Activity,
    title: "Momentum",
    body: "Delta, cumulative volume, and momentum divergence — measure the force behind every move, not just its direction.",
  },
  {
    icon: Droplets,
    title: "Liquidity",
    body: "Resting liquidity, stop clusters, and inefficiencies. See where the market is likely to reach before it gets there.",
  },
  {
    icon: Crosshair,
    title: "Execution",
    body: "When everything lines up, execution must be instant. One-click orders, bracket templates, and hard risk guards.",
  },
];

/** Elegant animated diagram: independent signal paths converging into one node. */
function ConfluenceDiagram() {
  const paths = [
    "M 0 30 C 160 30, 260 100, 400 110",
    "M 0 110 C 170 110, 250 110, 400 110",
    "M 0 190 C 160 190, 260 120, 400 110",
  ];
  const labels = ["Structure", "Momentum", "Liquidity"];

  return (
    <div className="border-gradient relative mx-auto max-w-3xl rounded-3xl p-6 sm:p-10">
      <svg viewBox="0 0 720 220" className="w-full" fill="none" aria-hidden>
        <defs>
          <linearGradient id="conv" x1="0" y1="0" x2="720" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4E6BFF" stopOpacity="0.35" />
            <stop offset="0.55" stopColor="#6A3DFF" />
            <stop offset="1" stopColor="#8A5CFF" />
          </linearGradient>
          <radialGradient id="node" cx="0.5" cy="0.5" r="0.5">
            <stop stopColor="#8A5CFF" />
            <stop offset="1" stopColor="#8A5CFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Converging signal paths */}
        {paths.map((d, i) => (
          <g key={i}>
            <motion.path
              d={d}
              stroke="url(#conv)"
              strokeWidth="1.5"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, delay: i * 0.2, ease: "easeInOut" }}
            />
            <text
              x="8"
              y={[24, 104, 184][i]}
              className="fill-[#8b8d98]"
              fontSize="11"
              fontFamily="var(--font-geist-mono)"
            >
              {labels[i]}
            </text>
          </g>
        ))}

        {/* Confluence node */}
        <motion.circle
          cx="400"
          cy="110"
          r="34"
          fill="url(#node)"
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 0.9, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "400px 110px" }}
        />
        <motion.circle
          cx="400"
          cy="110"
          r="5"
          fill="#F4F5FA"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 1.2 }}
        />

        {/* Single decisive execution line out */}
        <motion.path
          d="M 400 110 L 700 110"
          stroke="#F4F5FA"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.text
          x="700"
          y="96"
          textAnchor="end"
          className="fill-[#F4F5FA]"
          fontSize="11"
          fontFamily="var(--font-geist-mono)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.9 }}
        >
          Execution
        </motion.text>
      </svg>
    </div>
  );
}

export function SectionConfluence() {
  return (
    <section id="confluence" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="The Philosophy"
          title={
            <>
              What is <span className="text-gradient-brand">ConfluentX</span>?
            </>
          }
          lede="Professional traders don't act on single signals. They wait for confluence — the moment structure, momentum, and liquidity agree — then execute with precision. ConfluentX turns that discipline into software."
        />

        <Reveal className="mt-16" delay={0.15}>
          <ConfluenceDiagram />
        </Reveal>

        <Stagger className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.07}>
          {PILLARS.map((pillar) => (
            <StaggerItem key={pillar.title}>
              <div className="group h-full rounded-2xl border border-white/8 bg-white/[0.02] p-6 transition-all duration-500 hover:border-brand-violet/30 hover:bg-white/[0.04]">
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-violet/12 text-brand-lilac transition-all duration-500 group-hover:bg-brand-violet/20 group-hover:glow-violet">
                  <pillar.icon className="size-5" />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold">{pillar.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
