import type { Candle } from "@/lib/market-data";

/**
 * Extensible indicator engine.
 *
 * Every indicator is a pure function over candles that yields one or more
 * named output series. The chart renders instances dynamically — any number
 * of them, layered — so adding a new indicator type here is all that's
 * needed for it to appear in the chart's "add indicator" menu.
 */

export interface IndicatorPoint {
  time: number;
  value: number;
  /** Optional per-point color (histograms). */
  color?: string;
}

export type IndicatorPane = "overlay" | "oscillator";

export interface IndicatorOutput {
  /** Output key within the indicator, e.g. "macd" | "signal" | "hist". */
  key: string;
  style: "line" | "histogram";
  points: IndicatorPoint[];
  /** Dashed rendering hint (bands, envelopes). */
  dashed?: boolean;
}

export interface IndicatorDef {
  type: string;
  label: string;
  pane: IndicatorPane;
  compute: (candles: Candle[], params: Record<string, number>) => IndicatorOutput[];
}

export interface IndicatorInstance {
  id: string;
  type: string;
  params: Record<string, number>;
  color: string;
}

/** Short human label for an instance, e.g. "EMA 21", "MACD 12/26/9". */
export function instanceLabel(inst: IndicatorInstance): string {
  const def = getIndicator(inst.type);
  if (!def) return inst.type;
  switch (inst.type) {
    case "ema":
    case "sma":
    case "wma":
    case "hma":
    case "rsi":
    case "atr":
    case "cci":
      return `${def.label} ${inst.params.period}`;
    case "macd":
      return `MACD ${inst.params.fast}/${inst.params.slow}/${inst.params.signal}`;
    case "bb":
      return `BB ${inst.params.period}/${inst.params.mult}`;
    case "stoch":
      return `Stoch ${inst.params.k}/${inst.params.d}`;
    case "adx":
      return `ADX ${inst.params.period}`;
    case "keltner":
      return `KC ${inst.params.period}/${inst.params.mult}`;
    default:
      return def.label;
  }
}

/* ── Math helpers ─────────────────────────────────────────────────────────── */

export function emaValues(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0] ?? 0;
  for (let i = 0; i < values.length; i++) {
    prev = i === 0 ? values[i] : values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function toPoints(candles: Candle[], values: number[], skip = 0): IndicatorPoint[] {
  const pts: IndicatorPoint[] = [];
  for (let i = skip; i < candles.length; i++) {
    pts.push({ time: candles[i].time, value: values[i] });
  }
  return pts;
}

/* ── Indicators ───────────────────────────────────────────────────────────── */

const ema: IndicatorDef = {
  type: "ema",
  label: "EMA",
  pane: "overlay",
  compute(candles, { period }) {
    const values = emaValues(candles.map((c) => c.close), period);
    return [{ key: "ema", style: "line", points: toPoints(candles, values, period) }];
  },
};

const sma: IndicatorDef = {
  type: "sma",
  label: "SMA",
  pane: "overlay",
  compute(candles, { period }) {
    const points: IndicatorPoint[] = [];
    let sum = 0;
    for (let i = 0; i < candles.length; i++) {
      sum += candles[i].close;
      if (i >= period) sum -= candles[i - period].close;
      if (i >= period - 1) points.push({ time: candles[i].time, value: sum / period });
    }
    return [{ key: "sma", style: "line", points }];
  },
};

const vwap: IndicatorDef = {
  type: "vwap",
  label: "VWAP",
  pane: "overlay",
  compute(candles) {
    let cumPV = 0;
    let cumV = 0;
    const points = candles.map((c) => {
      const typical = (c.high + c.low + c.close) / 3;
      cumPV += typical * c.volume;
      cumV += c.volume;
      return { time: c.time, value: cumPV / Math.max(1, cumV) };
    });
    return [{ key: "vwap", style: "line", points, dashed: true }];
  },
};

const bb: IndicatorDef = {
  type: "bb",
  label: "Bollinger Bands",
  pane: "overlay",
  compute(candles, { period, mult }) {
    const basis: IndicatorPoint[] = [];
    const upper: IndicatorPoint[] = [];
    const lower: IndicatorPoint[] = [];
    for (let i = period - 1; i < candles.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
      const mean = sum / period;
      let variance = 0;
      for (let j = i - period + 1; j <= i; j++) {
        variance += (candles[j].close - mean) ** 2;
      }
      const sd = Math.sqrt(variance / period);
      const t = candles[i].time;
      basis.push({ time: t, value: mean });
      upper.push({ time: t, value: mean + mult * sd });
      lower.push({ time: t, value: mean - mult * sd });
    }
    return [
      { key: "basis", style: "line", points: basis },
      { key: "upper", style: "line", points: upper, dashed: true },
      { key: "lower", style: "line", points: lower, dashed: true },
    ];
  },
};

/** Wilder's RSI. */
export function rsiValues(candles: Candle[], period: number): IndicatorPoint[] {
  if (candles.length <= period) return [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const delta = candles[i].close - candles[i - 1].close;
    if (delta >= 0) avgGain += delta;
    else avgLoss -= delta;
  }
  avgGain /= period;
  avgLoss /= period;
  const points: IndicatorPoint[] = [];
  const push = (i: number) => {
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    points.push({ time: candles[i].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + rs) });
  };
  push(period);
  for (let i = period + 1; i < candles.length; i++) {
    const delta = candles[i].close - candles[i - 1].close;
    avgGain = (avgGain * (period - 1) + Math.max(0, delta)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -delta)) / period;
    push(i);
  }
  return points;
}

