"use client";

import dynamic from "next/dynamic";

// WebGL touches window — client-only, code-split away from the main bundle.
const VisionDimension = dynamic(
  () => import("@/components/marketing/vision-dimension").then((m) => m.VisionDimension),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#010204",
          color: "#8A96B1",
          fontFamily: "monospace",
          letterSpacing: "0.3em",
          fontSize: 12,
        }}
      >
        ENTERING THE DIMENSION…
      </div>
    ),
  }
);

export function VisionClient() {
  return <VisionDimension />;
}
