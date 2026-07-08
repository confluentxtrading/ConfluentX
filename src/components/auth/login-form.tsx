"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuthFlow } from "@/store/auth-flow";

const formSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

type FormValues = z.infer<typeof formSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const oauthError = searchParams.get("error");
  const setCredentials = useAuthFlow((s) => s.setCredentials);

  const [error, setError] = useState<string | null>(
    oauthError === "OAuthAccountNotLinked"
      ? "That email is already registered with a password. Sign in with email instead."
      : null
  );
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json()) as {
        status?: string;
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      if (data.status === "verification_sent") {
        setInfo(data.message ?? "Check your inbox to verify your email.");
        return;
      }
      if (data.status === "two_factor_required") {
        setCredentials(values.email, values.password);
        router.push(`/two-factor?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }
      // Full navigation so the fresh session cookie is picked up everywhere.
      window.location.assign(callbackUrl);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="trader@confluentx.com"
                  autoComplete="email"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground transition-colors hover:text-brand-lilac"
                >
                  Forgot password?
                </Link>
              </div>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="rounded-xl border border-brand-blue/30 bg-brand-blue/10 px-4 py-2.5 text-sm text-brand-blue">
            {info}
          </p>
        ) : null}

        <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : null}
          Sign In
        </Button>
      </form>
    </Form>
  );
}
