"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { FUTURES_SYMBOLS, TIMEFRAMES } from "@/lib/market-data";

interface Settings {
  defaultSymbol: string;
  defaultTimeframe: string;
  showVolume: boolean;
  showVwap: boolean;
  emaFast: number;
  emaSlow: number;
  riskPerTradePct: number;
  dailyLossLimit: number;
  maxContracts: number;
  emailAlerts: boolean;
  emailNewsletter: boolean;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/6 bg-surface/70 p-6">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = (await res.json()) as { settings: Settings };
        setSettings(data.settings);
      }
    })();
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) toast.success("Settings saved");
      else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Could not save settings");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => (s ? { ...s, [key]: value } : s));

  const numberInput = (
    key: keyof Settings,
    label: string,
    step = "1"
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        step={step}
        value={String(settings[key])}
        onChange={(e) => set(key, Number(e.target.value) as never)}
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Workspace, chart, and risk defaults.</p>
        </div>
        <Button variant="gradient" size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Save
        </Button>
      </div>

      <Section title="Chart defaults" description="Applied when opening a new chart.">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Default symbol</Label>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-11 w-full items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 font-mono text-sm">
                {settings.defaultSymbol}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {FUTURES_SYMBOLS.map((s) => (
                  <DropdownMenuItem
                    key={s.symbol}
                    className="font-mono"
                    onClick={() => set("defaultSymbol", s.symbol)}
                  >
                    {s.symbol}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="space-y-2">
            <Label>Default timeframe</Label>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-11 w-full items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 font-mono text-sm">
                {settings.defaultTimeframe}
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {TIMEFRAMES.map((tf) => (
                  <DropdownMenuItem
                    key={tf.value}
                    className="font-mono"
                    onClick={() => set("defaultTimeframe", tf.value)}
                  >
                    {tf.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {numberInput("emaFast", "Fast EMA period")}
          {numberInput("emaSlow", "Slow EMA period")}
        </div>
        <SwitchRow
          label="Volume"
          hint="Show the volume histogram on charts"
          checked={settings.showVolume}
          onChange={(v) => set("showVolume", v)}
        />
        <SwitchRow
          label="VWAP"
          hint="Show session VWAP on charts"
          checked={settings.showVwap}
          onChange={(v) => set("showVwap", v)}
        />
      </Section>

      <Section
        title="Risk management"
        description="Hard limits enforced across your workspace."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {numberInput("riskPerTradePct", "Risk per trade (%)", "0.1")}
          {numberInput("dailyLossLimit", "Daily loss limit ($)", "50")}
          {numberInput("maxContracts", "Max contracts")}
        </div>
      </Section>

      <Section title="Notifications" description="What lands in your inbox.">
        <SwitchRow
          label="Alert emails"
          hint="Email me when a price alert triggers"
          checked={settings.emailAlerts}
          onChange={(v) => set("emailAlerts", v)}
        />
        <SwitchRow
          label="Product updates"
          hint="Occasional feature announcements"
          checked={settings.emailNewsletter}
          onChange={(v) => set("emailNewsletter", v)}
        />
      </Section>
    </div>
  );
}
