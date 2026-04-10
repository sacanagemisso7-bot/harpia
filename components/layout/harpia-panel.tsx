import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

import { HarpiaSurface } from "@/components/layout/harpia-surface";

type HarpiaPanelProps = HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean;
};

export function HarpiaPanel({ elevated = false, className, ...props }: HarpiaPanelProps) {
  return <HarpiaSurface variant="panel" className={cn(elevated && "panel-hover", className)} {...props} />;
}
