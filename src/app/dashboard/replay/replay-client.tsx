"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

// lightweight-charts touches `window` — client-only, code-split.
const ReplayWorkspace = dynamic(
  () => import("@/components/dashboard/replay-workspace").then((m) => m.ReplayWorkspace),
  { ssr: false, loading: () => <Skeleton className="h-[70vh] rounded-2xl" /> }
);

export function ReplayClient({ defaultSymbol }: { defaultSymbol: string }) {
  return <ReplayWorkspace defaultSymbol={defaultSymbol} />;
}
