"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

type Status = "verifying" | "success" | "error";

export function VerifyEmailClient({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [message, setMessage] = useState<string>(
    token ? "Verifying your email…" : "This verification link is invalid."
  );
  const fired = useRef(false);

  useEffect(() => {
    if (!token || fired.current) return;
    fired.current = true; // guard against double-invoke in React strict mode

    void (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as { message?: string; error?: string };
        if (res.ok) {
          setStatus("success");
          setMessage(data.message ?? "Email verified.");
        } else {
          setStatus("error");
          setMessage(data.error ?? "Verification failed.");
        }
      } catch {
        setStatus("error");
        setMessage("Network error — please try again.");
      }
    })();
  }, [token]);

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/5">
        {status === "verifying" ? (
          <Loader2 className="size-7 animate-spin text-brand-lilac" />
        ) : status === "success" ? (
          <CheckCircle2 className="size-7 text-up" />
        ) : (
          <XCircle className="size-7 text-destructive" />
        )}
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>

      {status === "success" ? (
        <Button asChild variant="gradient" className="w-full" size="lg">
          <Link href="/login">Sign In to Your Account</Link>
        </Button>
      ) : status === "error" ? (
        <Button asChild variant="glass" className="w-full" size="lg">
          <Link href="/login">Back to Sign In</Link>
        </Button>
      ) : null}
    </div>
  );
}
