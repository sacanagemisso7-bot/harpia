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
    <Card className="panel-hover overflow-hidden">
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="font-display text-4xl font-semibold tracking-tight text-gradient">{value}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-[1.15rem] bg-secondary p-3 text-secondary-foreground shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
