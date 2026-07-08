import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { SessionProvider } from "next-auth/react";

import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/shell";
import { recordDeviceSession } from "@/lib/device";
import { getClientIp } from "@/lib/rate-limit";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  // Device auditing (covers OAuth sign-ins too). Fire-and-forget — never
  // block rendering on it.
  const h = await headers();
  void recordDeviceSession({
    userId: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    userAgent: h.get("user-agent") ?? "unknown",
    ip: getClientIp(h),
  }).catch(() => {});

  return (
    <SessionProvider session={session}>
      <DashboardShell
        user={{
          name: session.user.name ?? "Trader",
          email: session.user.email ?? "",
          image: session.user.image ?? null,
        }}
      >
        {children}
      </DashboardShell>
    </SessionProvider>
  );
}
