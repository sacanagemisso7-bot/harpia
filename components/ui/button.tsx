import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group inline-flex items-center justify-center whitespace-nowrap rounded-[0.28rem] border text-sm font-medium tracking-[0.01em] transition-[box-shadow,border-color,background-color,color,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 disabled:shadow-none",
  {
    variants: {
      variant: {
        default:
          "border-primary/62 bg-primary text-primary-foreground hover:border-primary/80 hover:bg-primary/92",
        secondary:
          "border-border/80 bg-secondary text-secondary-foreground hover:bg-secondary/85 hover:text-foreground",
        outline:
          "border-border/80 bg-transparent text-foreground hover:bg-secondary/70 hover:text-foreground",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        destructive:
          "border-destructive/30 bg-destructive text-destructive-foreground hover:bg-destructive/92"
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
