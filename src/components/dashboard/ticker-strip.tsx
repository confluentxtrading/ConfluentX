"use client";

import { useEffect, useState } from "react";

import { DEFAULT_WATCHLIST, type Quote } from "@/lib/market-data";
import { cn, formatPercent, formatPrice } from "@/lib/utils";

/** Compact scrolling quote strip in the dashboard top bar. */
export function TickerStrip() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/watchlist/quotes?symbols=${DEFAULT_WATCHLIST.join(",")}`
        );
        if (!res.ok) return;
        const data = (await res.json()) as { quotes: Quote[] };
        if (!cancelled) setQuotes(data.quotes);
      } catch {
        // Quote strip is decorative — fail silently.
      }
    }
    void load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (quotes.length === 0) return <div className="h-5" />;

  return (
    <div className="flex items-center gap-5 overflow-x-auto font-mono text-xs [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {quotes.map((q) => (
        <div key={q.symbol} className="flex shrink-0 items-center gap-2">
          <span className="font-medium text-foreground/80">{q.symbol}</span>
          <span className="tabular text-foreground">{formatPrice(q.last)}</span>
          <span className={cn("tabular", q.change >= 0 ? "text-up" : "text-down")}>
            {formatPercent(q.changePercent)}
          </span>
        </div>
      ))}
    </div>
  );
}
