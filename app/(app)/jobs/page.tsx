import type { Route } from "next";
import { JobStatus, SavedViewType } from "@prisma/client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { JobsTable } from "@/components/jobs/jobs-table";
import { FilterBar } from "@/components/layout/filter-bar";
import { PaginationControls } from "@/components/layout/pagination-controls";
import { PageHeader } from "@/components/layout/page-header";
import { SavedViewForm } from "@/components/saved-views/saved-view-form";
import { SavedViewList } from "@/components/saved-views/saved-view-list";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getJobs } from "@/lib/jobs/queries";
import { getSavedViews } from "@/lib/saved-views/queries";

import { createSavedView } from "../saved-views/actions";

function buildJobsHref(params: { q?: string; status?: string; sort?: string; page?: number }) {
  const searchParams = new URLSearchParams();

  if (params.q) searchParams.set("q", params.q);
  if (params.status) searchParams.set("status", params.status);
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.page && params.page > 1) searchParams.set("page", String(params.page));

  const query = searchParams.toString();
  return `${query ? `/jobs?${query}` : "/jobs"}` as Route;
}

export default async function JobsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; page?: string }>;
}) {
  const user = await requireCurrentUser();
  const canManageJobs = hasPermission(user.role, "manage_jobs");
  const filters = await searchParams;
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => typeof value === "string" && value.length > 0) as Array<[string, string]>
  ).toString();
  const [jobs, savedViews] = await Promise.all([
    getJobs(user.organizationId, {
      q: filters.q,
      status: filters.status,
      sort: filters.sort,
      page: Number(filters.page || 1)
    }),
    getSavedViews(user.id, user.organizationId, SavedViewType.JOBS)
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Jobs"
        title="Vagas com criterio, contexto e ranking"
        description="Centralize o desenho de cada vaga, desde a definicao de criterios ate a leitura das melhores candidaturas por score e etapa."
        actions={
          canManageJobs ? (
            <Button asChild>
              <Link href="/jobs/new">
                Criar vaga
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null
        }
      />

      <FilterBar
        q={filters.q}
        resetHref="/jobs"
        placeholder="Buscar por titulo, area ou localizacao"
        selects={[
          {
            name: "status",
            label: "Status",
            placeholder: "Todos os status",
            value: filters.status,
            options: [
              { label: "Rascunho", value: JobStatus.DRAFT },
              { label: "Aberta", value: JobStatus.OPEN },
              { label: "Em espera", value: JobStatus.ON_HOLD },
              { label: "Encerrada", value: JobStatus.CLOSED }
            ]
          },
          {
            name: "sort",
            label: "Ordenar por",
            placeholder: "Padrao do sistema",
            value: filters.sort,
            options: [
              { label: "Mais recentes", value: "recent" },
              { label: "Titulo A-Z", value: "title" },
              { label: "Mais candidaturas", value: "applications" }
            ]
          }
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SavedViewForm action={createSavedView} query={query} type={SavedViewType.JOBS} />
        <SavedViewList title="Views salvas" views={savedViews} basePath="/jobs" />
      </section>

      <JobsTable jobs={jobs.items} />
      <PaginationControls
        page={jobs.page}
        pageCount={jobs.pageCount}
        buildHref={(page) =>
          buildJobsHref({
            q: filters.q,
            status: filters.status,
            sort: filters.sort,
            page
          })
        }
      />
    </div>
  );
}
