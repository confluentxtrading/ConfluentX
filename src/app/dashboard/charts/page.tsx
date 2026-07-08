import type { Metadata } from "next";

import { auth } from "@/auth";
import { ChartsClient } from "./charts-client";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Charts" };

export default async function ChartsPage() {
  const session = await auth();
  const settings = session?.user?.id
    ? await db.userSettings.findUnique({ where: { userId: session.user.id } })
    : null;

  return (
    <ChartsClient
      defaultSymbol={settings?.defaultSymbol ?? "NQ"}
      defaultTimeframe={(settings?.defaultTimeframe as "5m") ?? "5m"}
    />
  );
}
