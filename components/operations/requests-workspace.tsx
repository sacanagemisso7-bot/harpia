"use client";

import type { Route } from "next";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HrRequestCategory, HrRequestStatus, PeopleTaskPriority, SavedViewType } from "@prisma/client";

import { WorkspaceSavedViews } from "@/components/operations/workspace-saved-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import styles from "./ops-workspace.module.css";

type RequestRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: HrRequestStatus;
  effectiveSlaStatus: string;
  dueAt: Date | null;
  requesterUser: { id: string; name: string | null; email: string | null } | null;
  requesterEmployee: { id: string; fullName: string; title: string } | null;
  assigneeUser: { id: string; name: string | null; email: string | null } | null;
  comments: Array<{
    id: string;
    message: string;
    author: { id: string; name: string | null } | null;
  }>;
};

type EmployeeOption = {
  id: string;
  fullName: string;
  title: string;
};

type TeamMember = {
  id: string;
  name: string | null;
  role: string;
};

type RequestsWorkspaceProps = {
  requests: RequestRecord[];
  metrics: {
    open: number;
    atRisk: number;
    breached: number;
    avgResolutionHours: number;
  };
  employees: EmployeeOption[];
  teamMembers: TeamMember[];
  canManage: boolean;
  createHrRequestAction: (formData: FormData) => Promise<void>;
  updateHrRequestStatusAction: (formData: FormData) => Promise<void>;
  bulkUpdateHrRequestStatusAction: (formData: FormData) => Promise<void>;
  addHrRequestCommentAction: (formData: FormData) => Promise<void>;
  savedViews: Array<{ id: string; name: string; query: string }>;
  saveWorkspaceViewAction: (formData: FormData) => Promise<{ error?: string; success?: string }>;
  deleteSavedViewAction: (formData: FormData) => Promise<void>;
};

type RequestView = "all" | "open" | "risk" | "breached" | "unowned";

