"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

import { SectionHeading } from "@/components/motion/reveal";
import { cn, formatPrice } from "@/lib/utils";

/* ── Deterministic mock series (seeded → identical on server & client) ────── */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Candle {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

function buildSeries(seed: number, count: number, start: number, step: number): Candle[] {
  const rnd = mulberry32(seed);
  const candles: Candle[] = [];
  let price = start;
  for (let i = 0; i < count; i++) {
    const drift = (rnd() - 0.44) * step * 3.2; // slight upward bias
    const o = price;
    const c = price + drift;
    const h = Math.max(o, c) + rnd() * step * 1.4;
    const l = Math.min(o, c) - rnd() * step * 1.4;
    const v = 400 + Math.floor(rnd() * 1600);
    candles.push({ o, h, l, c, v });
    price = c;
  }
  return candles;
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  values.forEach((v, i) => {
    out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k));
  });
  return out;
}

/* ── Symbols shown in the preview tab bar ─────────────────────────────────── */

const SYMBOLS = [
  { sym: "NQ", name: "NASDAQ 100", seed: 42, start: 21450, step: 6, decimals: 2 },
  { sym: "ES", name: "S&P 500", seed: 7, start: 6080, step: 1.6, decimals: 2 },
  { sym: "MNQ", name: "Micro NASDAQ", seed: 42, start: 21450, step: 6, decimals: 2 },
  { sym: "MES", name: "Micro S&P", seed: 7, start: 6080, step: 1.6, decimals: 2 },
] as const;

/* ── Chart mock ───────────────────────────────────────────────────────────── */

const W = 640;
const H = 300;
const VOL_H = 44;

