"use client";

import { Reveal, SectionHeading } from "@/components/motion/reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Which markets does ConfluentX support?",
    a: "CME Group futures at launch: equity indices (NQ, ES, YM, RTY and their micros MNQ, MES), energy (CL), and metals (GC). Additional exchanges are on the roadmap.",
  },
  {
    q: "Do I need a broker account?",
    a: "For live trading, yes — ConfluentX connects to supported futures brokers and clearing firms. You can chart, replay, and journal without a broker connection on any plan.",
  },
  {
    q: "Is my data real-time?",
    a: "Pro and Institutional plans include real-time CME market data (exchange fees may apply depending on your professional status). The Free plan uses 15-minute delayed data.",
  },
  {
    q: "How does the risk management engine work?",
    a: "You define hard limits — daily loss, max contracts, max trades per session. The platform enforces them at the execution layer: once a limit is hit, new orders are blocked and open positions can be auto-flattened.",
  },
  {
    q: "Can I use ConfluentX on multiple machines?",
    a: "Yes. Workspaces, layouts, journals, and settings sync through the cloud. Sign in anywhere and your desk follows you.",
  },
  {
    q: "What happens to my journal data if I cancel?",
    a: "Your data is yours. You can export your full journal and settings at any time, and we retain them for 90 days after cancellation in case you return.",
  },
];

export function SectionFaq() {
  return (
    <section id="faq" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Questions, answered." />

        <Reveal className="mt-14" delay={0.1}>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger>{faq.q}</AccordionTrigger>
                <AccordionContent>{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
