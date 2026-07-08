import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="We'll email you a secure reset link"
      footer={{ text: "Remembered it?", linkLabel: "Back to sign in", href: "/login" }}
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
