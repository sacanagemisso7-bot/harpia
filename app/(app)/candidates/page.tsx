import type { Route } from "next";
import { CandidateSource, SavedViewType } from "@prisma/client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import styles from "../workspace-expansion.module.css";
import { CandidatesTable } from "@/components/candidates/candidates-table";
import { FilterBar } from "@/components/layout/filter-bar";
import { PaginationControls } from "@/components/layout/pagination-controls";
import { PageHeader } from "@/components/layout/page-header";
import { SavedViewForm } from "@/components/saved-views/saved-view-form";
import { SavedViewList } from "@/components/saved-views/saved-view-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getCandidates } from "@/lib/candidates/queries";
import { getSavedViews } from "@/lib/saved-views/queries";

import { createSavedView } from "../saved-views/actions";

function buildCandidatesHref(params: { q?: string; source?: string; sort?: string; page?: number }) {
  const searchParams = new URLSearchParams();

  if (params.q) searchParams.set("q", params.q);
  if (params.source) searchParams.set("source", params.source);
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.page && params.page > 1) searchParams.set("page", String(params.page));

  const query = searchParams.toString();
  return `${query ? `/candidates?${query}` : "/candidates"}` as Route;
}

export default async function CandidatesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; source?: string; sort?: string; page?: string }>;
}) {
  const user = await requireCurrentUser();
  const canManageCandidates = hasPermission(user.role, "manage_candidates");
  const filters = await searchParams;
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => typeof value === "string" && value.length > 0) as Array<[string, string]>
  ).toString();
  const [candidates, savedViews] = await Promise.all([
    getCandidates(user.organizationId, {
      q: filters.q,
      source: filters.source,
      sort: filters.sort,
      page: Number(filters.page || 1)
    }),
    getSavedViews(user.id, user.organizationId, SavedViewType.CANDIDATES)
  ]);

  const currentItems = candidates.items;
  const totalResumes = currentItems.reduce((total, candidate) => total + candidate._count.resumes, 0);
  const totalApplications = currentItems.reduce((total, candidate) => total + candidate._count.applications, 0);
  const withCurrentTitle = currentItems.filter((candidate) => candidate.currentTitle).length;
  const sourceSummary = Array.from(
    currentItems.reduce((map, candidate) => {
      map.set(candidate.source, (map.get(candidate.source) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);
  const topCandidates = [...currentItems].sort((left, right) => right._count.applications - left._count.applications).slice(0, 4);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Talent pool"
        title="Base viva de candidatos"
        description="Perfis, currículos, origem e movimentação em uma visão clara para triagem e decisão."
        actions={
          canManageCandidates ? (
            <Button asChild>
              <Link href="/candidates/new">
                Novo candidato
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null
        }
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Na view atual</span>
          <strong className={styles.statValue}>{candidates.total}</strong>
          <p className={styles.statHint}>Perfis encontrados com os filtros ativos</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Currículos</span>
          <strong className={styles.statValue}>{totalResumes}</strong>
          <p className={styles.statHint}>Arquivos associados aos perfis visiveis</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Aplicações</span>
          <strong className={styles.statValue}>{totalApplications}</strong>
          <p className={styles.statHint}>Movimentos totais ligados aos perfis da página</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Cargo atual</span>
          <strong className={styles.statValue}>{withCurrentTitle}</strong>
          <p className={styles.statHint}>Perfis com titulo profissional preenchido</p>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.column}>
          <FilterBar
            q={filters.q}
            resetHref="/candidates"
            placeholder="Buscar por nome, email, cargo ou empresa"
            selects={[
              {
                name: "source",
                label: "Origem",
                placeholder: "Todas as origens",
                value: filters.source,
                options: [
                  { label: "Importacao manual", value: CandidateSource.MANUAL_IMPORT },
                  { label: "LinkedIn", value: CandidateSource.LINKEDIN },
                  { label: "Indicacao", value: CandidateSource.REFERRAL },
                  { label: "Página de carreiras", value: CandidateSource.CAREERS_PAGE }
                ]
              },
              {
                name: "sort",
                label: "Ordenar por",
                placeholder: "Padrao do sistema",
                value: filters.sort,
                options: [
                  { label: "Mais recentes", value: "recent" },
                  { label: "Nome A-Z", value: "name" },
                  { label: "Mais experiência", value: "experience" }
                ]
              }
            ]}
          />

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Candidates table</span>
              <h2 className={styles.panelTitle}>Perfis na view atual</h2>
              <p className={styles.panelDescription}>A base continua em formato de tabela, mas agora cercada por contexto util para priorizar melhor a triagem.</p>
            </div>

            <CandidatesTable candidates={candidates.items} />
            <PaginationControls
              page={candidates.page}
              pageCount={candidates.pageCount}
              buildHref={(page) =>
                buildCandidatesHref({
                  q: filters.q,
                  source: filters.source,
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
              <p className={styles.panelDescription}>Crie atalhos para views recorrentes do banco de talentos.</p>
            </div>

            <SavedViewForm action={createSavedView} query={query} type={SavedViewType.CANDIDATES} />
            <SavedViewList title="Views salvas" views={savedViews} basePath="/candidates" />
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Resumo</span>
              <h2 className={styles.panelTitle}>Origens e tração</h2>
              <p className={styles.panelDescription}>Veja rapidamente de onde os perfis estao vindo e quais aparecem mais ligados a aplicações.</p>
            </div>

            <div className={styles.summaryGrid}>
              {sourceSummary.map(([source, count]) => (
                <div key={source} className={styles.summaryTile}>
                  <strong>{source}</strong>
                  <span>{count} perfil(is)</span>
                </div>
              ))}
            </div>

            <div className={styles.list}>
              {topCandidates.length ? (
                topCandidates.map((candidate) => (
                  <Link key={candidate.id} href={`/candidates/${candidate.id}`} className={`${styles.listItem} ${styles.linkPanel}`}>
                    <div className={styles.rowBetween}>
                      <strong className={styles.itemTitle}>{candidate.fullName}</strong>
                      <Badge variant="outline">{candidate._count.applications}</Badge>
                    </div>
                    <p className={styles.itemDescription}>{candidate.currentTitle || candidate.email || "Perfil sem titulo atual"}</p>
                    <span className={styles.itemMeta}>{candidate.source}</span>
                  </Link>
                ))
              ) : (
                <div className={styles.emptyState}>Nenhum candidato na view atual.</div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
