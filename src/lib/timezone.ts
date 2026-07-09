/**
 * Chart timezone support.
 *
 * lightweight-charts renders its time axis in UTC. The standard technique for
 * displaying another timezone is to shift the timestamps fed to the chart by
 * the zone's UTC offset — computed here with the built-in Intl API, no
 * date library needed. Drawings and killzones key off bar *indices* and raw
 * times, so display shifting never moves them.
 */

export const CHART_TIMEZONES = [
  { value: "Etc/UTC", label: "UTC" },
  { value: "America/New_York", label: "New York" },
  { value: "America/Chicago", label: "Chicago" },
  { value: "Europe/London", label: "London" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" },
] as const;

export type ChartTimezone = (typeof CHART_TIMEZONES)[number]["value"];

/** UTC offset of `timeZone` at `date`, in seconds (DST-aware). */
export function tzOffsetSeconds(timeZone: string, date: Date): number {
  if (timeZone === "Etc/UTC") return 0;
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    parts.hour === "24" ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return Math.round((asUtc - date.getTime()) / 1000);
}
