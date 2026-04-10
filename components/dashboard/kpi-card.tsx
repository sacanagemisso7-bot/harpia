import { type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  className?: string;
};

export function KpiCard({ title, value, description, icon: Icon, className }: KpiCardProps) {
  return (
    <Card className={cn("metric-panel panel-hover overflow-hidden rounded-[1.45rem_1.9rem_1.55rem_1.18rem]", className)}>
      <CardContent className="relative flex h-full flex-col justify-between gap-12 p-6 md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(214,198,165,0.1),transparent_18%),radial-gradient(circle_at_12%_0%,rgba(214,198,165,0.08),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_18%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="space-y-3.5">
            <p className="scene-label">{title}</p>
            <p className="font-display text-5xl font-semibold tracking-[-0.05em] text-gradient">{value}</p>
          </div>
          <div className="rounded-[1.2rem_1.45rem_1.28rem_0.96rem] border border-border/70 bg-secondary/42 p-3.5 text-primary shadow-[0_22px_42px_rgba(15,23,42,0.16)] backdrop-blur-md">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="relative space-y-4">
          <div className="scene-divider" />
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
