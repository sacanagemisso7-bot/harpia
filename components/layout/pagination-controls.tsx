import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  page: number;
  pageCount: number;
  buildHref: (page: number) => Route;
};

export function PaginationControls({
  page,
  pageCount,
  buildHref
}: PaginationControlsProps) {
  return (
    <div className="panel flex items-center justify-between gap-4 px-5 py-4">
      <p className="text-sm text-muted-foreground">
        Página {page} de {pageCount}
      </p>
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" disabled={page <= 1}>
          <Link href={buildHref(Math.max(1, page - 1))}>Anterior</Link>
        </Button>
        <Button asChild variant="outline" disabled={page >= pageCount}>
          <Link href={buildHref(Math.min(pageCount, page + 1))}>Próxima</Link>
        </Button>
      </div>
    </div>
  );
}
