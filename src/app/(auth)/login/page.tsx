import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { SocialButtons } from "@/components/auth/social-buttons";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your trading workspace"
      footer={{ text: "New to ConfluentX?", linkLabel: "Create an account", href: "/register" }}
    >
      <div className="space-y-4">
        <Suspense>
          <SocialButtons />
          <LoginForm />
        </Suspense>
      </div>
    </AuthCard>
  );
}
