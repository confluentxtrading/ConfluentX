import type { Metadata } from "next";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ReplayClient } from "./replay-client";

export const metadata: Metadata = { title: "Replay" };

export default async function ReplayPage() {
  const session = await auth();
  const settings = session?.user?.id
    ? await db.userSettings.findUnique({ where: { userId: session.user.id } })
    : null;

  return <ReplayClient defaultSymbol={settings?.defaultSymbol ?? "NQ"} />;
}
