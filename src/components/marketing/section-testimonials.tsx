"use client";

import { SectionHeading, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const TESTIMONIALS = [
  {
    quote:
      "The first platform where the software gets out of the way. My DOM, my footprint, my risk — everything is exactly where my eyes expect it.",
    name: "Marcus Reed",
    role: "Prop trader · 11y futures",
    initials: "MR",
  },
  {
    quote:
      "We moved our whole desk off a legacy terminal. Execution latency dropped, and the journal alone changed how our juniors review sessions.",
    name: "Elena Vasquez",
    role: "Head of Trading, private fund",
    initials: "EV",
  },
  {
    quote:
      "ConfluentX feels like it was designed by people who actually sit through the London open. Nothing flashy. Everything fast.",
    name: "Daniel Okafor",
    role: "Index futures scalper",
    initials: "DO",
  },
];

export function SectionTestimonials() {
  return (
    <section id="testimonials" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Traders"
          title="Trusted at the open."
          lede="Professionals who trade size, every session, on ConfluentX."
        />

        <Stagger className="mt-16 grid gap-4 md:grid-cols-3" stagger={0.12}>
          {TESTIMONIALS.map((t) => (
            <StaggerItem key={t.name}>
              <figure className="glass flex h-full flex-col justify-between rounded-3xl p-8 transition-all duration-500 hover:border-white/15">
                <blockquote className="text-sm leading-relaxed text-foreground/85">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-8 flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{t.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
