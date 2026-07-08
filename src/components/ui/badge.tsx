import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-brand-violet/30 bg-brand-violet/10 text-brand-lilac",
        blue: "border-brand-blue/30 bg-brand-blue/10 text-brand-blue",
        outline: "border-white/12 bg-transparent text-muted-foreground",
        glass: "glass text-foreground/80",
        up: "border-up/30 bg-up/10 text-up",
        down: "border-down/30 bg-down/10 text-down",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
