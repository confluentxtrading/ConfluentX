import { Hero } from "@/components/marketing/hero";
import { SectionConfluence } from "@/components/marketing/section-confluence";
import { SectionCta } from "@/components/marketing/section-cta";
import { SectionFaq } from "@/components/marketing/section-faq";
import { SectionFeatures } from "@/components/marketing/section-features";
import { SectionPerformance } from "@/components/marketing/section-performance";
import { SectionPlatform } from "@/components/marketing/section-platform";
import { SectionPricing } from "@/components/marketing/section-pricing";
import { SectionTestimonials } from "@/components/marketing/section-testimonials";

export default function HomePage() {
  return (
    <>
      <Hero />
      <SectionConfluence />
      <SectionPlatform />
      <SectionFeatures />
      <SectionPerformance />
      <SectionTestimonials />
      <SectionPricing />
      <SectionFaq />
      <SectionCta />
    </>
  );
}
