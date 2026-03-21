import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[1rem] text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 disabled:shadow-none",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,hsl(var(--primary)),rgba(74,143,255,0.94),rgba(44,96,184,0.96))] text-primary-foreground shadow-glow hover:-translate-y-1 hover:brightness-[1.05] hover:shadow-float active:translate-y-0 active:scale-[0.99]",
        secondary:
          "border border-border/80 bg-secondary/78 text-secondary-foreground shadow-soft backdrop-blur-xl hover:-translate-y-1 hover:border-primary/18 hover:bg-secondary hover:text-foreground hover:shadow-float",
        outline:
          "border border-border/80 bg-[linear-gradient(180deg,rgba(10,16,28,0.88),rgba(8,13,22,0.72))] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl hover:-translate-y-1 hover:border-primary/22 hover:bg-secondary/80 hover:shadow-soft",
        ghost: "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
        destructive:
          "bg-[linear-gradient(135deg,hsl(var(--destructive)),rgba(198,78,62,0.94))] text-destructive-foreground shadow-[0_16px_36px_rgba(185,78,58,0.26)] hover:-translate-y-1 hover:brightness-[1.03]"
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-6 text-[0.95rem]",
        icon: "h-10 w-10"
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