const rsi: IndicatorDef = {
  type: "rsi",
  label: "RSI",
  pane: "oscillator",
  compute(candles, { period }) {
    return [{ key: "rsi", style: "line", points: rsiValues(candles, period) }];
  },
};

const macd: IndicatorDef = {
  type: "macd",
  label: "MACD",
  pane: "oscillator",
  compute(candles, { fast, slow, signal }) {
    const closes = candles.map((c) => c.close);
    const fastE = emaValues(closes, fast);
    const slowE = emaValues(closes, slow);
    const macdLine = fastE.map((v, i) => v - slowE[i]);
    const signalLine = emaValues(macdLine, signal);
    const skip = slow + signal;
    const hist: IndicatorPoint[] = [];
    for (let i = skip; i < candles.length; i++) {
      const v = macdLine[i] - signalLine[i];
      hist.push({
        time: candles[i].time,
        value: v,
        color: v >= 0 ? "rgba(46,189,133,0.5)" : "rgba(229,72,77,0.5)",
      });
    }
    return [
      { key: "hist", style: "histogram", points: hist },
      { key: "macd", style: "line", points: toPoints(candles, macdLine, skip) },
      { key: "signal", style: "line", points: toPoints(candles, signalLine, skip), dashed: true },
    ];
  },
};

/** Wilder's ATR. */
export function atrValues(candles: Candle[], period: number): IndicatorPoint[] {
  if (candles.length <= period) return [];
  const trs: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    trs.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      )
    );
  }
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const points: IndicatorPoint[] = [{ time: candles[period - 1].time, value: atr }];
  for (let i = period; i < candles.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    points.push({ time: candles[i].time, value: atr });
  }
  return points;
}

const atr: IndicatorDef = {
  type: "atr",
  label: "ATR",
  pane: "oscillator",
  compute(candles, { period }) {
    return [{ key: "atr", style: "line", points: atrValues(candles, period) }];
  },
};

function wmaValues(values: number[], period: number): number[] {
  const denom = (period * (period + 1)) / 2;
  const out: number[] = new Array(values.length).fill(0);
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += values[i - j] * (period - j);
    out[i] = sum / denom;
  }
  return out;
}

const wma: IndicatorDef = {
  type: "wma",
  label: "WMA",
  pane: "overlay",
  compute(candles, { period }) {
    const values = wmaValues(candles.map((c) => c.close), period);
    return [{ key: "wma", style: "line", points: toPoints(candles, values, period - 1) }];
  },
};

const hma: IndicatorDef = {
  type: "hma",
  label: "HMA",
  pane: "overlay",
  compute(candles, { period }) {
    // Hull MA: WMA(2·WMA(n/2) − WMA(n), √n)
    const closes = candles.map((c) => c.close);
    const half = wmaValues(closes, Math.max(2, Math.round(period / 2)));
    const full = wmaValues(closes, period);
    const diff = half.map((v, i) => 2 * v - full[i]);
    const sqrtP = Math.max(2, Math.round(Math.sqrt(period)));
    const hull = wmaValues(diff, sqrtP);
    return [{ key: "hma", style: "line", points: toPoints(candles, hull, period + sqrtP) }];
  },
};

