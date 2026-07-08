import { cn } from "@/lib/utils";

/**
 * The ConfluentX "CX" emblem — two converging strokes (confluence) crossing
 * inside a precision ring. Pure SVG, gradient-stroked, scales anywhere.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-8", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="cx-a" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4E6BFF" />
          <stop offset="0.55" stopColor="#6A3DFF" />
          <stop offset="1" stopColor="#8A5CFF" />
        </linearGradient>
        <linearGradient id="cx-b" x1="42" y1="10" x2="14" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8A5CFF" />
          <stop offset="1" stopColor="#4E6BFF" />
        </linearGradient>
      </defs>
      {/* Precision ring — the "C", opened toward the X */}
      <path
        d="M35.5 10.9A17 17 0 1 0 35.5 37.1"
        stroke="url(#cx-a)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      {/* Confluence strokes — the "X" */}
      <path
        d="M20 17L34.5 33.5"
        stroke="url(#cx-b)"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <path
        d="M34.5 14.5L20 31"
        stroke="#F4F5FA"
        strokeOpacity="0.92"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span className="font-display text-lg font-semibold tracking-tight text-foreground">
        Confluent<span className="text-gradient-brand">X</span>
      </span>
    </span>
  );
}
