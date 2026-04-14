"use client";

import type { Route } from "next";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PeopleTaskPriority, PeopleTaskStatus, SavedViewType } from "@prisma/client";

import { WorkspaceSavedViews } from "@/components/operations/workspace-saved-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import styles from "./ops-workspace.module.css";

type TaskRecord = {
  id: string;
  title: string;
  description: string | null;
  priority: PeopleTaskPriority;
  status: PeopleTaskStatus;
  sourceType: string;
  isOverdue: boolean;
  dueAt: Date | null;
  assigneeUser: { id: string; name: string | null; email: string | null } | null;
  assigneeEmployee: { id: string; fullName: string; title: string } | null;
  relatedEmployee: { id: string; fullName: string; title: string } | null;
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

type TasksWorkspaceProps = {
  tasks: TaskRecord[];
  metrics: {
    total: number;
    overdue: number;
    blocked: number;
    inProgress: number;
  };
  employees: EmployeeOption[];
  teamMembers: TeamMember[];
  canManage: boolean;
  createPeopleTaskAction: (formData: FormData) => Promise<void>;
  updatePeopleTaskStatusAction: (formData: FormData) => Promise<void>;
  bulkUpdatePeopleTaskStatusAction: (formData: FormData) => Promise<void>;
  updatePeopleTaskDetailsAction: (formData: FormData) => Promise<void>;
  addPeopleTaskCommentAction: (formData: FormData) => Promise<void>;
  savedViews: Array<{ id: string; name: string; query: string }>;
  saveWorkspaceViewAction: (formData: FormData) => Promise<{ error?: string; success?: string }>;
  deleteSavedViewAction: (formData: FormData) => Promise<void>;
};

type TaskView = "all" | "overdue" | "blocked" | "progress" | "unassigned";

const taskViews: Array<{ id: TaskView; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "progress", label: "Em progresso" },
  { id: "overdue", label: "Vencidas" },
  { id: "blocked", label: "Bloqueadas" },
  { id: "unassigned", label: "Sem dono" }
];

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusVariant(task: Pick<TaskRecord, "status" | "isOverdue">) {
  if (task.isOverdue) {
    return "destructive" as const;
  }

  if (task.status === "BLOCKED") {
    return "warning" as const;
  }

  if (task.status === "DONE") {
    return "success" as const;
  }

  return "outline" as const;
}

