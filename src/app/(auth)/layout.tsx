import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-[-20%] h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-brand-violet/12 blur-[140px]" />
        <div className="absolute bottom-[-30%] right-[-10%] h-[50vh] w-[50vw] rounded-full bg-brand-blue/8 blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
      </div>

      <Link href="/" className="relative z-10 mb-10 transition-opacity hover:opacity-80">
        <Logo />
      </Link>

      <div className="relative z-10 w-full max-w-[420px]">{children}</div>

      <p className="relative z-10 mt-10 text-center text-xs text-muted-foreground/70">
        Trading futures involves substantial risk of loss.
        <br />© {new Date().getFullYear()} ConfluentX. All rights reserved.
      </p>
    </div>
  );
}
