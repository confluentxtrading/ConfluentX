import type { Metadata } from "next";

import { VisionClient } from "./vision-client";

export const metadata: Metadata = {
  title: "The Market Dimension — ConfluentX",
  description:
    "A scroll-driven WebGL fly-through: liquidity as gravity, timeframes as intersecting planes, the order book as terrain.",
};

export default function VisionPage() {
  return <VisionClient />;
}