function formatDateInput(date: Date | null) {
  if (!date) {
    return "";
  }

  const normalized = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return normalized.toISOString().slice(0, 10);
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function PeopleTasksWorkspace({
  tasks,
  metrics,
  employees,
  teamMembers,
  canManage,
  createPeopleTaskAction,
  updatePeopleTaskStatusAction,
  bulkUpdatePeopleTaskStatusAction,
  updatePeopleTaskDetailsAction,
  addPeopleTaskCommentAction,
  savedViews,
  saveWorkspaceViewAction,
  deleteSavedViewAction
}: TasksWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const initialView = (searchParams.get("view") as TaskView) || "all";
  const initialQuery = searchParams.get("q") ?? "";
  const initialSelected = searchParams.get("selected");

  const [view, setView] = useState<TaskView>(taskViews.some((item) => item.id === initialView) ? initialView : "all");
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected ?? tasks[0]?.id ?? null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<PeopleTaskStatus>(PeopleTaskStatus.IN_PROGRESS);
  const [pendingBulk, startBulkTransition] = useTransition();
  const [pendingStatus, startStatusTransition] = useTransition();
  const [pendingContext, startContextTransition] = useTransition();

  const filteredTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return tasks.filter((task) => {
      const viewMatch =
        view === "all"
          ? true
          : view === "overdue"
            ? task.isOverdue
            : view === "blocked"
              ? task.status === "BLOCKED"
              : view === "progress"
                ? task.status === "IN_PROGRESS"
                : !task.assigneeUser && !task.assigneeEmployee;

      if (!viewMatch) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [
        task.title,
        task.description ?? "",
        task.assigneeUser?.name ?? "",
        task.assigneeEmployee?.fullName ?? "",
        task.relatedEmployee?.fullName ?? "",
        task.sourceType
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [query, tasks, view]);

  useEffect(() => {
    if (!filteredTasks.some((task) => task.id === selectedId)) {
      setSelectedId(filteredTasks[0]?.id ?? null);
    }
  }, [filteredTasks, selectedId]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => filteredTasks.some((task) => task.id === id)));
  }, [filteredTasks]);

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

      if (!filteredTasks.length) {
        return;
      }

      const currentIndex = Math.max(
        0,
        filteredTasks.findIndex((task) => task.id === selectedId)
      );

      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        const nextIndex = Math.min(filteredTasks.length - 1, currentIndex + 1);
        setSelectedId(filteredTasks[nextIndex]?.id ?? null);
      }

      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        const nextIndex = Math.max(0, currentIndex - 1);
        setSelectedId(filteredTasks[nextIndex]?.id ?? null);
      }

      if (event.key.toLowerCase() === "x" && selectedId) {
        event.preventDefault();
        toggleSelected(selectedId);
        return;
      }

      if (event.key === "X") {
        event.preventDefault();
        const visibleIds = filteredTasks.map((task) => task.id);
        const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
        setSelectedIds(
          allSelected ? selectedIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedIds, ...visibleIds]))
        );
        return;
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [filteredTasks, query, selectedId, selectedIds]);

  const selectedTask = filteredTasks.find((task) => task.id === selectedId) ?? filteredTasks[0] ?? null;
  const stats = [
    { label: "Total", value: metrics.total },
    { label: "Vencidas", value: metrics.overdue },
    { label: "Bloqueadas", value: metrics.blocked },
    { label: "Em progresso", value: metrics.inProgress }
  ];
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

  function applySavedView(savedQuery: string) {
    const params = new URLSearchParams(savedQuery);
    const nextView = params.get("view");
    const nextQuery = params.get("q") ?? "";

    setView(taskViews.some((item) => item.id === nextView) ? (nextView as TaskView) : "all");
    setQuery(nextQuery);
  }

  function applyTaskStatus(status: PeopleTaskStatus) {
    if (!selectedTask || status === selectedTask.status) {
      return;
    }

    const formData = new FormData();
    formData.set("taskId", selectedTask.id);
    formData.set("status", status);

    startStatusTransition(async () => {
      await updatePeopleTaskStatusAction(formData);
      router.refresh();
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAllVisible() {
    const visibleIds = filteredTasks.map((task) => task.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? selectedIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedIds, ...visibleIds])));
  }

  async function applyBulkStatus() {
    const formData = new FormData();
    selectedIds.forEach((id) => formData.append("taskIds", id));
    formData.set("status", bulkStatus);

    startBulkTransition(async () => {
      await bulkUpdatePeopleTaskStatusAction(formData);
      setSelectedIds([]);
      router.refresh();
    });
  }

  function submitTaskContext(formData: FormData) {
    startContextTransition(async () => {
      await updatePeopleTaskDetailsAction(formData);
      router.refresh();
    });
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>People tasks</span>
        <h2 className={styles.title}>Tarefas</h2>
        <p className={styles.description}>Menos backlog espalhado e mais clareza sobre dono, prazo e próximo movimento.</p>
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
            {taskViews.map((item) => (
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
          <span className={styles.shortcutHint}>Atalhos: `/` busca, `J/K` navegam, `X` seleciona o item atual e `Shift + X` marca toda a lista visível.</span>
        </div>

        <div className={styles.searchWrap}>
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título, colaborador, responsável ou origem"
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <div>
                <h3 className={styles.panelTitle}>Backlog</h3>
                <p className={styles.panelDescription}>{filteredTasks.length} tarefa(s) visíveis nesta visão.</p>
              </div>
              <Button type="button" variant="outline" onClick={toggleAllVisible}>
                {filteredTasks.length && filteredTasks.every((task) => selectedIds.includes(task.id)) ? "Limpar seleção" : "Selecionar todos"}
              </Button>
            </div>
          </div>

          {selectedIds.length ? (
            <div className={styles.bulkBar}>
              <div className={styles.bulkBarLeft}>
                <span className={styles.metaValue}>{selectedIds.length} selecionada(s)</span>
                <Select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as PeopleTaskStatus)} className={styles.selectCompact}>
                  {Object.values(PeopleTaskStatus).map((status) => (
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
            {filteredTasks.length ? (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`${styles.row} ${styles.rowSelectable} ${selectedTask?.id === task.id ? styles.rowActive : ""}`}
                >
                  <input
                    type="checkbox"
                    className={styles.rowCheck}
                    checked={selectedIds.includes(task.id)}
                    onChange={() => toggleSelected(task.id)}
                    aria-label={`Selecionar ${task.title}`}
                  />

                  <button type="button" className={styles.rowContent} onClick={() => setSelectedId(task.id)}>
                    <div className={styles.rowTop}>
                      <div className={styles.rowLead}>
                        <p className={styles.rowTitle}>{task.title}</p>
                        <p className={styles.rowSubtitle}>{task.assigneeUser?.name ? `Responsável: ${task.assigneeUser.name}` : "Sem responsável"}</p>
                      </div>
                      <Badge variant={getStatusVariant(task)}>
                        {task.isOverdue ? "Vencida" : formatEnumLabel(task.status)}
                      </Badge>
                    </div>

                    <div className={styles.rowMeta}>
                      <span className={styles.metaValue}>{formatEnumLabel(task.priority)}</span>
                      <span className={styles.metaValue}>{task.relatedEmployee?.fullName ?? "Sem colaborador"}</span>
                    </div>
                  </button>
                </div>
              ))
            ) : (
              <div className={styles.emptyWrap}>
                <p className={styles.emptyState}>Nenhuma tarefa encontrada nesta visão.</p>
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            {selectedTask ? (
              <>
                <div className={styles.detailLead}>
                  <div className={styles.detailMeta}>
                    <div className={styles.detailLead}>
                      <h3 className={styles.detailTitle}>{selectedTask.title}</h3>
                      <p className={styles.detailSubtitle}>{formatEnumLabel(selectedTask.sourceType)}</p>
                    </div>
                    <div className={styles.rowMeta}>
                      <Badge variant="outline">{formatEnumLabel(selectedTask.priority)}</Badge>
                      <Badge variant={getStatusVariant(selectedTask)}>
                        {selectedTask.isOverdue ? "Vencida" : formatEnumLabel(selectedTask.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {selectedTask.description ? <p className={styles.detailText}>{selectedTask.description}</p> : null}

                <div className={styles.detailGrid}>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Responsável</span>
                    <span className={styles.metaValue}>
                      {selectedTask.assigneeUser?.name ?? selectedTask.assigneeEmployee?.fullName ?? "Sem responsável"}
                    </span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Colaborador</span>
                    <span className={styles.metaValue}>{selectedTask.relatedEmployee?.fullName ?? "Não vinculado"}</span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Prazo</span>
                    <span className={styles.metaValue}>
                      {selectedTask.dueAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(selectedTask.dueAt) : "Sem prazo"}
                    </span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Origem</span>
                    <span className={styles.metaValue}>{formatEnumLabel(selectedTask.sourceType)}</span>
                  </div>
                </div>

                {canManage ? (
                  <div className={styles.detailSection}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <h4 className={styles.panelTitle}>Próximo status</h4>
                        <p className={styles.detailText}>Resolva a tarefa com um clique, sem depender de select e submit.</p>
                      </div>
                      {pendingStatus ? <span className={styles.metaLabel}>Atualizando...</span> : null}
                    </div>
                    <div className={styles.quickActions}>
                      {Object.values(PeopleTaskStatus).map((status) => (
                        <Button
                          key={status}
                          type="button"
                          size="sm"
                          variant={status === selectedTask.status ? "default" : "outline"}
                          className={styles.quickActionButton}
                          disabled={pendingStatus || status === selectedTask.status}
                          onClick={() => applyTaskStatus(status)}
                        >
                          {formatEnumLabel(status)}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {canManage ? (
                  <form action={submitTaskContext} className={styles.sectionStack}>
                    <input type="hidden" name="taskId" value={selectedTask.id} />
                    <div className={styles.sectionHeader}>
                      <div>
                        <h4 className={styles.panelTitle}>Contexto rápido</h4>
                        <p className={styles.detailText}>Atualize dono, prioridade e prazo no mesmo fluxo.</p>
                      </div>
                      <Button type="submit" variant="outline" disabled={pendingContext}>
                        {pendingContext ? "Salvando..." : "Salvar contexto"}
                      </Button>
                    </div>
                    <div className={styles.formGrid2}>
                      <Select name="assigneeUserId" defaultValue={selectedTask.assigneeUser?.id ?? ""} className={styles.selectCompact}>
                        <option value="">Sem responsável</option>
                        {teamMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {(member.name ?? "Sem nome")} - {member.role}
                          </option>
                        ))}
                      </Select>
                      <Select name="priority" defaultValue={selectedTask.priority} className={styles.selectCompact}>
                        {Object.values(PeopleTaskPriority).map((priority) => (
                          <option key={priority} value={priority}>
                            {formatEnumLabel(priority)}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Input
                      type="date"
                      name="dueAt"
                      defaultValue={formatDateInput(selectedTask.dueAt)}
                      className={styles.fieldCompact}
                    />
                  </form>
                ) : null}

                <div className={styles.detailSection}>
                  <div className={styles.sectionHeader}>
                    <h4 className={styles.panelTitle}>Comentários recentes</h4>
                  </div>

                  {selectedTask.comments.length ? (
                    <div className={styles.commentList}>
                      {selectedTask.comments.map((comment) => (
                        <div key={comment.id} className={styles.commentItem}>
                          <span className={styles.commentAuthor}>{comment.author?.name ?? "Sistema"}</span>
                          <p className={styles.commentBody}>{comment.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyState}>Ainda não há comentários nesta tarefa.</p>
                  )}
                </div>

                {canManage ? (
                  <form action={addPeopleTaskCommentAction} className={styles.sectionStack}>
                    <input type="hidden" name="taskId" value={selectedTask.id} />
                    <div className={styles.sectionHeader}>
                      <h4 className={styles.panelTitle}>Adicionar comentário</h4>
                      <Button type="submit">Comentar</Button>
                    </div>
                    <Input
                      name="message"
                      required
                      placeholder="Registrar um comentário rápido"
                      className={styles.fieldCompact}
                    />
                  </form>
                ) : null}
              </>
            ) : (
              <p className={styles.emptyState}>Selecione uma tarefa para ver os detalhes.</p>
            )}
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Vistas salvas</h3>
              <p className={styles.panelDescription}>Guarde combinações úteis de filtro para voltar nelas em um clique.</p>
            </div>
            <WorkspaceSavedViews
              views={savedViews}
              currentQuery={viewQuery}
              onApply={applySavedView}
              type={SavedViewType.PEOPLE_TASKS}
              saveWorkspaceViewAction={saveWorkspaceViewAction}
              deleteSavedViewAction={deleteSavedViewAction}
            />
          </section>

          {canManage ? (
            <section className={styles.formPanel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Nova tarefa</h3>
                <p className={styles.panelDescription}>Cadastro simples para não tirar ritmo da operação.</p>
              </div>

              <form action={createPeopleTaskAction} className={styles.formGrid}>
                <div className={styles.formGrid2}>
                  <Input name="title" required placeholder="Título" className={styles.fieldCompact} />
                  <Select name="priority" defaultValue={PeopleTaskPriority.MEDIUM} className={styles.selectCompact}>
                    {Object.values(PeopleTaskPriority).map((priority) => (
                      <option key={priority} value={priority}>
                        {formatEnumLabel(priority)}
                    </option>
                  ))}
                </Select>
              </div>
                <Textarea name="description" placeholder="Descrição da tarefa" className={styles.textareaCompact} />
                <details className={styles.disclosureCard}>
                  <summary className={styles.disclosureSummary}>Responsável, prazo e vínculos</summary>
                  <div className={styles.disclosureBody}>
                    <div className={styles.formGrid2}>
                      <Select name="assigneeUserId" defaultValue="" className={styles.selectCompact}>
                        <option value="">Sem responsável do time</option>
                        {teamMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {(member.name ?? "Sem nome")} - {member.role}
                          </option>
                        ))}
                      </Select>
                      <Select name="relatedEmployeeId" defaultValue="" className={styles.selectCompact}>
                        <option value="">Sem colaborador associado</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.fullName} - {employee.title}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className={styles.formGrid2}>
                      <Input name="dueAt" type="date" className={styles.fieldCompact} />
                      <Input name="sourceType" defaultValue="manual" className={styles.fieldCompact} />
                    </div>
                  </div>
                </details>
                <div className={styles.formActions}>
                  <p className={styles.detailText}>Crie a tarefa com o básico e só desça para os vínculos quando precisar.</p>
                  <Button type="submit">Criar tarefa</Button>
                </div>
              </form>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
