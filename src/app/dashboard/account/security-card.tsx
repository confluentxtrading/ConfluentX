"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export function SecurityCard({
  isTwoFactorEnabled,
  hasPassword,
}: {
  isTwoFactorEnabled: boolean;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [twoFactor, setTwoFactor] = useState(isTwoFactorEnabled);
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function toggleTwoFactor(enabled: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTwoFactorEnabled: enabled }),
      });
      if (res.ok) {
        setTwoFactor(enabled);
        toast.success(enabled ? "Two-factor authentication enabled" : "Two-factor disabled");
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Could not update 2FA");
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (res.ok) {
        toast.success("Account deleted");
        await signOut({ callbackUrl: "/" });
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Could not delete account");
        setDeleting(false);
      }
    } catch {
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/6 bg-surface/70 p-6">
      <h2 className="font-display text-base font-semibold">Security</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Protect your account with a second factor.
      </p>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand-violet/12 text-brand-lilac">
            <ShieldCheck className="size-4" />
          </span>
          <div>
            <div className="text-sm font-medium">Two-factor authentication</div>
            <div className="text-xs text-muted-foreground">
              {hasPassword
                ? "A 6-digit code is emailed on every sign-in"
                : "Available for email/password sign-in (you use Google OAuth)"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {busy ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
          <Switch
            checked={twoFactor}
            disabled={busy || !hasPassword}
            onCheckedChange={(v) => void toggleTwoFactor(v)}
          />
        </div>
      </div>

      <div className="mt-6 border-t border-white/5 pt-5">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 />
              Delete Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This permanently removes your profile, watchlists, alerts, journal, and
                settings. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Type <span className="font-mono text-foreground">DELETE</span> to confirm.
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={confirmText !== "DELETE" || deleting}
                onClick={() => void deleteAccount()}
              >
                {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                Permanently Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
