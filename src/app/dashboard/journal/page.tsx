import type { Metadata } from "next";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { getDashboardData } from "@/lib/mock/dashboard";
import { cn, formatPnl, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Trade Journal" };

interface JournalRow {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number | null;
  setup: string | null;
  executedAt: Date;
  sample?: boolean;
}

export default async function JournalPage() {
  const session = await auth();

  const dbEntries: JournalRow[] = session?.user?.id
    ? (
        await db.journalEntry.findMany({
          where: { userId: session.user.id },
          orderBy: { executedAt: "desc" },
          take: 50,
        })
      ).map((e) => ({
        id: e.id,
        symbol: e.symbol,
        side: e.side,
        quantity: e.quantity,
        entryPrice: e.entryPrice,
        exitPrice: e.exitPrice,
        pnl: e.pnl,
        setup: e.setup,
        executedAt: e.executedAt,
      }))
    : [];

  // Until the user has real entries, show sample rows so the page teaches
  // what the journal will look like.
  const usingSample = dbEntries.length === 0;
  const entries: JournalRow[] = usingSample
    ? getDashboardData().recentTrades.map((t) => ({
        id: t.id,
        symbol: t.symbol,
        side: t.side,
        quantity: t.quantity,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        pnl: t.pnl,
        setup: t.setup,
        executedAt: new Date(),
        sample: true,
      }))
    : dbEntries;

  const closed = entries.filter((e) => e.pnl !== null);
  const totalPnl = closed.reduce((s, e) => s + (e.pnl ?? 0), 0);
  const wins = closed.filter((e) => (e.pnl ?? 0) > 0).length;
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
  const grossWin = closed.reduce((s, e) => s + Math.max(0, e.pnl ?? 0), 0);
  const grossLoss = Math.abs(closed.reduce((s, e) => s + Math.min(0, e.pnl ?? 0), 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  const stats = [
    { label: "Net P&L", value: formatPnl(totalPnl), tone: totalPnl >= 0 ? "text-up" : "text-down" },
    { label: "Trades", value: String(closed.length), tone: "text-foreground" },
    { label: "Win rate", value: `${winRate.toFixed(0)}%`, tone: "text-foreground" },
    {
      label: "Profit factor",
      value: Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : "∞",
      tone: "text-foreground",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Trade Journal</h1>
          <p className="text-sm text-muted-foreground">
            Every execution, captured and reviewable.
          </p>
        </div>
        {usingSample ? <Badge variant="outline">Sample data</Badge> : null}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/6 bg-surface/70 px-5 py-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
              {s.label}
            </div>
            <div className={cn("mt-1 font-mono text-xl font-semibold tabular", s.tone)}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/6 bg-surface/70">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-white/6 text-left text-[11px] uppercase tracking-wider text-muted-foreground/60">
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Side</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Entry</th>
                <th className="px-4 py-3 text-right font-medium">Exit</th>
                <th className="px-4 py-3 font-medium">Setup</th>
                <th className="px-4 py-3 text-right font-medium">P&L</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-white/4 last:border-0 hover:bg-white/[0.03]">
                  <td className="px-4 py-3 font-semibold text-foreground">{e.symbol}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                        e.side === "LONG" ? "bg-up/12 text-up" : "bg-down/12 text-down"
                      )}
                    >
                      {e.side}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular">{e.quantity}</td>
                  <td className="px-4 py-3 text-right tabular text-muted-foreground">
                    {formatPrice(e.entryPrice)}
                  </td>
                  <td className="px-4 py-3 text-right tabular text-muted-foreground">
                    {e.exitPrice !== null ? formatPrice(e.exitPrice) : "—"}
                  </td>
                  <td className="px-4 py-3 font-sans text-muted-foreground">{e.setup ?? "—"}</td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right tabular",
                      (e.pnl ?? 0) >= 0 ? "text-up" : "text-down"
                    )}
                  >
                    {e.pnl !== null ? formatPnl(e.pnl) : "open"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
