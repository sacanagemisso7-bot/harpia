import type { Route } from "next";
import { CandidateSource, SavedViewType } from "@prisma/client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CandidatesTable } from "@/components/candidates/candidates-table";
import { FilterBar } from "@/components/layout/filter-bar";
import { PaginationControls } from "@/components/layout/pagination-controls";
import { PageHeader } from "@/components/layout/page-header";
import { SavedViewForm } from "@/components/saved-views/saved-view-form";
import { SavedViewList } from "@/components/saved-views/saved-view-list";
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Talent pool"
        title="Base viva de candidatos"
        description="Consolide perfis, curriculos, leitura de IA e aplicacoes em um fluxo limpo para triagem e tomada de decisao."
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
              { label: "Pagina de carreiras", value: CandidateSource.CAREERS_PAGE }
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
              { label: "Mais experiencia", value: "experience" }
            ]
          }
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SavedViewForm action={createSavedView} query={query} type={SavedViewType.CANDIDATES} />
        <SavedViewList title="Views salvas" views={savedViews} basePath="/candidates" />
      </section>

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
    </div>
  );
}
