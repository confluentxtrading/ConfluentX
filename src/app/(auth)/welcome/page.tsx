import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Account Created" };

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <AuthCard title="Account created" subtitle="One step left — verify your email">
      <div className="space-y-5 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-violet/15 glow-violet">
          <MailCheck className="size-8 text-brand-lilac" />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We sent a verification link to{" "}
          {email ? (
            <span className="font-medium text-foreground">{email}</span>
          ) : (
            "your inbox"
          )}
          . Click it to activate your account — the link expires in 1 hour.
        </p>
        <p className="text-xs text-muted-foreground/70">
          Didn&apos;t get it? Check your spam folder, or sign in to receive a fresh link.
        </p>
        <Button asChild variant="glass" className="w-full" size="lg">
          <Link href="/login">Go to Sign In</Link>
        </Button>
      </div>
    </AuthCard>
  );
}
