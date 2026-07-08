import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_0_24px_-8px_rgba(106,61,255,0.8)] hover:bg-brand-lilac hover:shadow-[0_0_36px_-6px_rgba(138,92,255,0.9)]",
        gradient:
          "bg-gradient-to-r from-brand-blue via-brand-violet to-brand-lilac text-white bg-[length:200%_100%] bg-left hover:bg-right shadow-[0_0_32px_-8px_rgba(106,61,255,0.7)]",
        secondary:
          "bg-raised text-secondary-foreground border border-white/8 hover:bg-accent hover:border-white/15",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-white/5",
        glass:
          "glass text-foreground hover:bg-white/8 hover:border-white/20",
        outline:
          "border border-white/12 bg-transparent text-foreground hover:bg-white/5 hover:border-brand-violet/60",
        destructive:
          "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25",
        link: "text-brand-lilac underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-7 text-base",
        xl: "h-14 rounded-2xl px-9 text-base",
        icon: "size-10",
        "icon-sm": "size-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
