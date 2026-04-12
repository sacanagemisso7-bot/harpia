import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";

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
    <section className="space-y-3 rounded-[0.5rem] border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-[-0.02em] text-foreground">{title}</h3>
        <Badge variant="outline">{views.length} salvas</Badge>
      </div>
      <div className="space-y-2">
        {views.length ? (
          views.map((view) => (
            <Link
              key={view.id}
              href={`${basePath}${view.query ? `?${view.query}` : ""}` as Route}
              className="flex items-center justify-between gap-3 rounded-[0.5rem] border border-border bg-secondary/35 px-3.5 py-3 text-sm transition hover:border-border hover:bg-secondary/55"
            >
              <span className="font-medium text-foreground">{view.name}</span>
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                Abrir
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))
        ) : (
          <div className="rounded-[0.5rem] border border-dashed border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
            Nenhuma view salva ainda.
          </div>
        )}
      </div>
    </section>
  );
}
