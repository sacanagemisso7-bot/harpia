"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CandidateSource, SavedViewType } from "@prisma/client";

import { WorkspaceSavedViews } from "@/components/operations/workspace-saved-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import styles from "@/components/operations/ops-workspace.module.css";

type CandidateRecord = {
  id: string;
  fullName: string;
  email: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  location: string | null;
  source: CandidateSource;
  resumes: Array<{
    id: string;
    uploadedAt: Date;
  }>;
  _count: {
    applications: number;
    resumes: number;
  };
};

type SavedViewRecord = {
  id: string;
  name: string;
  query: string;
};

type SaveWorkspaceViewResult = {
  error?: string;
  success?: string;
};

type CandidatesWorkspaceProps = {
  candidates: CandidateRecord[];
  canManageCandidates: boolean;
  savedViews: SavedViewRecord[];
  saveWorkspaceViewAction: (formData: FormData) => Promise<SaveWorkspaceViewResult>;
  deleteSavedViewAction: (formData: FormData) => Promise<void>;
};

type CandidateView = "all" | "linkedin" | "referral" | "careers" | "active";

const candidateViews: Array<{ id: CandidateView; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Com aplicações" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "referral", label: "Indicação" },
  { id: "careers", label: "Careers" }
];

const sourceLabel: Record<CandidateSource, string> = {
  MANUAL_IMPORT: "Importação manual",
  LINKEDIN: "LinkedIn",
  REFERRAL: "Indicação",
  CAREERS_PAGE: "Página de carreiras"
};