const stoch: IndicatorDef = {
  type: "stoch",
  label: "Stochastic",
  pane: "oscillator",
  compute(candles, { k, d }) {
    const kRaw: number[] = new Array(candles.length).fill(0);
    for (let i = k - 1; i < candles.length; i++) {
      let hi = -Infinity;
      let lo = Infinity;
      for (let j = i - k + 1; j <= i; j++) {
        hi = Math.max(hi, candles[j].high);
        lo = Math.min(lo, candles[j].low);
      }
      kRaw[i] = hi > lo ? ((candles[i].close - lo) / (hi - lo)) * 100 : 50;
    }
    // %K smoothed by 3, %D = SMA(%K, d)
    const kSmooth: number[] = new Array(candles.length).fill(0);
    for (let i = k + 1; i < candles.length; i++) {
      kSmooth[i] = (kRaw[i] + kRaw[i - 1] + kRaw[i - 2]) / 3;
    }
    const dLine: number[] = new Array(candles.length).fill(0);
    for (let i = k + d; i < candles.length; i++) {
      let sum = 0;
      for (let j = 0; j < d; j++) sum += kSmooth[i - j];
      dLine[i] = sum / d;
    }
    return [
      { key: "k", style: "line", points: toPoints(candles, kSmooth, k + 1) },
      { key: "d", style: "line", points: toPoints(candles, dLine, k + d), dashed: true },
    ];
  },
};

const cci: IndicatorDef = {
  type: "cci",
  label: "CCI",
  pane: "oscillator",
  compute(candles, { period }) {
    const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
    const points: IndicatorPoint[] = [];
    for (let i = period - 1; i < candles.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += tp[j];
      const mean = sum / period;
      let dev = 0;
      for (let j = i - period + 1; j <= i; j++) dev += Math.abs(tp[j] - mean);
      dev /= period;
      points.push({ time: candles[i].time, value: dev > 0 ? (tp[i] - mean) / (0.015 * dev) : 0 });
    }
    return [{ key: "cci", style: "line", points }];
  },
};

const adx: IndicatorDef = {
  type: "adx",
  label: "ADX",
  pane: "oscillator",
  compute(candles, { period }) {
    if (candles.length <= period * 2) return [{ key: "adx", style: "line", points: [] }];
    const n = candles.length;
    const plusDM: number[] = [0];
    const minusDM: number[] = [0];
    const tr: number[] = [candles[0].high - candles[0].low];
    for (let i = 1; i < n; i++) {
      const up = candles[i].high - candles[i - 1].high;
      const down = candles[i - 1].low - candles[i].low;
      plusDM.push(up > down && up > 0 ? up : 0);
      minusDM.push(down > up && down > 0 ? down : 0);
      tr.push(
        Math.max(
          candles[i].high - candles[i].low,
          Math.abs(candles[i].high - candles[i - 1].close),
          Math.abs(candles[i].low - candles[i - 1].close)
        )
      );
    }
    // Wilder smoothing
    let sTR = 0;
    let sPlus = 0;
    let sMinus = 0;
    for (let i = 1; i <= period; i++) {
      sTR += tr[i];
      sPlus += plusDM[i];
      sMinus += minusDM[i];
    }
    const dx: number[] = new Array(n).fill(0);
    for (let i = period; i < n; i++) {
      if (i > period) {
        sTR = sTR - sTR / period + tr[i];
        sPlus = sPlus - sPlus / period + plusDM[i];
        sMinus = sMinus - sMinus / period + minusDM[i];
      }
      const pDI = sTR > 0 ? (sPlus / sTR) * 100 : 0;
      const mDI = sTR > 0 ? (sMinus / sTR) * 100 : 0;
      dx[i] = pDI + mDI > 0 ? (Math.abs(pDI - mDI) / (pDI + mDI)) * 100 : 0;
    }
    let adxVal = 0;
    for (let i = period; i < period * 2; i++) adxVal += dx[i];
    adxVal /= period;
    const points: IndicatorPoint[] = [{ time: candles[period * 2 - 1].time, value: adxVal }];
    for (let i = period * 2; i < n; i++) {
      adxVal = (adxVal * (period - 1) + dx[i]) / period;
      points.push({ time: candles[i].time, value: adxVal });
    }
    return [{ key: "adx", style: "line", points }];
  },
};

const keltner: IndicatorDef = {
  type: "keltner",
  label: "Keltner Channels",
  pane: "overlay",
  compute(candles, { period, mult, atrPeriod }) {
    const mid = emaValues(candles.map((c) => (c.high + c.low + c.close) / 3), period);
    const atrPts = atrValues(candles, atrPeriod);
    const atrByTime = new Map(atrPts.map((p) => [p.time, p.value]));
    const basis: IndicatorPoint[] = [];
    const upper: IndicatorPoint[] = [];
    const lower: IndicatorPoint[] = [];
    for (let i = Math.max(period, atrPeriod); i < candles.length; i++) {
      const a = atrByTime.get(candles[i].time);
      if (a === undefined) continue;
      const t = candles[i].time;
      basis.push({ time: t, value: mid[i] });
      upper.push({ time: t, value: mid[i] + mult * a });
      lower.push({ time: t, value: mid[i] - mult * a });
    }
    return [
      { key: "basis", style: "line", points: basis },
      { key: "upper", style: "line", points: upper, dashed: true },
      { key: "lower", style: "line", points: lower, dashed: true },
    ];
  },
};

