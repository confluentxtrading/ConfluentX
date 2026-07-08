import type { Metadata } from "next";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { BacktestClient } from "./backtest-client";

export const metadata: Metadata = { title: "Backtest" };

export default async function BacktestPage() {
  const session = await auth();
  const settings = session?.user?.id
    ? await db.userSettings.findUnique({ where: { userId: session.user.id } })
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold">Backtesting</h1>
        <p className="text-sm text-muted-foreground">
          Test entry rules against historical data before risking capital.
        </p>
      </div>
      <BacktestClient defaultSymbol={settings?.defaultSymbol ?? "NQ"} />
    </div>
  );
}
