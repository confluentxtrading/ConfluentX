import { marketData } from "@/lib/market-data";

/**
 * Mock account/trading state for the dashboard.
 * Deterministic and derived from the market-data provider where possible, so
 * the numbers stay coherent. Replace with real broker/journal queries later.
 */

export interface Position {
  symbol: string;
  side: "LONG" | "SHORT";
  quantity: number;
  avgPrice: number;
  lastPrice: number;
  unrealizedPnl: number;
}

export interface RecentTrade {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT";
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  setup: string;
  executedAt: string;
}

export interface EconEvent {
  time: string;
  title: string;
  impact: "high" | "medium" | "low";
  forecast?: string;
  previous?: string;
}

export interface DashboardData {
  account: {
    balance: number;
    dayPnl: number;
    weekPnl: number;
    buyingPower: number;
    marginUsed: number;
  };
  positions: Position[];
  recentTrades: RecentTrade[];
  econEvents: EconEvent[];
  risk: {
    dailyLossUsed: number;
    dailyLossLimit: number;
    contractsUsed: number;
    contractsMax: number;
    tradesToday: number;
    tradesMax: number;
    winRate30d: number;
    profitFactor: number;
    avgR: number;
  };
  equityCurve: { day: string; value: number }[];
}

export function getDashboardData(): DashboardData {
  const nq = marketData.getQuote("NQ");
  const es = marketData.getQuote("ES");

  const positions: Position[] = [
    {
      symbol: "NQ",
      side: "LONG",
      quantity: 2,
      avgPrice: nq.last - 31,
      lastPrice: nq.last,
      unrealizedPnl: 31 * 2 * 20,
    },
    {
      symbol: "ES",
      side: "SHORT",
      quantity: 1,
      avgPrice: es.last - 2.25,
      lastPrice: es.last,
      unrealizedPnl: -2.25 * 50,
    },
  ];

  const unrealized = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

  const recentTrades: RecentTrade[] = [
    {
      id: "t1",
      symbol: "NQ",
      side: "LONG",
      quantity: 2,
      entryPrice: 21412.25,
      exitPrice: 21448.75,
      pnl: 1460,
      setup: "VWAP Reclaim",
      executedAt: "09:47",
    },
    {
      id: "t2",
      symbol: "MES",
      side: "SHORT",
      quantity: 5,
      entryPrice: 6091.5,
      exitPrice: 6087.25,
      pnl: 106.25,
      setup: "Liquidity Sweep",
      executedAt: "10:12",
    },
    {
      id: "t3",
      symbol: "NQ",
      side: "SHORT",
      quantity: 1,
      entryPrice: 21471.0,
      exitPrice: 21482.5,
      pnl: -230,
      setup: "Range Fade",
      executedAt: "11:03",
    },
    {
      id: "t4",
      symbol: "ES",
      side: "LONG",
      quantity: 2,
      entryPrice: 6079.75,
      exitPrice: 6084.5,
      pnl: 475,
      setup: "Opening Drive",
      executedAt: "11:41",
    },
  ];

  const realized = recentTrades.reduce((sum, t) => sum + t.pnl, 0);

  // Deterministic 30-day equity curve with a gentle upward drift.
  const equityCurve = Array.from({ length: 30 }, (_, i) => {
    const base = 50_000;
    const drift = i * 320;
    const wave = Math.sin(i / 3.2) * 900 + Math.sin(i / 1.4) * 380;
    return { day: `D${i + 1}`, value: Math.round(base + drift + wave) };
  });

  return {
    account: {
      balance: 61_240,
      dayPnl: Math.round((realized + unrealized) * 100) / 100,
      weekPnl: 4_820,
      buyingPower: 122_480,
      marginUsed: 38_400,
    },
    positions,
    recentTrades,
    econEvents: [
      { time: "08:30", title: "CPI m/m", impact: "high", forecast: "0.2%", previous: "0.3%" },
      { time: "08:30", title: "Initial Jobless Claims", impact: "medium", forecast: "232K", previous: "228K" },
      { time: "10:00", title: "Crude Oil Inventories", impact: "medium", forecast: "-1.2M", previous: "+0.8M" },
      { time: "14:00", title: "FOMC Member Speech", impact: "high" },
      { time: "15:30", title: "Treasury Auction (10y)", impact: "low" },
    ],
    risk: {
      dailyLossUsed: 230,
      dailyLossLimit: 2000,
      contractsUsed: 3,
      contractsMax: 5,
      tradesToday: 4,
      tradesMax: 10,
      winRate30d: 61.4,
      profitFactor: 1.92,
      avgR: 1.6,
    },
    equityCurve,
  };
}
