import type { Metadata } from "next";

import { auth } from "@/auth";
import {
  AccountOverview,
  EconomicCalendar,
  OpenPositions,
  PerformanceGraph,
  QuoteList,
  RecentTrades,
  RiskMetrics,
} from "@/components/dashboard/widgets";
import { db } from "@/lib/db";
import { DEFAULT_WATCHLIST, FUTURES_SYMBOLS, marketData } from "@/lib/market-data";
import { getDashboardData } from "@/lib/mock/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const data = getDashboardData();

  // User watchlist (falls back to the default futures set).
  const items = session?.user?.id
    ? await db.watchlistItem.findMany({
        where: { userId: session.user.id },
        orderBy: { sortOrder: "asc" },
      })
    : [];
  const watchlistSymbols =
    items.length > 0 ? items.map((i) => i.symbol) : DEFAULT_WATCHLIST;

  const watchlistQuotes = marketData.getQuotes(watchlistSymbols);
  const moverQuotes = marketData.getQuotes(FUTURES_SYMBOLS.map((s) => s.symbol));

  const firstName = session?.user?.name?.split(" ")[0] ?? "Trader";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Good session, {firstName}.
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s your desk at a glance.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <AccountOverview account={data.account} />
          <OpenPositions positions={data.positions} />
          <div className="grid gap-4 md:grid-cols-2">
            <RecentTrades trades={data.recentTrades} />
            <EconomicCalendar events={data.econEvents} />
          </div>
          <PerformanceGraph curve={data.equityCurve} />
        </div>

        <div className="space-y-4">
          <QuoteList title="Watchlist" quotes={watchlistQuotes} delay={0.05} />
          <QuoteList title="Market Movers" quotes={moverQuotes} delay={0.1} sortByMove />
          <RiskMetrics risk={data.risk} />
        </div>
      </div>
    </div>
  );
}
