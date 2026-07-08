"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthFlow } from "@/store/auth-flow";

const CODE_LENGTH = 6;

export function TwoFactorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const { email, password, clear } = useAuthFlow();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Direct navigation without credentials in memory → back to login.
  useEffect(() => {
    if (!email || !password) router.replace("/login");
  }, [email, password, router]);

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(CODE_LENGTH)
      .fill("")
      .map((_, i) => pasted[i] ?? "");
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  }

  async function submit(codeOverride?: string) {
    const code = codeOverride ?? digits.join("");
    if (code.length !== CODE_LENGTH) {
      setError("Enter the full 6-digit code");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, code }),
      });
      const data = (await res.json()) as { status?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Invalid code");
        return;
      }
      if (data.status === "success") {
        clear();
        window.location.assign(callbackUrl);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setResent(false);
    setError(null);
    // Re-submitting email+password without a code triggers a fresh 2FA email.
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) setResent(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={cn(
              "size-12 rounded-xl border border-white/10 bg-white/[0.03] text-center font-mono text-xl text-foreground transition-all",
              "focus:border-brand-violet/70 focus:outline-none focus:ring-2 focus:ring-brand-violet/25",
              digit && "border-brand-violet/40"
            )}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {resent ? (
        <p className="text-center text-sm text-up">A new code is on its way.</p>
      ) : null}

      <Button
        type="button"
        variant="gradient"
        className="w-full"
        size="lg"
        disabled={loading}
        onClick={() => submit()}
      >
        {loading ? <Loader2 className="animate-spin" /> : null}
        Verify &amp; Sign In
      </Button>

      <button
        type="button"
        onClick={() => void resend()}
        className="mx-auto block text-sm text-muted-foreground transition-colors hover:text-brand-lilac"
      >
        Didn&apos;t get a code? Resend
      </button>
    </div>
  );
}
