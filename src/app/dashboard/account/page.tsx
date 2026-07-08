import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MonitorSmartphone } from "lucide-react";

import { auth } from "@/auth";
import { SecurityCard } from "./security-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Account" };

const TIER_LABELS: Record<string, string> = {
  FREE: "Free",
  PRO: "Pro",
  INSTITUTIONAL: "Institutional",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, devices] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      include: { subscription: true, accounts: true },
    }),
    db.deviceSession.findMany({
      where: { userId: session.user.id },
      orderBy: { lastActiveAt: "desc" },
      take: 8,
    }),
  ]);

  if (!user) redirect("/login");

  const initials = (user.name ?? "T")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const hasPassword = Boolean(user.passwordHash);
  const oauthProviders = user.accounts.map((a) => a.provider);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">Profile, plan, and security.</p>
      </div>

      {/* Profile */}
      <section className="flex items-center gap-4 rounded-2xl border border-white/6 bg-surface/70 p-6">
        <Avatar className="size-14">
          {user.image ? <AvatarImage src={user.image} alt={user.name ?? ""} /> : null}
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg font-semibold">{user.name}</div>
          <div className="truncate text-sm text-muted-foreground">{user.email}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {user.emailVerified ? (
              <Badge variant="up" className="text-[10px]">Verified</Badge>
            ) : (
              <Badge variant="down" className="text-[10px]">Unverified</Badge>
            )}
            {oauthProviders.includes("google") ? (
              <Badge variant="outline" className="text-[10px]">Google linked</Badge>
            ) : null}
          </div>
        </div>
        <Badge className="shrink-0">
          {TIER_LABELS[user.subscription?.tier ?? "FREE"]} Plan
        </Badge>
      </section>

      {/* Security (client interactivity: 2FA toggle, delete) */}
      <SecurityCard
        isTwoFactorEnabled={user.isTwoFactorEnabled}
        hasPassword={hasPassword}
      />

      {/* Devices */}
      <section className="rounded-2xl border border-white/6 bg-surface/70 p-6">
        <h2 className="font-display text-base font-semibold">Devices</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Devices that have signed in to your account. New devices trigger an email alert.
        </p>
        <ul className="mt-5 space-y-3">
          {devices.length === 0 ? (
            <li className="text-sm text-muted-foreground">No device history yet.</li>
          ) : (
            devices.map((d) => (
              <li key={d.id} className="flex items-center gap-3 text-sm">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/5 text-muted-foreground">
                  <MonitorSmartphone className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-foreground">
                    {d.browser} on {d.os}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {d.ip ?? "unknown IP"} · last active{" "}
                    {d.lastActiveAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
