import type { Route } from "next";
import { JobStatus, SavedViewType } from "@prisma/client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import styles from "../workspace-expansion.module.css";
import { JobsTable } from "@/components/jobs/jobs-table";
import { FilterBar } from "@/components/layout/filter-bar";
import { PaginationControls } from "@/components/layout/pagination-controls";
import { PageHeader } from "@/components/layout/page-header";
import { SavedViewForm } from "@/components/saved-views/saved-view-form";
import { SavedViewList } from "@/components/saved-views/saved-view-list";
import { Badge } from "@/components/ui/badge";
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

  const currentItems = jobs.items;
  const openCount = currentItems.filter((job) => job.status === JobStatus.OPEN).length;
  const draftCount = currentItems.filter((job) => job.status === JobStatus.DRAFT).length;
  const totalApplications = currentItems.reduce((total, job) => total + job._count.applications, 0);
  const uniqueLocations = new Set(currentItems.map((job) => job.location).filter(Boolean)).size;
  const departmentSummary = Array.from(
    currentItems.reduce((map, job) => {
      map.set(job.department, (map.get(job.department) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);
  const topJobs = [...currentItems].sort((left, right) => right._count.applications - left._count.applications).slice(0, 4);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Jobs"
        title="Vagas com criterio e contexto"
        description="Filtros, views salvas e leitura rapida das requisicoes para o time abrir, revisar e priorizar melhor."
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

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Na view atual</span>
          <strong className={styles.statValue}>{jobs.total}</strong>
          <p className={styles.statHint}>Vagas encontradas com os filtros atuais</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Abertas</span>
          <strong className={styles.statValue}>{openCount}</strong>
          <p className={styles.statHint}>Requisicoes em captura ativa nesta leitura</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Aplicacoes</span>
          <strong className={styles.statValue}>{totalApplications}</strong>
          <p className={styles.statHint}>Volume somado das vagas visiveis agora</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Locais</span>
          <strong className={styles.statValue}>{uniqueLocations}</strong>
          <p className={styles.statHint}>{draftCount} vaga(s) ainda em rascunho na pagina</p>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.column}>
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

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Jobs table</span>
              <h2 className={styles.panelTitle}>Vagas na view atual</h2>
              <p className={styles.panelDescription}>A tabela continua sendo o ponto rapido de leitura, mas agora entra numa composicao mais clara com resumo e contexto ao lado.</p>
            </div>

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
          </section>
        </div>

        <aside className={styles.column}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Views</span>
              <h2 className={styles.panelTitle}>Salvar leitura atual</h2>
              <p className={styles.panelDescription}>Guarde filtros e ordenacoes que o time consulta com frequencia.</p>
            </div>

            <SavedViewForm action={createSavedView} query={query} type={SavedViewType.JOBS} />
            <SavedViewList title="Views salvas" views={savedViews} basePath="/jobs" />
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Resumo</span>
              <h2 className={styles.panelTitle}>Onde a carga esta</h2>
              <p className={styles.panelDescription}>Areas com mais requisicoes e vagas com maior volume de aplicacoes na pagina atual.</p>
            </div>

            <div className={styles.summaryGrid}>
              {departmentSummary.map(([department, count]) => (
                <div key={department} className={styles.summaryTile}>
                  <strong>{department}</strong>
                  <span>{count} vaga(s)</span>
                </div>
              ))}
            </div>

            <div className={styles.list}>
              {topJobs.length ? (
                topJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className={`${styles.listItem} ${styles.linkPanel}`}>
                    <div className={styles.rowBetween}>
                      <strong className={styles.itemTitle}>{job.title}</strong>
                      <Badge variant="outline">{job._count.applications}</Badge>
                    </div>
                    <p className={styles.itemDescription}>
                      {job.department} • {job.location}
                    </p>
                  </Link>
                ))
              ) : (
                <div className={styles.emptyState}>Nenhuma vaga na view atual.</div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
