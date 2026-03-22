import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[0.72rem] border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-primary/16 bg-primary/10 text-slate-100",
        success: "border-emerald-400/16 bg-emerald-400/10 text-emerald-100",
        warning: "border-amber-300/16 bg-amber-300/10 text-amber-100",
        destructive: "border-rose-400/16 bg-rose-400/10 text-rose-100",
        outline: "border-border/80 bg-[rgba(255,255,255,0.03)] text-foreground"
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
