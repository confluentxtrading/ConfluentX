import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-36 sm:px-6">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated: July 2026</p>

      <div className="prose-invert mt-10 space-y-8 text-sm leading-relaxed text-foreground/80">
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
            1. Information we collect
          </h2>
          <p>
            We collect the information you provide when creating an account (name, email,
            password hash), usage data required to operate the platform (device sessions,
            preferences, journal entries, watchlists, alerts), and technical data such as
            IP address and browser type for security auditing.
          </p>
        </section>
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
            2. How we use it
          </h2>
          <p>
            Your data is used to provide and secure the service: authenticating you,
            syncing your workspace, sending transactional emails (verification, password
            resets, security alerts), and improving platform reliability. We do not sell
            personal data.
          </p>
        </section>
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
            3. Security
          </h2>
          <p>
            Passwords are hashed with bcrypt. Sessions use encrypted, HTTP-only cookies.
            Two-factor authentication is available on every account. New device sign-ins
            trigger email alerts.
          </p>
        </section>
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
            4. Data retention & export
          </h2>
          <p>
            You can export your journal and settings at any time. After account deletion,
            personal data is removed within 30 days except where retention is required by
            law.
          </p>
        </section>
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold text-foreground">
            5. Contact
          </h2>
          <p>
            Questions about this policy: <a className="text-brand-lilac" href="mailto:privacy@confluentx.com">privacy@confluentx.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
