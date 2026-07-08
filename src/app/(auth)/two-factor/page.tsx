import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { TwoFactorForm } from "@/components/auth/two-factor-form";

export const metadata: Metadata = { title: "Two-Factor Authentication" };

export default function TwoFactorPage() {
  return (
    <AuthCard
      title="Two-factor authentication"
      subtitle="Enter the 6-digit code we sent to your email"
      footer={{ text: "Wrong account?", linkLabel: "Back to sign in", href: "/login" }}
    >
      <Suspense>
        <TwoFactorForm />
      </Suspense>
    </AuthCard>
  );
}
