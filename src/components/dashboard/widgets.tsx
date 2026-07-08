"use client";

import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Flame,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import type { Quote } from "@/lib/market-data";
import type { DashboardData } from "@/lib/mock/dashboard";
import { cn, formatPercent, formatPnl, formatPrice } from "@/lib/utils";

/* ── Shared widget chrome ─────────────────────────────────────────────────── */

export function WidgetCard({
  title,
  action,
  children,
  className,
  delay = 0,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-white/6 bg-surface/70 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]",
        className
      )}
    >
      <header className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {action}
      </header>
      <div className="min-h-0 flex-1 p-4">{children}</div>
    </motion.section>
  );
}

/* ── Account overview ─────────────────────────────────────────────────────── */

export function AccountOverview({ account }: { account: DashboardData["account"] }) {
  const cells = [
    { label: "Balance", value: `$${formatPrice(account.balance)}`, tone: "text-foreground" },
    {
      label: "Day P&L",
      value: formatPnl(account.dayPnl),
      tone: account.dayPnl >= 0 ? "text-up" : "text-down",
    },
    {
      label: "Week P&L",
      value: formatPnl(account.weekPnl),
      tone: account.weekPnl >= 0 ? "text-up" : "text-down",
    },
    {
      label: "Buying Power",
      value: `$${formatPrice(account.buyingPower)}`,
      tone: "text-foreground",
    },
  ];

  return (
    <WidgetCard title="Account Overview" action={<Wallet className="size-4 text-muted-foreground/60" />}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cells.map((cell) => (
          <div key={cell.label}>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/60">
              {cell.label}
            </div>
            <div className={cn("mt-1 font-mono text-lg font-semibold tabular", cell.tone)}>
              {cell.value}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-lilac"
          style={{ width: `${(account.marginUsed / account.buyingPower) * 100}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground/60">
        <span>Margin used: ${formatPrice(account.marginUsed, 0)}</span>
        <span>{((account.marginUsed / account.buyingPower) * 100).toFixed(0)}%</span>
      </div>
    </WidgetCard>
  );
}

/* ── Open positions ───────────────────────────────────────────────────────── */

export function OpenPositions({ positions }: { positions: DashboardData["positions"] }) {
  return (
    <WidgetCard title="Open Positions" delay={0.05}>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground/60">
              <th className="pb-2 pr-4 font-medium">Symbol</th>
              <th className="pb-2 pr-4 font-medium">Side</th>
              <th className="pb-2 pr-4 text-right font-medium">Qty</th>
              <th className="pb-2 pr-4 text-right font-medium">Avg</th>
              <th className="pb-2 pr-4 text-right font-medium">Last</th>
              <th className="pb-2 text-right font-medium">Unrlzd</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.symbol} className="border-t border-white/4">
                <td className="py-2.5 pr-4 font-medium text-foreground">{p.symbol}</td>
                <td className="py-2.5 pr-4">
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                      p.side === "LONG" ? "bg-up/12 text-up" : "bg-down/12 text-down"
                    )}
                  >
                    {p.side}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-right tabular">{p.quantity}</td>
                <td className="py-2.5 pr-4 text-right tabular text-muted-foreground">
                  {formatPrice(p.avgPrice)}
                </td>
                <td className="py-2.5 pr-4 text-right tabular">{formatPrice(p.lastPrice)}</td>
                <td
                  className={cn(
                    "py-2.5 text-right tabular",
                    p.unrealizedPnl >= 0 ? "text-up" : "text-down"
                  )}
                >
                  {formatPnl(p.unrealizedPnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  );
}

/* ── Quote list (watchlist + movers) ──────────────────────────────────────── */

export function QuoteList({
  title,
  quotes,
  delay = 0,
  sortByMove = false,
}: {
  title: string;
  quotes: Quote[];
  delay?: number;
  sortByMove?: boolean;
}) {
  const list = sortByMove
    ? [...quotes].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    : quotes;

  return (
    <WidgetCard
      title={title}
      delay={delay}
      action={sortByMove ? <Flame className="size-4 text-muted-foreground/60" /> : undefined}
    >
      <ul className="space-y-1">
        {list.map((q) => {
          const up = q.change >= 0;
          return (
            <li
              key={q.symbol}
              className="flex items-center justify-between rounded-xl px-2.5 py-2 transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-lg",
                    up ? "bg-up/10 text-up" : "bg-down/10 text-down"
                  )}
                >
                  {up ? (
                    <ArrowUpRight className="size-3.5" />
                  ) : (
                    <ArrowDownRight className="size-3.5" />
                  )}
                </span>
                <span className="font-mono text-sm font-medium">{q.symbol}</span>
              </div>
              <div className="flex items-center gap-4 font-mono text-xs">
                <span className="tabular text-foreground">{formatPrice(q.last)}</span>
                <span className={cn("w-16 text-right tabular", up ? "text-up" : "text-down")}>
                  {formatPercent(q.changePercent)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}

/* ── Economic calendar ────────────────────────────────────────────────────── */

const IMPACT_STYLES = {
  high: "bg-down/15 text-down",
  medium: "bg-[#d99a2b]/15 text-[#d9a94b]",
  low: "bg-white/8 text-muted-foreground",
} as const;

export function EconomicCalendar({ events }: { events: DashboardData["econEvents"] }) {
  return (
    <WidgetCard
      title="Economic Calendar"
      delay={0.1}
      action={<CalendarDays className="size-4 text-muted-foreground/60" />}
    >
      <ul className="space-y-2.5">
        {events.map((event, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span className="w-11 shrink-0 font-mono text-xs text-muted-foreground">
              {event.time}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                IMPACT_STYLES[event.impact]
              )}
            >
              {event.impact}
            </span>
            <span className="min-w-0 flex-1 truncate text-foreground/85">{event.title}</span>
            {event.forecast ? (
              <span className="hidden shrink-0 font-mono text-xs text-muted-foreground xl:inline">
                F: {event.forecast}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

/* ── Recent trades ────────────────────────────────────────────────────────── */

export function RecentTrades({ trades }: { trades: DashboardData["recentTrades"] }) {
  return (
    <WidgetCard title="Recent Trades" delay={0.15}>
      <ul className="space-y-1">
        {trades.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between rounded-xl px-2.5 py-2 transition-colors hover:bg-white/[0.04]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">{t.executedAt}</span>
              <span className="font-mono text-sm font-medium">{t.symbol}</span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold",
                  t.side === "LONG" ? "bg-up/12 text-up" : "bg-down/12 text-down"
                )}
              >
                {t.side} {t.quantity}
              </span>
              <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                {t.setup}
              </span>
            </div>
            <span
              className={cn(
                "font-mono text-xs tabular",
                t.pnl >= 0 ? "text-up" : "text-down"
              )}
            >
              {formatPnl(t.pnl)}
            </span>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

/* ── Risk metrics ─────────────────────────────────────────────────────────── */

function RiskBar({
  label,
  used,
  max,
  format,
}: {
  label: string;
  used: number;
  max: number;
  format?: (v: number) => string;
}) {
  const pct = Math.min(100, (used / max) * 100);
  const fmt = format ?? ((v: number) => String(v));
  const danger = pct > 75;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular text-foreground/80">
          {fmt(used)} / {fmt(max)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "h-full rounded-full",
            danger
              ? "bg-gradient-to-r from-[#d99a2b] to-down"
              : "bg-gradient-to-r from-brand-blue to-brand-lilac"
          )}
        />
      </div>
    </div>
  );
}

export function RiskMetrics({ risk }: { risk: DashboardData["risk"] }) {
  return (
    <WidgetCard
      title="Risk Metrics"
      delay={0.2}
      action={<ShieldCheck className="size-4 text-muted-foreground/60" />}
    >
      <div className="space-y-4">
        <RiskBar
          label="Daily loss"
          used={risk.dailyLossUsed}
          max={risk.dailyLossLimit}
          format={(v) => `$${formatPrice(v, 0)}`}
        />
        <RiskBar label="Contracts" used={risk.contractsUsed} max={risk.contractsMax} />
        <RiskBar label="Trades today" used={risk.tradesToday} max={risk.tradesMax} />

        <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-4">
          {[
            { label: "Win rate (30d)", value: `${risk.winRate30d}%` },
            { label: "Profit factor", value: risk.profitFactor.toFixed(2) },
            { label: "Avg R", value: `${risk.avgR.toFixed(1)}R` },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-mono text-base font-semibold tabular text-foreground">
                {s.value}
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}

/* ── Performance graph (equity curve) ─────────────────────────────────────── */

export function PerformanceGraph({ curve }: { curve: DashboardData["equityCurve"] }) {
  const w = 560;
  const h = 160;
  const values = curve.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i: number) => (i / (curve.length - 1)) * w;
  const y = (v: number) => 8 + ((max - v) / (max - min)) * (h - 16);

  const line = values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  const gain = values[values.length - 1] - values[0];

  return (
    <WidgetCard
      title="Performance (30d)"
      delay={0.25}
      action={
        <span className={cn("font-mono text-xs tabular", gain >= 0 ? "text-up" : "text-down")}>
          {formatPnl(gain)}
        </span>
      }
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-hidden>
        <defs>
          <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#6A3DFF" stopOpacity="0.28" />
            <stop offset="1" stopColor="#6A3DFF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="equity-line" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#4E6BFF" />
            <stop offset="1" stopColor="#8A5CFF" />
          </linearGradient>
        </defs>
        <motion.path
          d={area}
          fill="url(#equity-fill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.5 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="url(#equity-line)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: "easeInOut", delay: 0.3 }}
        />
      </svg>
    </WidgetCard>
  );
}
