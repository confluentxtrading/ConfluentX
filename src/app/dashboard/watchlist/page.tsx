"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { FUTURES_SYMBOLS, type Quote } from "@/lib/market-data";
import { cn, formatPercent, formatPrice } from "@/lib/utils";

interface WatchlistEntry {
  symbol: string;
  quote: Quote | null;
}

export default function WatchlistPage() {
  const [entries, setEntries] = useState<WatchlistEntry[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/watchlist");
    if (!res.ok) return;
    const data = (await res.json()) as { items: { symbol: string }[] };
    const symbols = data.items.map((i) => i.symbol);
    if (symbols.length === 0) {
      setEntries([]);
      return;
    }
    const quotesRes = await fetch(`/api/watchlist/quotes?symbols=${symbols.join(",")}`);
    const quotesData = quotesRes.ok
      ? ((await quotesRes.json()) as { quotes: Quote[] })
      : { quotes: [] };
    setEntries(
      symbols.map((s) => ({
        symbol: s,
        quote: quotesData.quotes.find((q) => q.symbol === s) ?? null,
      }))
    );
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 10_000);
    return () => clearInterval(id);
  }, [load]);

  async function add(symbol: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      if (res.ok) {
        toast.success(`${symbol} added to watchlist`);
        await load();
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Could not add symbol");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(symbol: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/watchlist?symbol=${symbol}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`${symbol} removed`);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  const available = FUTURES_SYMBOLS.filter(
    (s) => !entries?.some((e) => e.symbol === s.symbol)
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Watchlist</h1>
          <p className="text-sm text-muted-foreground">Your instruments, quoted live.</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="gradient" size="sm" disabled={busy || available.length === 0}>
              {busy ? <Loader2 className="animate-spin" /> : <Plus />}
              Add Symbol
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {available.map((s) => (
              <DropdownMenuItem key={s.symbol} onClick={() => void add(s.symbol)} className="font-mono">
                <span className="w-10 font-semibold">{s.symbol}</span>
                <span className="text-xs text-muted-foreground">{s.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {entries === null ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-muted-foreground">
          Your watchlist is empty. Add NQ, ES, or any CME future to get started.
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => {
            const meta = FUTURES_SYMBOLS.find((s) => s.symbol === entry.symbol);
            const q = entry.quote;
            const up = (q?.change ?? 0) >= 0;
            return (
              <li
                key={entry.symbol}
                className="group flex items-center justify-between rounded-2xl border border-white/6 bg-surface/70 px-5 py-4 transition-all hover:border-white/12"
              >
                <div>
                  <div className="font-mono text-base font-semibold">{entry.symbol}</div>
                  <div className="text-xs text-muted-foreground">{meta?.name}</div>
                </div>
                <div className="flex items-center gap-6">
                  {q ? (
                    <div className="text-right font-mono">
                      <div className="tabular text-sm">{formatPrice(q.last, meta?.decimals ?? 2)}</div>
                      <div className={cn("tabular text-xs", up ? "text-up" : "text-down")}>
                        {formatPercent(q.changePercent)}
                      </div>
                    </div>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => void remove(entry.symbol)}
                    aria-label={`Remove ${entry.symbol}`}
                  >
                    <Trash2 className="text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
