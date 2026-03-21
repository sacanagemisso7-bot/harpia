import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1.5 text-[0.72rem] font-semibold tracking-[0.02em] transition-all duration-300",
  {
    variants: {
      variant: {
        default: "border-primary/18 bg-primary/10 text-sky-100",
        success: "border-emerald-400/18 bg-emerald-400/10 text-emerald-100",
        warning: "border-amber-300/18 bg-amber-300/10 text-amber-100",
        destructive: "border-rose-400/18 bg-rose-400/10 text-rose-100",
        outline: "border-border/80 bg-secondary/72 text-foreground backdrop-blur-xl"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