function ChartMock({ seed, start, step }: { seed: number; start: number; step: number }) {
  const candles = useMemo(() => buildSeries(seed, 56, start, step), [seed, start, step]);

  const { min, max, maxV, closes, vwap } = useMemo(() => {
    const min = Math.min(...candles.map((c) => c.l));
    const max = Math.max(...candles.map((c) => c.h));
    const maxV = Math.max(...candles.map((c) => c.v));
    const closes = candles.map((c) => c.c);
    // Volume-weighted running mean as a stand-in VWAP.
    let cumPV = 0;
    let cumV = 0;
    const vwap = candles.map((c) => {
      const typical = (c.h + c.l + c.c) / 3;
      cumPV += typical * c.v;
      cumV += c.v;
      return cumPV / cumV;
    });
    return { min, max, maxV, closes, vwap };
  }, [candles]);

  const priceY = (p: number) => 14 + ((max - p) / (max - min)) * (H - VOL_H - 34);
  const bw = W / candles.length;
  const ema9 = useMemo(() => ema(closes, 9), [closes]);
  const ema21 = useMemo(() => ema(closes, 21), [closes]);

  const linePath = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? "M" : "L"} ${i * bw + bw / 2} ${priceY(v)}`)
      .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      {/* Grid */}
      {[0.2, 0.4, 0.6, 0.8].map((t) => (
        <line
          key={t}
          x1="0"
          x2={W}
          y1={14 + t * (H - VOL_H - 34)}
          y2={14 + t * (H - VOL_H - 34)}
          stroke="rgba(255,255,255,0.045)"
          strokeWidth="1"
        />
      ))}

      {/* Volume */}
      {candles.map((c, i) => (
        <motion.rect
          key={`v${i}`}
          x={i * bw + 1.5}
          width={bw - 3}
          y={H - (c.v / maxV) * VOL_H}
          height={(c.v / maxV) * VOL_H}
          fill={c.c >= c.o ? "rgba(46,189,133,0.28)" : "rgba(229,72,77,0.28)"}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 + i * 0.008 }}
        />
      ))}

      {/* Candles */}
      {candles.map((c, i) => {
        const up = c.c >= c.o;
        const color = up ? "#2EBD85" : "#E5484D";
        const x = i * bw + bw / 2;
        return (
          <motion.g
            key={i}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.012, duration: 0.4 }}
          >
            <line x1={x} x2={x} y1={priceY(c.h)} y2={priceY(c.l)} stroke={color} strokeWidth="1" />
            <rect
              x={i * bw + 1.5}
              width={bw - 3}
              y={priceY(Math.max(c.o, c.c))}
              height={Math.max(1.5, Math.abs(priceY(c.o) - priceY(c.c)))}
              fill={color}
              rx="1"
            />
          </motion.g>
        );
      })}

      {/* VWAP + EMAs */}
      <motion.path
        d={linePath(vwap)}
        stroke="#8A5CFF"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="4 4"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, delay: 0.7 }}
      />
      <motion.path
        d={linePath(ema9)}
        stroke="#4E6BFF"
        strokeWidth="1.2"
        fill="none"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, delay: 0.8 }}
      />
      <motion.path
        d={linePath(ema21)}
        stroke="rgba(244,245,250,0.45)"
        strokeWidth="1.2"
        fill="none"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, delay: 0.9 }}
      />

      {/* Last price line */}
      <line
        x1="0"
        x2={W}
        y1={priceY(closes[closes.length - 1])}
        y2={priceY(closes[closes.length - 1])}
        stroke="#8A5CFF"
        strokeWidth="0.8"
        strokeDasharray="2 3"
        opacity="0.7"
      />
    </svg>
  );
}

/* ── DOM ladder mock ──────────────────────────────────────────────────────── */

function DomLadder({ last, step, decimals }: { last: number; step: number; decimals: number }) {
  const rnd = useMemo(() => mulberry32(1337), []);
  const rows = useMemo(() => {
    return Array.from({ length: 11 }, (_, i) => {
      const offset = 5 - i;
      const price = last + offset * step;
      return {
        price,
        bid: offset < 0 ? Math.floor(20 + rnd() * 240) : offset === 0 ? Math.floor(rnd() * 60) : 0,
        ask: offset > 0 ? Math.floor(20 + rnd() * 240) : offset === 0 ? Math.floor(rnd() * 60) : 0,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last]);

  const maxSize = Math.max(...rows.map((r) => Math.max(r.bid, r.ask)));

  return (
    <div className="flex h-full flex-col font-mono text-[10px]">
      <div className="grid grid-cols-3 border-b border-white/6 px-2 py-1.5 text-[9px] uppercase tracking-wider text-muted-foreground/60">
        <span>Bid</span>
        <span className="text-center">Price</span>
        <span className="text-right">Ask</span>
      </div>
      {rows.map((row, i) => {
        const isLast = i === 5;
        return (
          <div
            key={i}
            className={cn(
              "relative grid flex-1 grid-cols-3 items-center px-2",
              isLast && "bg-brand-violet/10"
            )}
          >
            {row.bid > 0 ? (
              <>
                <div
                  className="absolute inset-y-0.5 left-0 rounded-r bg-up/12"
                  style={{ width: `${(row.bid / maxSize) * 45}%` }}
                />
                <span className="relative text-up">{row.bid}</span>
              </>
            ) : (
              <span />
            )}
            <span
              className={cn(
                "text-center tabular",
                isLast ? "font-semibold text-foreground" : "text-muted-foreground"
              )}
            >
              {formatPrice(row.price, decimals)}
            </span>
            {row.ask > 0 ? (
              <>
                <div
                  className="absolute inset-y-0.5 right-0 rounded-l bg-down/12"
                  style={{ width: `${(row.ask / maxSize) * 45}%` }}
                />
                <span className="relative text-right text-down">{row.ask}</span>
              </>
            ) : (
              <span />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── The full terminal frame ──────────────────────────────────────────────── */

export function SectionPlatform() {
  const [active, setActive] = useState(0);
  const [tick, setTick] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 1], [10, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.4], [0.4, 1]);

  // Subtle "live" price flicker after hydration.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(id);
  }, []);

  const symbol = SYMBOLS[active];
  const flick = Math.sin(tick * 1.7 + active) * symbol.step * 1.2;
  const last = symbol.start + symbol.step * 14 + flick;
  const change = 0.42 + Math.sin(tick * 0.6) * 0.05;

  return (
    <section id="platform" className="relative py-28 sm:py-36">
      {/* Ambient glow behind the terminal */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-violet/8 blur-[180px]"
        aria-hidden
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="The Platform"
          title="Bloomberg-grade data. Apple-grade design."
          lede="A trading terminal that respects your attention. Charts, depth, order flow, and risk — arranged with intent, rendered at speed."
        />

        <div ref={containerRef} className="mt-16" style={{ perspective: 1400 }}>
          <motion.div
            style={{ rotateX, scale, opacity, transformStyle: "preserve-3d" }}
            className="border-gradient overflow-hidden rounded-3xl shadow-[0_48px_120px_-32px_rgba(0,0,0,0.9)]"
          >
            {/* Terminal top bar */}
            <div className="flex items-center justify-between border-b border-white/6 bg-[#0B0B12]/90 px-4 py-2.5">
              <div className="flex items-center gap-1">
                {SYMBOLS.map((s, i) => (
                  <button
                    key={s.sym}
                    onClick={() => setActive(i)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 font-mono text-xs transition-all",
                      i === active
                        ? "bg-brand-violet/15 text-brand-lilac"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                  >
                    {s.sym}
                  </button>
                ))}
              </div>
              <div className="hidden items-center gap-4 font-mono text-xs sm:flex">
                <span className="tabular text-foreground">{formatPrice(last, symbol.decimals)}</span>
                <span className="tabular text-up">+{change.toFixed(2)}%</span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-1.5 animate-pulse rounded-full bg-up" />
                  LIVE
                </span>
              </div>
            </div>

            <div className="grid bg-[#08080d] lg:grid-cols-[1fr_190px]">
              {/* Chart pane */}
              <div className="relative p-4">
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground">
                  <span className="text-foreground">{symbol.name} · 5m</span>
                  <span className="text-brand-lilac">VWAP</span>
                  <span className="text-brand-blue">EMA 9</span>
                  <span className="text-foreground/50">EMA 21</span>
                  <span>VOL</span>
                </div>
                <ChartMock seed={symbol.seed} start={symbol.start} step={symbol.step} />
              </div>

              {/* DOM pane */}
              <div className="hidden border-l border-white/6 lg:block">
                <div className="border-b border-white/6 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  Depth of Market
                </div>
                <div className="h-[calc(100%-33px)]">
                  <DomLadder last={last} step={symbol.step} decimals={symbol.decimals} />
                </div>
              </div>
            </div>

            {/* Risk strip */}
            <div className="grid grid-cols-2 gap-px border-t border-white/6 bg-white/[0.02] font-mono text-[10px] sm:grid-cols-4">
              {[
                { label: "Position", value: "+2 NQ", tone: "text-up" },
                { label: "Unrealized", value: "+$1,240", tone: "text-up" },
                { label: "Daily Loss Limit", value: "$1,500 / $2,000", tone: "text-foreground" },
                { label: "R:R on Setup", value: "1 : 3.2", tone: "text-brand-lilac" },
              ].map((cell) => (
                <div key={cell.label} className="px-4 py-3">
                  <div className="mb-0.5 text-[9px] uppercase tracking-wider text-muted-foreground/60">
                    {cell.label}
                  </div>
                  <div className={cn("tabular", cell.tone)}>{cell.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
