import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap rounded-[0.82rem] border text-sm font-semibold tracking-[-0.01em] transition-[transform,box-shadow,border-color,background-color,color,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 disabled:shadow-none before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/10 before:content-['']",
  {
    variants: {
      variant: {
        default:
          "border-primary/24 bg-[linear-gradient(180deg,rgba(112,129,170,0.96),rgba(92,108,147,0.96))] text-primary-foreground shadow-[0_12px_24px_rgba(48,58,84,0.22)] hover:border-primary/32 hover:brightness-[1.01] hover:shadow-[0_16px_28px_rgba(48,58,84,0.26)] active:translate-y-0 active:scale-[0.995]",
        secondary:
          "border-white/[0.08] bg-[linear-gradient(180deg,rgba(29,33,40,0.96),rgba(20,23,29,0.92))] text-secondary-foreground shadow-[0_10px_20px_rgba(0,0,0,0.12)] hover:border-white/[0.12] hover:bg-secondary/92 hover:text-white active:translate-y-0",
        outline:
          "border-border/80 bg-[linear-gradient(180deg,rgba(22,25,31,0.96),rgba(16,19,24,0.88))] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] hover:border-white/[0.12] hover:bg-secondary/86 hover:text-white active:translate-y-0",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:border-white/[0.08] hover:bg-white/[0.03] hover:text-foreground active:translate-y-0",
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
