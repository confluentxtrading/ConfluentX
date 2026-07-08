"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";

export function SectionCta() {
  return (
    <section className="relative overflow-hidden py-28 sm:py-36">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[50vh] w-[70vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-violet/14 blur-[160px]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <Reveal>
          <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Your edge is waiting
            <br />
            <span className="text-gradient">at the confluence.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Set up your workspace in under two minutes. No credit card required.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="gradient" size="xl">
              <Link href="/register">
                Get Started Free
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="glass" size="xl">
              <Link href="/#pricing">Compare Plans</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
