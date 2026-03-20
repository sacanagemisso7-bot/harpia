import Link from "next/link";
import type { Route } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SavedViewListProps = {
  title: string;
  views: Array<{
    id: string;
    name: string;
    query: string;
  }>;
  basePath: string;
};

export function SavedViewList({ title, views, basePath }: SavedViewListProps) {
  return (
    <Card className="panel-hover">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {views.length ? (
          views.map((view) => (
            <Link
              key={view.id}
              href={`${basePath}${view.query ? `?${view.query}` : ""}` as Route}
              className="flex items-center justify-between rounded-[1.1rem] border border-border/70 bg-white/75 px-4 py-3 text-sm transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              <span className="font-medium">{view.name}</span>
              <Badge variant="outline">Abrir</Badge>
            </Link>
          ))
        ) : (
          <div className="rounded-[1.1rem] border border-dashed border-border bg-white/75 p-4 text-sm text-muted-foreground">
            Nenhuma view salva ainda.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
