"use client";

import { useEffect, useRef } from "react";
import { ColorType, createChart, type UTCTimestamp } from "lightweight-charts";

import type { EquityPoint } from "@/lib/backtest/engine";

export function EquityCurve({ points, className }: { points: EquityPoint[]; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || points.length === 0) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8b8d98",
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true,
    });

    const ending = points[points.length - 1]?.value ?? 0;
    const up = ending >= 0;
    const series = chart.addAreaSeries({
      lineColor: up ? "#2EBD85" : "#E5484D",
      topColor: up ? "rgba(46,189,133,0.25)" : "rgba(229,72,77,0.25)",
      bottomColor: "rgba(0,0,0,0)",
      lineWidth: 2,
      priceLineVisible: false,
    });
    series.setData(points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [points]);

  return <div ref={containerRef} className={className} />;
}
