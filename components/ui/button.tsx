import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap rounded-[0.88rem] border text-sm font-semibold tracking-[0.01em] transition-[transform,box-shadow,border-color,background-color,color,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 disabled:shadow-none before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/6 before:content-['']",
  {
    variants: {
      variant: {
        default:
          "border-primary/55 bg-[linear-gradient(180deg,hsl(var(--accent-warm)/0.96),hsl(var(--primary)/0.96))] text-primary-foreground shadow-[0_14px_28px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.22)] hover:border-primary/72 hover:brightness-[1.02] hover:shadow-[0_18px_34px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.24)] active:translate-y-0",
        secondary:
          "border-border/80 bg-secondary/90 text-secondary-foreground shadow-[0_10px_22px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-border hover:bg-secondary hover:text-foreground active:translate-y-0",
        outline:
          "border-border/80 bg-card/82 text-foreground shadow-[0_8px_18px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-border hover:bg-secondary/86 hover:text-foreground active:translate-y-0",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:border-border/65 hover:bg-accent/60 hover:text-foreground active:translate-y-0",
        destructive:
          "border-destructive/22 bg-[linear-gradient(180deg,rgba(165,88,80,0.98),rgba(143,73,67,0.98))] text-destructive-foreground shadow-[0_12px_24px_rgba(101,44,40,0.2)] hover:border-destructive/30 hover:brightness-[1.01] hover:shadow-[0_16px_28px_rgba(101,44,40,0.24)] active:translate-y-0"
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-6 text-[0.95rem]",
        icon: "h-10 w-10 px-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
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
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
