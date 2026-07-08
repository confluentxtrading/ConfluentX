"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

// The 3D scene is heavy — load it client-side only, after hydration, and
// never block the LCP text content on it.
const HeroScene = dynamic(() => import("@/components/three/hero-scene"), {
  ssr: false,
  loading: () => null,
});

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden">
      {/* Static ambient gradient — always present, instant paint */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-[8%] h-[55vh] w-[90vw] -translate-x-1/2 rounded-full bg-brand-violet/14 blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[40vh] w-[45vw] rounded-full bg-brand-blue/8 blur-[140px]" />
      </div>

      {/* 3D emblem — skipped for reduced-motion users */}
      {!reducedMotion ? (
        <div className="absolute inset-0 hidden sm:block">
          <HeroScene />
        </div>
      ) : null}

      {/* Readability vignette over the canvas */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(5,5,7,0.55)_75%,#050507_100%)]"
        aria-hidden
      />

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 text-center">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
          className="mb-6 rounded-full glass px-4 py-1.5 text-xs font-medium tracking-[0.2em] text-brand-lilac uppercase"
        >
          Confluence · Precision · Execution
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
          className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
        >
          Precision Meets
          <br />
          <span className="text-gradient">Confluence.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.45, ease: EASE }}
          className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          Professional futures trading software. Institutional-grade charts, order flow,
          and risk management — engineered for traders who demand more.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.6, ease: EASE }}
          className="mt-9 flex flex-col gap-3 sm:flex-row"
        >
          <Button asChild variant="gradient" size="xl">
            <Link href="/register">
              Get Started
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="glass" size="xl">
            <Link href="/dashboard">View Dashboard</Link>
          </Button>
          <Button asChild variant="ghost" size="xl">
            <Link href="/#platform">
              <PlayCircle />
              Live Demo
            </Link>
          </Button>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
        aria-hidden
      >
        <motion.div
          animate={reducedMotion ? undefined : { y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
        >
          <ChevronDown className="size-5 text-muted-foreground/60" />
        </motion.div>
      </motion.div>
    </section>
  );
}
