"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { FUTURES_SYMBOLS } from "@/lib/market-data";
import { cn, formatPrice } from "@/lib/utils";

interface AlertRow {
  id: string;
  symbol: string;
  condition: "PRICE_ABOVE" | "PRICE_BELOW" | "CROSSES";
  price: number;
  note: string | null;
  active: boolean;
  triggered: boolean;
}

const CONDITION_LABELS = {
  PRICE_ABOVE: "Price above",
  PRICE_BELOW: "Price below",
  CROSSES: "Crosses",
} as const;

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // New-alert form state
  const [symbol, setSymbol] = useState("NQ");
  const [condition, setCondition] = useState<AlertRow["condition"]>("PRICE_ABOVE");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/alerts");
    if (!res.ok) return;
    const data = (await res.json()) as { alerts: AlertRow[] };
    setAlerts(data.alerts);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    const priceNum = Number(price);
    if (!price || Number.isNaN(priceNum) || priceNum <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, condition, price: priceNum, note: note || undefined }),
      });
      if (res.ok) {
        toast.success("Alert created");
        setOpen(false);
        setPrice("");
        setNote("");
        await load();
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Could not create alert");
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggle(alert: AlertRow) {
    await fetch(`/api/alerts/${alert.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !alert.active }),
    });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    toast.success("Alert deleted");
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Price alerts, delivered by email and in-app.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" size="sm">
              <Plus />
              New Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create price alert</DialogTitle>
              <DialogDescription>
                You&apos;ll be notified when the condition triggers.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex h-11 w-full items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 font-mono text-sm">
                      {symbol}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {FUTURES_SYMBOLS.map((s) => (
                        <DropdownMenuItem
                          key={s.symbol}
                          onClick={() => setSymbol(s.symbol)}
                          className="font-mono"
                        >
                          {s.symbol}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex h-11 w-full items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm">
                      {CONDITION_LABELS[condition]}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {(Object.keys(CONDITION_LABELS) as AlertRow["condition"][]).map((c) => (
                        <DropdownMenuItem key={c} onClick={() => setCondition(c)}>
                          {CONDITION_LABELS[c]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="alert-price">Price</Label>
                <Input
                  id="alert-price"
                  inputMode="decimal"
                  placeholder="21500.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alert-note">Note (optional)</Label>
                <Input
                  id="alert-note"
                  placeholder="Prior session high"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <Button variant="gradient" className="w-full" disabled={busy} onClick={() => void create()}>
                {busy ? <Loader2 className="animate-spin" /> : <BellRing />}
                Create Alert
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {alerts === null ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-muted-foreground">
          No alerts yet. Create one to get notified at your key levels.
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={cn(
                "group flex items-center justify-between rounded-2xl border border-white/6 bg-surface/70 px-5 py-4 transition-all hover:border-white/12",
                !alert.active && "opacity-55"
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl",
                    alert.triggered
                      ? "bg-up/12 text-up"
                      : "bg-brand-violet/12 text-brand-lilac"
                  )}
                >
                  <BellRing className="size-4" />
                </div>
                <div>
                  <div className="font-mono text-sm">
                    <span className="font-semibold">{alert.symbol}</span>{" "}
                    <span className="text-muted-foreground">
                      {CONDITION_LABELS[alert.condition].toLowerCase()}
                    </span>{" "}
                    <span className="tabular">{formatPrice(alert.price)}</span>
                  </div>
                  {alert.note ? (
                    <div className="text-xs text-muted-foreground">{alert.note}</div>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={alert.active}
                  onCheckedChange={() => void toggle(alert)}
                  aria-label="Toggle alert"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => void remove(alert.id)}
                  aria-label="Delete alert"
                >
                  <Trash2 className="text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
