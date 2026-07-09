import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { FUTURES_SYMBOLS, getQuotesAsync } from "@/lib/market-data";
import { cn, formatCompact, formatPercent, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Markets" };

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  index: "Equity Index",
  energy: "Energy",
  metals: "Metals",
  crypto: "Crypto",
  fx: "Forex",
  equity: "Stocks",
};

export default async function MarketsPage() {
  const quotes = await getQuotesAsync(FUTURES_SYMBOLS.map((s) => s.symbol));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Markets</h1>
        <p className="text-sm text-muted-foreground">
          Futures, crypto, forex, and equities — live snapshot.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/6 bg-surface/70">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-white/6 text-left text-[11px] uppercase tracking-wider text-muted-foreground/60">
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Contract</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Last</th>
                <th className="px-4 py-3 text-right font-medium">Change</th>
                <th className="px-4 py-3 text-right font-medium">Volume</th>
                <th className="px-4 py-3 text-right font-medium">Tick Value</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {FUTURES_SYMBOLS.map((meta, i) => {
                const q = quotes[i];
                const up = q.change >= 0;
                return (
                  <tr
                    key={meta.symbol}
                    className="border-b border-white/4 transition-colors last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3.5 font-mono font-semibold text-foreground">
                      {meta.symbol}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{meta.name}</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-muted-foreground">
                        {CATEGORY_LABELS[meta.category]} · {meta.exchange}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular">
                      {formatPrice(q.last, meta.decimals)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3.5 text-right font-mono tabular",
                        up ? "text-up" : "text-down"
                      )}
                    >
                      {formatPercent(q.changePercent)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular text-muted-foreground">
                      {formatCompact(q.volume)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono tabular text-muted-foreground">
                      ${meta.tickValue}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/dashboard/charts?symbol=${meta.symbol}`}
                        className="inline-flex items-center gap-1 text-xs text-brand-lilac transition-colors hover:text-brand-blue"
                      >
                        Chart
                        <ArrowUpRight className="size-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
