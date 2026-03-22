import { type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type KpiCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

export function KpiCard({ title, value, description, icon: Icon }: KpiCardProps) {
  return (
    <Card className="metric-panel panel-hover overflow-hidden">
      <CardContent className="flex h-full flex-col justify-between gap-10 p-6 md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="section-intro text-sky-100/60">{title}</p>
            <p className="font-display text-5xl font-semibold tracking-[-0.05em] text-gradient">{value}</p>
          </div>
          <div className="rounded-[1.1rem] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(99,149,255,0.18),rgba(12,23,38,0.9))] p-3 text-sky-100 shadow-[0_16px_36px_rgba(0,0,0,0.26)]">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-px w-full bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(140,170,220,0.22),rgba(255,255,255,0))]" />
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