function matchesView(candidate: CandidateRecord, view: CandidateView) {
  if (view === "all") {
    return true;
  }

  if (view === "active") {
    return candidate._count.applications > 0;
  }

  if (view === "linkedin") {
    return candidate.source === CandidateSource.LINKEDIN;
  }

  if (view === "referral") {
    return candidate.source === CandidateSource.REFERRAL;
  }

  return candidate.source === CandidateSource.CAREERS_PAGE;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function CandidatesWorkspace({
  candidates,
  canManageCandidates,
  savedViews,
  saveWorkspaceViewAction,
  deleteSavedViewAction
}: CandidatesWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const initialView = (searchParams.get("view") as CandidateView) || "all";
  const initialQuery = searchParams.get("q") ?? "";
  const initialSelected = searchParams.get("selected");

  const [view, setView] = useState<CandidateView>(
    candidateViews.some((item) => item.id === initialView) ? initialView : "all"
  );
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected ?? candidates[0]?.id ?? null);

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return candidates.filter((candidate) => {
      if (!matchesView(candidate, view)) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [
        candidate.fullName,
        candidate.email ?? "",
        candidate.currentTitle ?? "",
        candidate.currentCompany ?? "",
        candidate.location ?? "",
        sourceLabel[candidate.source]
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [candidates, query, view]);

  useEffect(() => {
    if (!filteredCandidates.some((candidate) => candidate.id === selectedId)) {
      setSelectedId(filteredCandidates[0]?.id ?? null);
    }
  }, [filteredCandidates, selectedId]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (view === "all") {
      params.delete("view");
    } else {
      params.set("view", view);
    }

    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }

    if (selectedId) {
      params.set("selected", selectedId);
    } else {
      params.delete("selected");
    }

    const next = params.toString();
    const current = searchParams.toString();

    if (next !== current) {
      const nextHref = (next ? `${pathname}?${next}` : pathname) as Route;
      router.replace(nextHref, { scroll: false });
    }
  }, [pathname, query, router, searchParams, selectedId, view]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (event.key === "Escape" && query) {
        event.preventDefault();
        setQuery("");
        return;
      }

      if (!filteredCandidates.length) {
        return;
      }

      const currentIndex = Math.max(
        0,
        filteredCandidates.findIndex((candidate) => candidate.id === selectedId)
      );

      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        const nextIndex = Math.min(filteredCandidates.length - 1, currentIndex + 1);
        setSelectedId(filteredCandidates[nextIndex]?.id ?? null);
      }

      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        const nextIndex = Math.max(0, currentIndex - 1);
        setSelectedId(filteredCandidates[nextIndex]?.id ?? null);
      }

      if (event.key === "Enter" && selectedId) {
        event.preventDefault();
        router.push((`/candidates/${selectedId}`) as Route);
        return;
      }

      if (event.key.toLowerCase() === "o" && selectedId) {
        event.preventDefault();
        router.push((`/candidates/${selectedId}`) as Route);
        return;
      }

      if (event.key.toLowerCase() === "n" && canManageCandidates) {
        event.preventDefault();
        router.push("/candidates/new" as Route);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [canManageCandidates, filteredCandidates, query, router, selectedId]);

  const selectedCandidate =
    filteredCandidates.find((candidate) => candidate.id === selectedId) ?? filteredCandidates[0] ?? null;
  const totalApplications = candidates.reduce((total, candidate) => total + candidate._count.applications, 0);
  const totalResumes = candidates.reduce((total, candidate) => total + candidate._count.resumes, 0);
  const viewQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (view !== "all") {
      params.set("view", view);
    }
    if (query.trim()) {
      params.set("q", query.trim());
    }
    return params.toString();
  }, [query, view]);

  const stats = [
    { label: "Perfis", value: candidates.length },
    { label: "Aplicações", value: totalApplications },
    { label: "Currículos", value: totalResumes },
    { label: "Com cargo atual", value: candidates.filter((candidate) => candidate.currentTitle).length }
  ];

  function applySavedView(savedQuery: string) {
    const params = new URLSearchParams(savedQuery);
    const nextView = params.get("view");
    const nextQuery = params.get("q") ?? "";

    setView(candidateViews.some((item) => item.id === nextView) ? (nextView as CandidateView) : "all");
    setQuery(nextQuery);
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Talent workspace</span>
        <h2 className={styles.title}>Candidatos</h2>
        <p className={styles.description}>
          Uma leitura mais direta da base de talentos: menos tabela fria, mais contexto útil para decidir rápido.
        </p>
      </div>

      <div className={styles.statRow}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statPill}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarMeta}>
          <div className={styles.tabs}>
            {candidateViews.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.tab} ${view === item.id ? styles.tabActive : ""}`}
                onClick={() => setView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className={styles.shortcutHint}>Atalhos: `/` busca, `J/K` navegam, `O` ou `Enter` abrem e `N` cria novo perfil.</span>
        </div>

        <div className={styles.searchWrap}>
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, e-mail, empresa ou cargo"
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <div>
                <h3 className={styles.panelTitle}>Lista</h3>
                <p className={styles.panelDescription}>{filteredCandidates.length} perfil(is) na visão atual.</p>
              </div>
              {canManageCandidates ? (
                <Button asChild>
                  <Link href="/candidates/new">Novo candidato</Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className={styles.list}>
            {filteredCandidates.length ? (
              filteredCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className={`${styles.row} ${selectedCandidate?.id === candidate.id ? styles.rowActive : ""}`}
                  onClick={() => setSelectedId(candidate.id)}
                >
                  <div className={styles.rowTop}>
                    <div className={styles.rowLead}>
                      <p className={styles.rowTitle}>{candidate.fullName}</p>
                      <p className={styles.rowSubtitle}>
                        {candidate.currentTitle || candidate.email || "Perfil sem identificação principal"}
                      </p>
                    </div>
                    <Badge variant="outline">{candidate._count.applications} aplicação(ões)</Badge>
                  </div>

                  <div className={styles.rowMeta}>
                    <span className={styles.metaValue}>{sourceLabel[candidate.source]}</span>
                    <span className={styles.metaValue}>{candidate.location || "Local não informado"}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className={styles.emptyWrap}>
                <p className={styles.emptyState}>Nenhum candidato encontrado nesta visão.</p>
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            {selectedCandidate ? (
              <>
                <div className={styles.detailLead}>
                  <div className={styles.detailMeta}>
                    <div className={styles.detailLead}>
                      <h3 className={styles.detailTitle}>{selectedCandidate.fullName}</h3>
                      <p className={styles.detailSubtitle}>
                        {selectedCandidate.currentTitle || "Cargo atual não informado"}
                      </p>
                    </div>
                    <Badge variant="outline">{sourceLabel[selectedCandidate.source]}</Badge>
                  </div>
                </div>

                <div className={styles.detailGrid}>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Empresa atual</span>
                    <span className={styles.metaValue}>{selectedCandidate.currentCompany || "Não informada"}</span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Localização</span>
                    <span className={styles.metaValue}>{selectedCandidate.location || "Não informada"}</span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Currículos</span>
                    <span className={styles.metaValue}>{selectedCandidate._count.resumes}</span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Aplicações</span>
                    <span className={styles.metaValue}>{selectedCandidate._count.applications}</span>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <div className={styles.sectionHeader}>
                    <h4 className={styles.panelTitle}>Leitura rápida</h4>
                    <Button asChild variant="outline">
                      <Link href={`/candidates/${selectedCandidate.id}`}>Abrir perfil</Link>
                    </Button>
                  </div>

                  <div className={styles.sectionStack}>
                    <div className={styles.detailCell}>
                      <span className={styles.metaLabel}>Contato principal</span>
                      <span className={styles.metaValue}>{selectedCandidate.email || "E-mail não informado"}</span>
                    </div>
                    <div className={styles.detailCell}>
                      <span className={styles.metaLabel}>Último currículo</span>
                      <span className={styles.metaValue}>
                        {selectedCandidate.resumes[0]
                          ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(
                              new Date(selectedCandidate.resumes[0].uploadedAt)
                            )
                          : "Nenhum arquivo enviado"}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className={styles.emptyState}>Selecione um candidato para ver os detalhes.</p>
            )}
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Vistas salvas</h3>
              <p className={styles.panelDescription}>Guarde fatias úteis da base para triagem, sourcing e acompanhamento.</p>
            </div>
            <WorkspaceSavedViews
              views={savedViews}
              currentQuery={viewQuery}
              onApply={applySavedView}
              type={SavedViewType.CANDIDATES}
              saveWorkspaceViewAction={saveWorkspaceViewAction}
              deleteSavedViewAction={deleteSavedViewAction}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
