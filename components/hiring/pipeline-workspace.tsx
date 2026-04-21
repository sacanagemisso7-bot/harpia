"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SavedViewType } from "@prisma/client";

import { AiResolvePanel } from "@/components/ai/ai-resolve-panel";
import { ApplicationStageForm, type StageTransitionState } from "@/components/applications/application-stage-form";
import { WorkspaceSavedViews } from "@/components/operations/workspace-saved-views";
import { buildApplicationResolveAssist } from "@/lib/ai/resolve-assist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatScore } from "@/lib/utils";
import type { AiResolveActionState } from "@/types/ai-resolve";

import styles from "@/components/operations/ops-workspace.module.css";

type PipelineStageRecord = {
  id: string;
  name: string;
  isDefault: boolean;
  isTerminal: boolean;
  currentFor: Array<{
    id: string;
    score: number | null;
    currentStageId: string | null;
    candidate: {
      id: string;
      fullName: string;
      currentTitle: string | null;
    };
    job: {
      id: string;
      title: string;
    };
  }>;
};

type PipelineStageOption = {
  id: string;
  name: string;
  key?: string | null;
  isDefault?: boolean;
  isTerminal?: boolean;
  position?: number;
};

type JobOption = {
  id: string;
  title: string;
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

type PipelineWorkspaceProps = {
  board: PipelineStageRecord[];
  stages: PipelineStageOption[];
  jobs: JobOption[];
  canManageApplications: boolean;
  savedViews: SavedViewRecord[];
  moveApplicationStageAction: (
    applicationId: string,
    state: StageTransitionState,
    formData: FormData
  ) => Promise<StageTransitionState>;
  resolveApplicationWithAiAction: (state: AiResolveActionState, formData: FormData) => Promise<AiResolveActionState>;
  saveWorkspaceViewAction: (formData: FormData) => Promise<SaveWorkspaceViewResult>;
  deleteSavedViewAction: (formData: FormData) => Promise<void>;
};

type PipelineView = "all" | string;

type ApplicationRecord = {
  id: string;
  stageId: string;
  stageName: string;
  stageTerminal: boolean;
  stageDefault: boolean;
  score: number | null;
  candidate: {
    id: string;
    fullName: string;
    currentTitle: string | null;
  };
  job: {
    id: string;
    title: string;
  };
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function PipelineWorkspace({
  board,
  stages,
  jobs,
  canManageApplications,
  savedViews,
  moveApplicationStageAction,
  resolveApplicationWithAiAction,
  saveWorkspaceViewAction,
  deleteSavedViewAction
}: PipelineWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const applications = useMemo<ApplicationRecord[]>(
    () =>
      board.flatMap((stage) =>
        stage.currentFor.map((application) => ({
          id: application.id,
          stageId: stage.id,
          stageName: stage.name,
          stageTerminal: stage.isTerminal,
          stageDefault: stage.isDefault,
          score: application.score,
          candidate: application.candidate,
          job: application.job
        }))
      ),
    [board]
  );

  const initialView = (searchParams.get("view") as PipelineView) || "all";
  const initialQuery = searchParams.get("q") ?? "";
  const initialJobId = searchParams.get("jobId") ?? "";
  const initialSelected = searchParams.get("selected");

  const [view, setView] = useState<PipelineView>(
    initialView === "all" || stages.some((stage) => stage.id === initialView) ? initialView : "all"
  );
  const [query, setQuery] = useState(initialQuery);
  const [jobId, setJobId] = useState(initialJobId);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected ?? applications[0]?.id ?? null);

  const filteredApplications = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return applications.filter((application) => {
      if (view !== "all" && application.stageId !== view) {
        return false;
      }

      if (jobId && application.job.id !== jobId) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [
        application.candidate.fullName,
        application.candidate.currentTitle ?? "",
        application.job.title,
        application.stageName
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [applications, jobId, query, view]);

  useEffect(() => {
    if (!filteredApplications.some((application) => application.id === selectedId)) {
      setSelectedId(filteredApplications[0]?.id ?? null);
    }
  }, [filteredApplications, selectedId]);

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

    if (jobId) {
      params.set("jobId", jobId);
    } else {
      params.delete("jobId");
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
  }, [jobId, pathname, query, router, searchParams, selectedId, view]);

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

      if (!filteredApplications.length) {
        return;
      }

      const currentIndex = Math.max(
        0,
        filteredApplications.findIndex((application) => application.id === selectedId)
      );

      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        const nextIndex = Math.min(filteredApplications.length - 1, currentIndex + 1);
        setSelectedId(filteredApplications[nextIndex]?.id ?? null);
      }

      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        const nextIndex = Math.max(0, currentIndex - 1);
        setSelectedId(filteredApplications[nextIndex]?.id ?? null);
      }

      if (event.key === "Enter" && selectedId) {
        event.preventDefault();
        router.push((`/applications/${selectedId}`) as Route);
        return;
      }

      if (event.key.toLowerCase() === "o" && selectedId) {
        event.preventDefault();
        router.push((`/applications/${selectedId}`) as Route);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [filteredApplications, query, router, selectedId]);

  const selectedApplication =
    filteredApplications.find((application) => application.id === selectedId) ?? filteredApplications[0] ?? null;
  const selectedApplicationAssist = selectedApplication
    ? buildApplicationResolveAssist({
        candidateName: selectedApplication.candidate.fullName,
        jobTitle: selectedApplication.job.title,
        score: selectedApplication.score,
        currentStageId: selectedApplication.stageId,
        currentStageName: selectedApplication.stageName,
        stages: stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          key: stage.key ?? null,
          isTerminal: stage.isTerminal,
          position: stage.position
        })),
        copilotDecision:
          selectedApplication.score !== null && selectedApplication.score >= 80
            ? {
                recommendation: "ADVANCE",
                summary: "A candidatura mostra sinais suficientes para seguir adiante com confiança operacional.",
                reasons: [
                  `Score atual em ${formatScore(selectedApplication.score)}.`,
                  `${selectedApplication.candidate.fullName} já mostra aderência relevante à vaga.`
                ],
                nextActions: ["Avançar no pipeline.", "Confirmar os sinais finais da próxima etapa."]
              }
            : selectedApplication.score !== null && selectedApplication.score < 45
              ? {
                  recommendation: "REJECT",
                  summary: "A candidatura mostra sinais insuficientes para continuar sem gerar ruído no funil.",
                  reasons: [
                    `Score atual em ${formatScore(selectedApplication.score)}.`,
                    "O caso pede uma decisão objetiva para não travar o pipeline."
                  ],
                  nextActions: ["Encerrar na etapa terminal adequada.", "Registrar o motivo do fechamento."]
                }
              : {
                  recommendation: "HOLD",
                  summary: "Ainda faltam sinais para uma movimentação mais agressiva no pipeline.",
                  reasons: [
                    `Score atual em ${formatScore(selectedApplication.score)}.`,
                    "A candidatura ainda depende de validação complementar."
                  ],
                  nextActions: ["Manter a etapa atual.", "Registrar o que ainda precisa ser confirmado."]
                },
        interviewCount: 0
      })
    : null;

  const stats = [
    { label: "Aplicações", value: applications.length },
    { label: "Etapas ativas", value: board.filter((stage) => stage.currentFor.length > 0).length },
    { label: "Etapas finais", value: board.filter((stage) => stage.isTerminal).length },
    { label: "Vagas abertas", value: jobs.length }
  ];

  const stageSummary = board
    .map((stage) => ({ id: stage.id, name: stage.name, count: stage.currentFor.length }))
    .filter((stage) => stage.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 4);

  const viewQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (view !== "all") {
      params.set("view", view);
    }
    if (jobId) {
      params.set("jobId", jobId);
    }
    if (query.trim()) {
      params.set("q", query.trim());
    }
    return params.toString();
  }, [jobId, query, view]);

  function applySavedView(savedQuery: string) {
    const params = new URLSearchParams(savedQuery);
    const nextView = params.get("view");

    setView(nextView === "all" || stages.some((stage) => stage.id === nextView) ? (nextView as PipelineView) || "all" : "all");
    setQuery(params.get("q") ?? "");
    setJobId(params.get("jobId") ?? "");
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Pipeline workspace</span>
        <h2 className={styles.title}>Pipeline</h2>
        <p className={styles.description}>
          O funil ficou mais legível e menos pesado: você filtra rápido, foca na etapa certa e resolve a movimentação no mesmo contexto.
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
            <button
              type="button"
              className={`${styles.tab} ${view === "all" ? styles.tabActive : ""}`}
              onClick={() => setView("all")}
            >
              Todas as etapas
            </button>
            {stages.map((stage) => (
              <button
                key={stage.id}
                type="button"
                className={`${styles.tab} ${view === stage.id ? styles.tabActive : ""}`}
                onClick={() => setView(stage.id)}
              >
                {stage.name}
              </button>
            ))}
          </div>
          <span className={styles.shortcutHint}>Atalhos: `/` busca, `J/K` navegam e `O` ou `Enter` abrem a aplicação.</span>
        </div>

        <div className={styles.searchWrap}>
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por candidato, cargo ou vaga"
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <div>
                <h3 className={styles.panelTitle}>Fila</h3>
                <p className={styles.panelDescription}>{filteredApplications.length} aplicação(ões) na visão atual.</p>
              </div>
              <div className="w-full max-w-[15rem]">
                <Select value={jobId} onChange={(event) => setJobId(event.target.value)} className={styles.selectCompact}>
                  <option value="">Todas as vagas</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div className={styles.list}>
            {filteredApplications.length ? (
              filteredApplications.map((application) => (
                <button
                  key={application.id}
                  type="button"
                  className={`${styles.row} ${selectedApplication?.id === application.id ? styles.rowActive : ""}`}
                  onClick={() => setSelectedId(application.id)}
                >
                  <div className={styles.rowTop}>
                    <div className={styles.rowLead}>
                      <p className={styles.rowTitle}>{application.candidate.fullName}</p>
                      <p className={styles.rowSubtitle}>{application.job.title}</p>
                    </div>
                    <Badge
                      variant={
                        application.stageTerminal ? "destructive" : application.stageDefault ? "success" : "outline"
                      }
                    >
                      {application.stageName}
                    </Badge>
                  </div>

                  <div className={styles.rowMeta}>
                    <span className={styles.metaValue}>{application.candidate.currentTitle || "Perfil sem cargo atual"}</span>
                    <span className={styles.metaValue}>{formatScore(application.score)}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className={styles.emptyWrap}>
                <p className={styles.emptyState}>Nenhuma aplicação encontrada nesta visão.</p>
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            {selectedApplication ? (
              <>
                <div className={styles.detailLead}>
                  <div className={styles.detailMeta}>
                    <div className={styles.detailLead}>
                      <h3 className={styles.detailTitle}>{selectedApplication.candidate.fullName}</h3>
                      <p className={styles.detailSubtitle}>{selectedApplication.job.title}</p>
                    </div>
                    <Badge
                      variant={
                        selectedApplication.stageTerminal
                          ? "destructive"
                          : selectedApplication.stageDefault
                            ? "success"
                            : "outline"
                      }
                    >
                      {selectedApplication.stageName}
                    </Badge>
                  </div>
                </div>

                <div className={styles.detailGrid}>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Score</span>
                    <span className={styles.metaValue}>{formatScore(selectedApplication.score)}</span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Cargo atual</span>
                    <span className={styles.metaValue}>
                      {selectedApplication.candidate.currentTitle || "Não informado"}
                    </span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Etapa</span>
                    <span className={styles.metaValue}>{selectedApplication.stageName}</span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Vaga</span>
                    <span className={styles.metaValue}>{selectedApplication.job.title}</span>
                  </div>
                </div>

                {canManageApplications && selectedApplicationAssist ? (
                  <AiResolvePanel
                    entityId={selectedApplication.id}
                    entityFieldName="applicationId"
                    selectionFieldName="stageId"
                    summary={selectedApplicationAssist.summary}
                    suggestedAction={selectedApplicationAssist.suggestedAction}
                    expectedImpact={selectedApplicationAssist.expectedImpact}
                    confidence={selectedApplicationAssist.confidence}
                    sources={selectedApplicationAssist.sources}
                    suggestedStatus={selectedApplicationAssist.suggestedStageId}
                    statusOptions={stages.map((stage) => ({
                      value: stage.id,
                      label: stage.name
                    }))}
                    draftNote={selectedApplicationAssist.draftNote}
                    action={resolveApplicationWithAiAction}
                  />
                ) : null}

                {canManageApplications ? (
                  <div className={styles.detailSection}>
                    <div className={styles.sectionHeader}>
                      <h4 className={styles.panelTitle}>Atualizar etapa</h4>
                      <Button asChild variant="outline">
                        <Link href={`/applications/${selectedApplication.id}`}>Abrir aplicação</Link>
                      </Button>
                    </div>
                    <ApplicationStageForm
                      stages={stages}
                      currentStageId={selectedApplication.stageId}
                      action={moveApplicationStageAction.bind(null, selectedApplication.id)}
                    />
                  </div>
                ) : null}

                <div className={styles.detailSection}>
                  <div className={styles.sectionHeader}>
                    <h4 className={styles.panelTitle}>Leitura do funil</h4>
                  </div>
                  <div className={styles.sectionStack}>
                    {stageSummary.map((stage) => (
                      <div key={stage.id} className={styles.detailCell}>
                        <div className={styles.sectionHeader}>
                          <span className={styles.metaValue}>{stage.name}</span>
                          <Badge variant="outline">{stage.count}</Badge>
                        </div>
                        <p className={styles.detailText}>Carga atual desta etapa dentro do funil.</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className={styles.emptyState}>Selecione uma aplicação para ver os detalhes.</p>
            )}
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Vistas salvas</h3>
              <p className={styles.panelDescription}>Guarde cortes do pipeline por vaga, etapa ou pesquisa atual.</p>
            </div>
            <WorkspaceSavedViews
              views={savedViews}
              currentQuery={viewQuery}
              onApply={applySavedView}
              type={SavedViewType.PIPELINE}
              saveWorkspaceViewAction={saveWorkspaceViewAction}
              deleteSavedViewAction={deleteSavedViewAction}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
