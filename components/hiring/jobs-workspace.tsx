"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { JobStatus, SavedViewType } from "@prisma/client";

import { WorkspaceSavedViews } from "@/components/operations/workspace-saved-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import styles from "@/components/operations/ops-workspace.module.css";

type JobRecord = {
  id: string;
  title: string;
  department: string;
  location: string | null;
  seniority: string;
  status: JobStatus;
  criteria: Array<{
    id: string;
    label: string;
    weight: number;
  }>;
  _count: {
    applications: number;
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

type JobsWorkspaceProps = {
  jobs: JobRecord[];
  canManageJobs: boolean;
  savedViews: SavedViewRecord[];
  saveWorkspaceViewAction: (formData: FormData) => Promise<SaveWorkspaceViewResult>;
  deleteSavedViewAction: (formData: FormData) => Promise<void>;
};

type JobsView = "all" | "open" | "draft" | "on_hold" | "closed";

const jobViews: Array<{ id: JobsView; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "open", label: "Abertas" },
  { id: "draft", label: "Rascunhos" },
  { id: "on_hold", label: "Em espera" },
  { id: "closed", label: "Encerradas" }
];

const statusLabel: Record<JobStatus, string> = {
  DRAFT: "Rascunho",
  OPEN: "Aberta",
  ON_HOLD: "Em espera",
  CLOSED: "Encerrada"
};

function getStatusVariant(status: JobStatus) {
  if (status === JobStatus.OPEN) {
    return "success" as const;
  }

  if (status === JobStatus.ON_HOLD) {
    return "warning" as const;
  }

  if (status === JobStatus.CLOSED) {
    return "default" as const;
  }

  return "outline" as const;
}

function matchesView(job: JobRecord, view: JobsView) {
  if (view === "all") {
    return true;
  }

  if (view === "open") {
    return job.status === JobStatus.OPEN;
  }

  if (view === "draft") {
    return job.status === JobStatus.DRAFT;
  }

  if (view === "on_hold") {
    return job.status === JobStatus.ON_HOLD;
  }

  return job.status === JobStatus.CLOSED;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function JobsWorkspace({
  jobs,
  canManageJobs,
  savedViews,
  saveWorkspaceViewAction,
  deleteSavedViewAction
}: JobsWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const initialView = (searchParams.get("view") as JobsView) || "all";
  const initialQuery = searchParams.get("q") ?? "";
  const initialSelected = searchParams.get("selected");

  const [view, setView] = useState<JobsView>(jobViews.some((item) => item.id === initialView) ? initialView : "all");
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected ?? jobs[0]?.id ?? null);

  const filteredJobs = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return jobs.filter((job) => {
      if (!matchesView(job, view)) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [job.title, job.department, job.location ?? "", job.seniority, statusLabel[job.status]]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [jobs, query, view]);

  useEffect(() => {
    if (!filteredJobs.some((job) => job.id === selectedId)) {
      setSelectedId(filteredJobs[0]?.id ?? null);
    }
  }, [filteredJobs, selectedId]);

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

      if (!filteredJobs.length) {
        return;
      }

      const currentIndex = Math.max(
        0,
        filteredJobs.findIndex((job) => job.id === selectedId)
      );

      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        const nextIndex = Math.min(filteredJobs.length - 1, currentIndex + 1);
        setSelectedId(filteredJobs[nextIndex]?.id ?? null);
      }

      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        const nextIndex = Math.max(0, currentIndex - 1);
        setSelectedId(filteredJobs[nextIndex]?.id ?? null);
      }

      if (event.key === "Enter" && selectedId) {
        event.preventDefault();
        router.push((`/jobs/${selectedId}`) as Route);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [filteredJobs, router, selectedId]);

  const selectedJob = filteredJobs.find((job) => job.id === selectedId) ?? filteredJobs[0] ?? null;
  const departmentCount = new Set(jobs.map((job) => job.department)).size;
  const totalApplications = jobs.reduce((total, job) => total + job._count.applications, 0);
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
    { label: "Vagas", value: jobs.length },
    { label: "Abertas", value: jobs.filter((job) => job.status === JobStatus.OPEN).length },
    { label: "Aplicações", value: totalApplications },
    { label: "Áreas", value: departmentCount }
  ];

  function applySavedView(savedQuery: string) {
    const params = new URLSearchParams(savedQuery);
    const nextView = params.get("view");
    const nextQuery = params.get("q") ?? "";

    setView(jobViews.some((item) => item.id === nextView) ? (nextView as JobsView) : "all");
    setQuery(nextQuery);
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Hiring workspace</span>
        <h2 className={styles.title}>Vagas</h2>
        <p className={styles.description}>
          Menos relatório e mais operação: encontre a vaga certa rápido, salve leituras úteis e mantenha o contexto ao lado.
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
            {jobViews.map((item) => (
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
          <span className={styles.shortcutHint}>Atalhos: `/` busca, `J/K` navegam e `Enter` abre a vaga.</span>
        </div>

        <div className={styles.searchWrap}>
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por vaga, área, local ou senioridade"
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
                <p className={styles.panelDescription}>{filteredJobs.length} vaga(s) na visão atual.</p>
              </div>
              {canManageJobs ? (
                <Button asChild>
                  <Link href="/jobs/new">Nova vaga</Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className={styles.list}>
            {filteredJobs.length ? (
              filteredJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  className={`${styles.row} ${selectedJob?.id === job.id ? styles.rowActive : ""}`}
                  onClick={() => setSelectedId(job.id)}
                >
                  <div className={styles.rowTop}>
                    <div className={styles.rowLead}>
                      <p className={styles.rowTitle}>{job.title}</p>
                      <p className={styles.rowSubtitle}>
                        {job.department} · {job.location || "Local a definir"}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(job.status)}>{statusLabel[job.status]}</Badge>
                  </div>

                  <div className={styles.rowMeta}>
                    <span className={styles.metaValue}>{job.seniority}</span>
                    <span className={styles.metaValue}>{job._count.applications} aplicação(ões)</span>
                  </div>
                </button>
              ))
            ) : (
              <div className={styles.emptyWrap}>
                <p className={styles.emptyState}>Nenhuma vaga encontrada nesta visão.</p>
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            {selectedJob ? (
              <>
                <div className={styles.detailLead}>
                  <div className={styles.detailMeta}>
                    <div className={styles.detailLead}>
                      <h3 className={styles.detailTitle}>{selectedJob.title}</h3>
                      <p className={styles.detailSubtitle}>
                        {selectedJob.department} · {selectedJob.location || "Local a definir"}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(selectedJob.status)}>{statusLabel[selectedJob.status]}</Badge>
                  </div>
                </div>

                <div className={styles.detailGrid}>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Senioridade</span>
                    <span className={styles.metaValue}>{selectedJob.seniority}</span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Aplicações</span>
                    <span className={styles.metaValue}>{selectedJob._count.applications}</span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Critérios</span>
                    <span className={styles.metaValue}>{selectedJob.criteria.length}</span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Área</span>
                    <span className={styles.metaValue}>{selectedJob.department}</span>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <div className={styles.sectionHeader}>
                    <h4 className={styles.panelTitle}>Critérios principais</h4>
                    <Button asChild variant="outline">
                      <Link href={`/jobs/${selectedJob.id}`}>Abrir vaga</Link>
                    </Button>
                  </div>

                  {selectedJob.criteria.length ? (
                    <div className={styles.sectionStack}>
                      {selectedJob.criteria.slice(0, 5).map((criterion) => (
                        <div key={criterion.id} className={styles.detailCell}>
                          <div className={styles.sectionHeader}>
                            <span className={styles.metaValue}>{criterion.label}</span>
                            <Badge variant="outline">{criterion.weight}%</Badge>
                          </div>
                          <p className={styles.detailText}>Peso usado na avaliação automatizada desta vaga.</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyState}>Esta vaga ainda não tem critérios configurados.</p>
                  )}
                </div>

                <div className={styles.sectionHeader}>
                  <Button asChild variant="outline">
                    <Link href={`/pipeline?jobId=${selectedJob.id}` as Route}>Ver pipeline</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/jobs/${selectedJob.id}/edit`}>Editar vaga</Link>
                  </Button>
                </div>
              </>
            ) : (
              <p className={styles.emptyState}>Selecione uma vaga para ver os detalhes.</p>
            )}
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Vistas salvas</h3>
              <p className={styles.panelDescription}>Guarde leituras recorrentes do hiring sem depender de telas cheias.</p>
            </div>
            <WorkspaceSavedViews
              views={savedViews}
              currentQuery={viewQuery}
              onApply={applySavedView}
              type={SavedViewType.JOBS}
              saveWorkspaceViewAction={saveWorkspaceViewAction}
              deleteSavedViewAction={deleteSavedViewAction}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
