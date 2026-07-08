"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: { text: string; linkLabel: string; href: string };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-8 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)]"
    >
      <div className="mb-7 space-y-1.5 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>

      {children}

      {footer ? (
        <p className="mt-7 text-center text-sm text-muted-foreground">
          {footer.text}{" "}
          <Link
            href={footer.href}
            className="font-medium text-brand-lilac transition-colors hover:text-brand-blue"
          >
            {footer.linkLabel}
          </Link>
        </p>
      ) : null}
    </motion.div>
  );
}
