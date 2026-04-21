import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[0.24rem] border px-2 py-1 text-[0.68rem] font-medium tracking-[0.02em] transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/10 text-primary",
        success: "border-[hsl(var(--success)/0.22)] bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]",
        warning: "border-[hsl(var(--warning)/0.22)] bg-[hsl(var(--warning)/0.12)] text-[hsl(var(--warning))]",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive",
        outline: "border-border/80 bg-transparent text-foreground"
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