const requestViews: Array<{ id: RequestView; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "open", label: "Abertos" },
  { id: "risk", label: "Em risco" },
  { id: "breached", label: "Estourados" },
  { id: "unowned", label: "Sem dono" }
];

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSlaVariant(status: string) {
  if (status === "BREACHED") {
    return "destructive" as const;
  }

  if (status === "AT_RISK") {
    return "warning" as const;
  }

  return "success" as const;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function RequestsWorkspace({
  requests,
  metrics,
  employees,
  teamMembers,
  canManage,
  createHrRequestAction,
  updateHrRequestStatusAction,
  bulkUpdateHrRequestStatusAction,
  addHrRequestCommentAction,
  savedViews,
  saveWorkspaceViewAction,
  deleteSavedViewAction
}: RequestsWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const initialView = (searchParams.get("view") as RequestView) || "open";
  const initialQuery = searchParams.get("q") ?? "";
  const initialSelected = searchParams.get("selected");

  const [view, setView] = useState<RequestView>(requestViews.some((item) => item.id === initialView) ? initialView : "open");
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected ?? requests[0]?.id ?? null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<HrRequestStatus>(HrRequestStatus.IN_PROGRESS);
  const [pendingBulk, startBulkTransition] = useTransition();

  const filteredRequests = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return requests.filter((request) => {
      const viewMatch =
        view === "all"
          ? true
          : view === "open"
            ? ["OPEN", "IN_PROGRESS", "WAITING_ON_REQUESTER"].includes(request.status)
            : view === "risk"
              ? request.effectiveSlaStatus === "AT_RISK"
              : view === "breached"
                ? request.effectiveSlaStatus === "BREACHED"
                : !request.assigneeUser;

      if (!viewMatch) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [
        request.title,
        request.description,
        request.category,
        request.requesterEmployee?.fullName ?? "",
        request.requesterUser?.name ?? "",
        request.assigneeUser?.name ?? ""
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [query, requests, view]);

  useEffect(() => {
    if (!filteredRequests.some((request) => request.id === selectedId)) {
      setSelectedId(filteredRequests[0]?.id ?? null);
    }
  }, [filteredRequests, selectedId]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => filteredRequests.some((request) => request.id === id)));
  }, [filteredRequests]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (view === "open") {
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

      if (!filteredRequests.length) {
        return;
      }

      const currentIndex = Math.max(
        0,
        filteredRequests.findIndex((request) => request.id === selectedId)
      );

      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        const nextIndex = Math.min(filteredRequests.length - 1, currentIndex + 1);
        setSelectedId(filteredRequests[nextIndex]?.id ?? null);
      }

      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        const nextIndex = Math.max(0, currentIndex - 1);
        setSelectedId(filteredRequests[nextIndex]?.id ?? null);
      }

      if (event.key.toLowerCase() === "x" && selectedId) {
        event.preventDefault();
        toggleSelected(selectedId);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [filteredRequests, selectedId]);

  const selectedRequest = filteredRequests.find((request) => request.id === selectedId) ?? filteredRequests[0] ?? null;
  const stats = [
    { label: "Abertas", value: metrics.open },
    { label: "Em risco", value: metrics.atRisk },
    { label: "Estouradas", value: metrics.breached },
    { label: "Resolução média", value: `${metrics.avgResolutionHours}h` }
  ];
  const viewQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (view !== "open") {
      params.set("view", view);
    }
    if (query.trim()) {
      params.set("q", query.trim());
    }
    return params.toString();
  }, [query, view]);

  function applySavedView(savedQuery: string) {
    const params = new URLSearchParams(savedQuery);
    const nextView = params.get("view");
    const nextQuery = params.get("q") ?? "";

    setView(requestViews.some((item) => item.id === nextView) ? (nextView as RequestView) : "open");
    setQuery(nextQuery);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAllVisible() {
    const visibleIds = filteredRequests.map((request) => request.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? selectedIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedIds, ...visibleIds])));
  }

  async function applyBulkStatus() {
    const formData = new FormData();
    selectedIds.forEach((id) => formData.append("requestIds", id));
    formData.set("status", bulkStatus);

    startBulkTransition(async () => {
      await bulkUpdateHrRequestStatusAction(formData);
      setSelectedIds([]);
      router.refresh();
    });
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Internal RH service desk</span>
        <h2 className={styles.title}>Solicitações</h2>
        <p className={styles.description}>Fila mais clara, foco em SLA, dono e próximo passo sem obrigar o usuário a navegar demais.</p>
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
            {requestViews.map((item) => (
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
          <span className={styles.shortcutHint}>Atalhos: `/` busca, `J/K` navegam, `X` seleciona o item atual.</span>
        </div>

        <div className={styles.searchWrap}>
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título, categoria, solicitante ou responsável"
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
                <p className={styles.panelDescription}>{filteredRequests.length} caso(s) na visão atual.</p>
              </div>
              <Button type="button" variant="outline" onClick={toggleAllVisible}>
                {filteredRequests.length && filteredRequests.every((request) => selectedIds.includes(request.id)) ? "Limpar seleção" : "Selecionar todos"}
              </Button>
            </div>
          </div>

          {selectedIds.length ? (
            <div className={styles.bulkBar}>
              <div className={styles.bulkBarLeft}>
                <span className={styles.metaValue}>{selectedIds.length} selecionado(s)</span>
                <Select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as HrRequestStatus)} className={styles.selectCompact}>
                  {Object.values(HrRequestStatus).map((status) => (
                    <option key={status} value={status}>
                      {formatEnumLabel(status)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className={styles.bulkBarRight}>
                <Button type="button" variant="outline" onClick={() => setSelectedIds([])}>
                  Limpar
                </Button>
                <Button type="button" onClick={applyBulkStatus} disabled={pendingBulk}>
                  {pendingBulk ? "Aplicando..." : "Aplicar em massa"}
                </Button>
              </div>
            </div>
          ) : null}

          <div className={styles.list}>
            {filteredRequests.length ? (
              filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className={`${styles.row} ${styles.rowSelectable} ${selectedRequest?.id === request.id ? styles.rowActive : ""}`}
                >
                  <input
                    type="checkbox"
                    className={styles.rowCheck}
                    checked={selectedIds.includes(request.id)}
                    onChange={() => toggleSelected(request.id)}
                    aria-label={`Selecionar ${request.title}`}
                  />

                  <button type="button" className={styles.rowContent} onClick={() => setSelectedId(request.id)}>
                    <div className={styles.rowTop}>
                      <div className={styles.rowLead}>
                        <p className={styles.rowTitle}>{request.title}</p>
                        <p className={styles.rowSubtitle}>{formatEnumLabel(request.category)}</p>
                      </div>
                      <Badge variant={getSlaVariant(request.effectiveSlaStatus)}>{formatEnumLabel(request.effectiveSlaStatus)}</Badge>
                    </div>

                    <div className={styles.rowMeta}>
                      <span className={styles.metaValue}>
                        {request.assigneeUser?.name ? `Dono: ${request.assigneeUser.name}` : "Sem dono"}
                      </span>
                      <span className={styles.metaValue}>{formatEnumLabel(request.status)}</span>
                    </div>
                  </button>
                </div>
              ))
            ) : (
              <div className={styles.emptyWrap}>
                <p className={styles.emptyState}>Nenhuma solicitação encontrada nesta visão.</p>
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            {selectedRequest ? (
              <>
                <div className={styles.detailLead}>
                  <div className={styles.detailMeta}>
                    <div className={styles.detailLead}>
                      <h3 className={styles.detailTitle}>{selectedRequest.title}</h3>
                      <p className={styles.detailSubtitle}>{formatEnumLabel(selectedRequest.category)}</p>
                    </div>
                    <div className={styles.rowMeta}>
                      <Badge variant="outline">{formatEnumLabel(selectedRequest.status)}</Badge>
                      <Badge variant={getSlaVariant(selectedRequest.effectiveSlaStatus)}>
                        {formatEnumLabel(selectedRequest.effectiveSlaStatus)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <p className={styles.detailText}>{selectedRequest.description}</p>

                <div className={styles.detailGrid}>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Solicitante</span>
                    <span className={styles.metaValue}>
                      {selectedRequest.requesterEmployee?.fullName || selectedRequest.requesterUser?.name || "Interno"}
                    </span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Responsável</span>
                    <span className={styles.metaValue}>{selectedRequest.assigneeUser?.name ?? "Sem responsável"}</span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Prioridade</span>
                    <span className={styles.metaValue}>{formatEnumLabel(selectedRequest.priority)}</span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Prazo</span>
                    <span className={styles.metaValue}>
                      {selectedRequest.dueAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(selectedRequest.dueAt) : "Sem prazo"}
                    </span>
                  </div>
                </div>

                {canManage ? (
                  <form action={updateHrRequestStatusAction} className={styles.sectionStack}>
                    <input type="hidden" name="requestId" value={selectedRequest.id} />
                    <div className={styles.sectionHeader}>
                      <h4 className={styles.panelTitle}>Atualizar status</h4>
                      <Button type="submit" variant="outline">
                        Salvar
                      </Button>
                    </div>
                    <Select name="status" defaultValue={selectedRequest.status} className={styles.selectCompact}>
                      {Object.values(HrRequestStatus).map((status) => (
                        <option key={status} value={status}>
                          {formatEnumLabel(status)}
                        </option>
                      ))}
                    </Select>
                  </form>
                ) : null}

                <div className={styles.detailSection}>
                  <div className={styles.sectionHeader}>
                    <h4 className={styles.panelTitle}>Comentários recentes</h4>
                  </div>

                  {selectedRequest.comments.length ? (
                    <div className={styles.commentList}>
                      {selectedRequest.comments.map((comment) => (
                        <div key={comment.id} className={styles.commentItem}>
                          <span className={styles.commentAuthor}>{comment.author?.name ?? "Sistema"}</span>
                          <p className={styles.commentBody}>{comment.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyState}>Ainda não há comentários neste caso.</p>
                  )}
                </div>

                <form action={addHrRequestCommentAction} className={styles.sectionStack}>
                  <input type="hidden" name="requestId" value={selectedRequest.id} />
                  <div className={styles.sectionHeader}>
                    <h4 className={styles.panelTitle}>Adicionar comentário</h4>
                    <Button type="submit">Comentar</Button>
                  </div>
                  <Input name="message" required placeholder="Escreva um comentário curto e objetivo" className={styles.fieldCompact} />
                </form>
              </>
            ) : (
              <p className={styles.emptyState}>Selecione uma solicitação para ver os detalhes.</p>
            )}
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Vistas salvas</h3>
              <p className={styles.panelDescription}>Guarde filtros úteis para voltar neles sem remontar a fila.</p>
            </div>
            <WorkspaceSavedViews
              views={savedViews}
              currentQuery={viewQuery}
              onApply={applySavedView}
              type={SavedViewType.REQUESTS}
              saveWorkspaceViewAction={saveWorkspaceViewAction}
              deleteSavedViewAction={deleteSavedViewAction}
            />
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Nova solicitação</h3>
              <p className={styles.panelDescription}>Abra um caso com contexto completo desde a primeira entrada.</p>
            </div>

            <form action={createHrRequestAction} className={styles.formGrid}>
              <Input name="title" required placeholder="Título da solicitação" className={styles.fieldCompact} />
              <div className={styles.formGrid2}>
                <Select name="category" defaultValue={HrRequestCategory.GENERAL_SUPPORT} className={styles.selectCompact}>
                  {Object.values(HrRequestCategory).map((category) => (
                    <option key={category} value={category}>
                      {formatEnumLabel(category)}
                    </option>
                  ))}
                </Select>
                <Select name="priority" defaultValue={PeopleTaskPriority.MEDIUM} className={styles.selectCompact}>
                  {Object.values(PeopleTaskPriority).map((priority) => (
                    <option key={priority} value={priority}>
                      {formatEnumLabel(priority)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className={styles.formGrid2}>
                <Input name="dueAt" type="date" className={styles.fieldCompact} />
                <Select name="requesterEmployeeId" defaultValue="" className={styles.selectCompact}>
                  <option value="">Solicitante sem colaborador vinculado</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName} - {employee.title}
                    </option>
                  ))}
                </Select>
              </div>
              <Select name="assigneeUserId" defaultValue="" className={styles.selectCompact}>
                <option value="">Sem responsável inicial</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {(member.name ?? "Sem nome")} - {member.role}
                  </option>
                ))}
              </Select>
              <Textarea name="description" required placeholder="Descrição do caso" className={styles.textareaCompact} />
              <div className={styles.formActions}>
                <p className={styles.detailText}>Use esse formulário para registrar o contexto mínimo sem perder velocidade.</p>
                <Button type="submit">Criar caso</Button>
              </div>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