const ichimoku: IndicatorDef = {
  type: "ichimoku",
  label: "Ichimoku Cloud",
  pane: "overlay",
  compute(candles, { tenkan, kijun, senkou }) {
    const midpoint = (from: number, to: number) => {
      let hi = -Infinity;
      let lo = Infinity;
      for (let j = from; j <= to; j++) {
        hi = Math.max(hi, candles[j].high);
        lo = Math.min(lo, candles[j].low);
      }
      return (hi + lo) / 2;
    };
    const n = candles.length;
    const tenkanPts: IndicatorPoint[] = [];
    const kijunPts: IndicatorPoint[] = [];
    const spanA: IndicatorPoint[] = [];
    const spanB: IndicatorPoint[] = [];
    for (let i = 0; i < n; i++) {
      const t = candles[i].time;
      if (i >= tenkan - 1) tenkanPts.push({ time: t, value: midpoint(i - tenkan + 1, i) });
      if (i >= kijun - 1) kijunPts.push({ time: t, value: midpoint(i - kijun + 1, i) });
      // Senkou spans are plotted `kijun` bars ahead — clipped to available bars.
      const ahead = i + kijun;
      if (ahead < n) {
        if (i >= kijun - 1) {
          spanA.push({
            time: candles[ahead].time,
            value: (midpoint(i - tenkan + 1, i) + midpoint(i - kijun + 1, i)) / 2,
          });
        }
        if (i >= senkou - 1) {
          spanB.push({ time: candles[ahead].time, value: midpoint(i - senkou + 1, i) });
        }
      }
    }
    return [
      { key: "tenkan", style: "line", points: tenkanPts },
      { key: "kijun", style: "line", points: kijunPts, dashed: true },
      { key: "spanA", style: "line", points: spanA, dashed: true },
      { key: "spanB", style: "line", points: spanB, dashed: true },
    ];
  },
};

/* ── Registry ─────────────────────────────────────────────────────────────── */

export const INDICATORS: IndicatorDef[] = [
  ema,
  sma,
  wma,
  hma,
  vwap,
  bb,
  keltner,
  ichimoku,
  rsi,
  macd,
  stoch,
  cci,
  adx,
  atr,
];

export function getIndicator(type: string): IndicatorDef | undefined {
  return INDICATORS.find((d) => d.type === type);
}

/**
 * Quick-add presets shown in the chart's "+ Indicator" menu. Each adds a new
 * independent instance — there is no cap on how many run at once.
 */
export const INDICATOR_PRESETS: { label: string; type: string; params: Record<string, number> }[] =
  [
    { label: "EMA 9", type: "ema", params: { period: 9 } },
    { label: "EMA 21", type: "ema", params: { period: 21 } },
    { label: "EMA 50", type: "ema", params: { period: 50 } },
    { label: "EMA 200", type: "ema", params: { period: 200 } },
    { label: "SMA 50", type: "sma", params: { period: 50 } },
    { label: "SMA 200", type: "sma", params: { period: 200 } },
    { label: "VWAP", type: "vwap", params: {} },
    { label: "Bollinger 20/2", type: "bb", params: { period: 20, mult: 2 } },
    { label: "WMA 20", type: "wma", params: { period: 20 } },
    { label: "HMA 21", type: "hma", params: { period: 21 } },
    { label: "Keltner 20/2", type: "keltner", params: { period: 20, mult: 2, atrPeriod: 10 } },
    { label: "Ichimoku 9/26/52", type: "ichimoku", params: { tenkan: 9, kijun: 26, senkou: 52 } },
    { label: "RSI 14", type: "rsi", params: { period: 14 } },
    { label: "MACD 12/26/9", type: "macd", params: { fast: 12, slow: 26, signal: 9 } },
    { label: "Stochastic 14/3", type: "stoch", params: { k: 14, d: 3 } },
    { label: "CCI 20", type: "cci", params: { period: 20 } },
    { label: "ADX 14", type: "adx", params: { period: 14 } },
    { label: "ATR 14", type: "atr", params: { period: 14 } },
  ];

/** Rotating palette for auto-assigned instance colors. */
export const INDICATOR_COLORS = [
  "#4E6BFF",
  "#8A5CFF",
  "#2EBD85",
  "#E5B93C",
  "#E5484D",
  "#3CC8E5",
  "#F470B4",
  "rgba(244,245,250,0.6)",
];
