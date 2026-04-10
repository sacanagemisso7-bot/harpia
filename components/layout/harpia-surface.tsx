import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type HarpiaSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "panel" | "shell" | "ghost";
};

export function HarpiaSurface({ variant = "panel", className, ...props }: HarpiaSurfaceProps) {
  return (
    <div
      className={cn(
        variant === "ghost" ? "surface-border glass-strip" : variant === "shell" ? "panel" : "shell-card",
        className
      )}
      {...props}
    />
  );
}
