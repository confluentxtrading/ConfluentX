import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-36 sm:px-6">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated: July 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/80">
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
            1. The service
          </h2>
          <p>
            ConfluentX provides futures market analysis, charting, journaling, and
            execution tooling. Access requires an account and acceptance of these terms.
          </p>
        </section>
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
            2. No financial advice
          </h2>
          <p>
            ConfluentX is software, not an advisor. Nothing on the platform constitutes
            investment advice, a recommendation, or a solicitation to buy or sell any
            financial instrument. All trading decisions are yours alone.
          </p>
        </section>
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
            3. Risk disclosure
          </h2>
          <p>
            Trading futures involves substantial risk of loss and is not suitable for all
            investors. You may lose more than your initial investment. Past performance,
            whether actual or simulated, is not indicative of future results.
          </p>
        </section>
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
            4. Accounts & acceptable use
          </h2>
          <p>
            You are responsible for safeguarding your credentials and for all activity on
            your account. Automated scraping, redistribution of market data, and abuse of
            the service are prohibited.
          </p>
        </section>
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
            5. Subscriptions
          </h2>
          <p>
            Paid plans renew automatically until canceled. You may cancel at any time;
            access continues through the end of the paid period.
          </p>
        </section>
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
            6. Contact
          </h2>
          <p>
            Questions about these terms: <a className="text-brand-lilac" href="mailto:legal@confluentx.com">legal@confluentx.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
