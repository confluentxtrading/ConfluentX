import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as a price with fixed decimals and thousands separators. */
export function formatPrice(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format a signed P&L value, e.g. +$1,240.50 / -$320.00 */
export function formatPnl(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${formatPrice(Math.abs(value))}`;
}

/** Format a percentage with sign, e.g. +1.24% */
export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/** Compact large numbers: 1.2K, 3.4M */
export function formatCompact(value: number): string {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
