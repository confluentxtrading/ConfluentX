import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { SocialButtons } from "@/components/auth/social-buttons";

export const metadata: Metadata = { title: "Create Account" };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Precision meets confluence — start free"
      footer={{ text: "Already have an account?", linkLabel: "Sign in", href: "/login" }}
    >
      <div className="space-y-4">
        <Suspense>
          <SocialButtons />
        </Suspense>
        <RegisterForm />
      </div>
    </AuthCard>
  );
}
