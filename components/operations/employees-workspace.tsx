"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { EmployeeStatus, SavedViewType } from "@prisma/client";

import { WorkspaceSavedViews } from "@/components/operations/workspace-saved-views";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import styles from "./ops-workspace.module.css";

type EmployeeRecord = {
  id: string;
  fullName: string;
  preferredName: string | null;
  workEmail: string | null;
  title: string;
  department: string;
  location: string | null;
  status: EmployeeStatus;
  manager: {
    id: string;
    fullName: string;
    title: string;
  } | null;
  directReports: Array<{ id: string }>;
  workflowRuns: Array<{
    id: string;
    kind: string;
    steps: Array<{ status: string }>;
  }>;
};

type EmployeeOption = {
  id: string;
  fullName: string;
  title: string;
};

type EmployeesWorkspaceProps = {
  employees: EmployeeRecord[];
  managerOptions: EmployeeOption[];
  canManage: boolean;
  createEmployeeAction: (formData: FormData) => Promise<void>;
  updateEmployeeStatusAction: (formData: FormData) => Promise<void>;
  bulkUpdateEmployeeStatusAction: (formData: FormData) => Promise<void>;
  savedViews: Array<{ id: string; name: string; query: string }>;
  saveWorkspaceViewAction: (formData: FormData) => Promise<{ error?: string; success?: string }>;
  deleteSavedViewAction: (formData: FormData) => Promise<void>;
};

type EmployeeView = "all" | "active" | "onboarding" | "managerless";

const employeeViews: Array<{ id: EmployeeView; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Ativos" },
  { id: "onboarding", label: "Onboarding" },
  { id: "managerless", label: "Sem gestor" }
];

function getBadgeVariant(status: string) {
  if (status === "ACTIVE") {
    return "success" as const;
  }

  if (status === "OFFBOARDING" || status === "INACTIVE") {
    return "warning" as const;
  }

  return "outline" as const;
}

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getWorkflowProgress(steps: Array<{ status: string }>) {
  if (!steps.length) {
    return 0;
  }

  return Math.round((steps.filter((step) => step.status === "DONE").length / steps.length) * 100);
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

export function EmployeesWorkspace({
  employees,
  managerOptions,
  canManage,
  createEmployeeAction,
  updateEmployeeStatusAction,
  bulkUpdateEmployeeStatusAction,
  savedViews,
  saveWorkspaceViewAction,
  deleteSavedViewAction
}: EmployeesWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const initialView = (searchParams.get("view") as EmployeeView) || "all";
  const initialQuery = searchParams.get("q") ?? "";
  const initialSelected = searchParams.get("selected");

  const [view, setView] = useState<EmployeeView>(employeeViews.some((item) => item.id === initialView) ? initialView : "all");
  const [query, setQuery] = useState(initialQuery);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected ?? employees[0]?.id ?? null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<EmployeeStatus>(EmployeeStatus.ACTIVE);
  const [pendingBulk, startBulkTransition] = useTransition();
  const [pendingStatus, startStatusTransition] = useTransition();

  const filteredEmployees = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return employees.filter((employee) => {
      const viewMatch =
        view === "all"
          ? true
          : view === "active"
            ? employee.status === "ACTIVE"
            : view === "onboarding"
              ? employee.status === "ONBOARDING"
              : !employee.manager;

      if (!viewMatch) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [employee.fullName, employee.title, employee.department, employee.location ?? "", employee.manager?.fullName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [employees, query, view]);

  useEffect(() => {
    if (!filteredEmployees.some((employee) => employee.id === selectedId)) {
      setSelectedId(filteredEmployees[0]?.id ?? null);
    }
  }, [filteredEmployees, selectedId]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => filteredEmployees.some((employee) => employee.id === id)));
  }, [filteredEmployees]);

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

      if (!filteredEmployees.length) {
        return;
      }

      const currentIndex = Math.max(
        0,
        filteredEmployees.findIndex((employee) => employee.id === selectedId)
      );

      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        const nextIndex = Math.min(filteredEmployees.length - 1, currentIndex + 1);
        setSelectedId(filteredEmployees[nextIndex]?.id ?? null);
      }

      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        const nextIndex = Math.max(0, currentIndex - 1);
        setSelectedId(filteredEmployees[nextIndex]?.id ?? null);
      }

      if (event.key.toLowerCase() === "x" && selectedId) {
        event.preventDefault();
        toggleSelected(selectedId);
        return;
      }

      if (event.key === "X") {
        event.preventDefault();
        const visibleIds = filteredEmployees.map((employee) => employee.id);
        const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
        setSelectedIds(
          allSelected ? selectedIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedIds, ...visibleIds]))
        );
        return;
      }

      if (event.key === "Enter" && selectedId) {
        event.preventDefault();
        router.push((`/employees/${selectedId}`) as Route);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [filteredEmployees, query, router, selectedId, selectedIds]);

  const selectedEmployee = filteredEmployees.find((employee) => employee.id === selectedId) ?? filteredEmployees[0] ?? null;
  const stats = [
    { label: "Base total", value: employees.length },
    { label: "Ativos", value: employees.filter((employee) => employee.status === "ACTIVE").length },
    { label: "Onboarding", value: employees.filter((employee) => employee.status === "ONBOARDING").length },
    { label: "Sem gestor", value: employees.filter((employee) => !employee.manager).length }
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

    setView(employeeViews.some((item) => item.id === nextView) ? (nextView as EmployeeView) : "all");
    setQuery(nextQuery);
  }

  function applyEmployeeStatus(status: EmployeeStatus) {
    if (!selectedEmployee || status === selectedEmployee.status) {
      return;
    }

    const formData = new FormData();
    formData.set("employeeId", selectedEmployee.id);
    formData.set("status", status);

    startStatusTransition(async () => {
      await updateEmployeeStatusAction(formData);
      router.refresh();
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAllVisible() {
    const visibleIds = filteredEmployees.map((employee) => employee.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? selectedIds.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selectedIds, ...visibleIds])));
  }

  async function applyBulkStatus() {
    const formData = new FormData();
    selectedIds.forEach((id) => formData.append("employeeIds", id));
    formData.set("status", bulkStatus);

    startBulkTransition(async () => {
      await bulkUpdateEmployeeStatusAction(formData);
      setSelectedIds([]);
      router.refresh();
    });
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Diretório de pessoas</span>
        <h2 className={styles.title}>Colaboradores</h2>
        <p className={styles.description}>Encontre qualquer pessoa, veja contexto básico e abra o perfil completo quando precisar agir.</p>
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
            {employeeViews.map((item) => (
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
          <span className={styles.shortcutHint}>Dica: escolha um colaborador para ver o resumo. Abra o perfil só quando precisar editar ou acompanhar.</span>
        </div>

        <div className={styles.searchWrap}>
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, cargo, gestor ou área"
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.workflowGuide} aria-label="Como usar esta tela">
        <span><strong>1.</strong> Busque a pessoa</span>
        <span><strong>2.</strong> Confira status e gestor</span>
        <span><strong>3.</strong> Abra o perfil para agir</span>
      </div>

      <div className={styles.body}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <div>
                <h3 className={styles.panelTitle}>1. Escolha um colaborador</h3>
                <p className={styles.panelDescription}>
                  {filteredEmployees.length} pessoa(s) visíveis. Use as visões para encontrar ativos, onboarding e pessoas sem gestor.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={toggleAllVisible}>
                {filteredEmployees.length && filteredEmployees.every((employee) => selectedIds.includes(employee.id)) ? "Limpar seleção" : "Selecionar todos"}
              </Button>
            </div>
          </div>

          {selectedIds.length ? (
            <div className={styles.bulkBar}>
              <div className={styles.bulkBarLeft}>
                <span className={styles.metaValue}>{selectedIds.length} selecionado(s)</span>
                <Select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as EmployeeStatus)} className={styles.selectCompact}>
                  {Object.values(EmployeeStatus).map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
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

          {pendingBulk ? <p className={styles.feedbackLine} aria-live="polite">Atualizando colaboradores selecionados...</p> : null}

          <div className={styles.list}>
            {filteredEmployees.length ? (
              filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className={`${styles.row} ${styles.rowSelectable} ${selectedEmployee?.id === employee.id ? styles.rowActive : ""}`}
                >
                  <input
                    type="checkbox"
                    className={styles.rowCheck}
                    checked={selectedIds.includes(employee.id)}
                    onChange={() => toggleSelected(employee.id)}
                    aria-label={`Selecionar ${employee.fullName}`}
                  />

                  <button type="button" className={styles.rowContent} onClick={() => setSelectedId(employee.id)}>
                    <div className={styles.rowTop}>
                      <div className={styles.rowLead}>
                        <p className={styles.rowTitle}>{employee.fullName}</p>
                        <p className={styles.rowSubtitle}>{employee.title}</p>
                      </div>
                      <Badge variant={getBadgeVariant(employee.status)}>{formatStatusLabel(employee.status)}</Badge>
                    </div>

                    <div className={styles.rowMeta}>
                      <span className={styles.metaValue}>{employee.department}</span>
                      <span className={styles.metaValue}>{employee.manager ? employee.manager.fullName : "Sem gestor"}</span>
                    </div>
                  </button>
                </div>
              ))
            ) : (
              <div className={styles.emptyWrap}>
                <p className={styles.emptyTitle}>Nenhum colaborador encontrado.</p>
                <p className={styles.emptyState}>Limpe os filtros ou volte para todos os colaboradores para ampliar a busca.</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setView("all");
                    setQuery("");
                  }}
                >
                  Ver todos os colaboradores
                </Button>
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            {selectedEmployee ? (
              <>
                <div className={styles.detailLead}>
                  <div className={styles.detailMeta}>
                    <div className={styles.detailLead}>
                      <h3 className={styles.detailTitle}>{selectedEmployee.fullName}</h3>
                      <p className={styles.detailSubtitle}>{selectedEmployee.title}</p>
                    </div>
                    <Badge variant={getBadgeVariant(selectedEmployee.status)}>{formatStatusLabel(selectedEmployee.status)}</Badge>
                  </div>
                </div>

                <div className={styles.detailGrid}>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Área</span>
                    <span className={styles.metaValue}>{selectedEmployee.department}</span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Localização</span>
                    <span className={styles.metaValue}>{selectedEmployee.location || "Não informada"}</span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Gestor</span>
                    <span className={styles.metaValue}>{selectedEmployee.manager?.fullName ?? "Sem gestor definido"}</span>
                  </div>
                  <div className={styles.detailCell}>
                    <span className={styles.metaLabel}>Reportes diretos</span>
                    <span className={styles.metaValue}>{selectedEmployee.directReports.length}</span>
                  </div>
                </div>

                {canManage ? (
                  <div className={styles.detailSection}>
                    <div className={styles.sectionHeader}>
                      <div>
                        <h4 className={styles.panelTitle}>Status</h4>
                        <p className={styles.detailText}>Atualize o estado sem abrir um fluxo extra.</p>
                      </div>
                      {pendingStatus ? <span className={styles.feedbackPill} aria-live="polite">Atualizando...</span> : null}
                    </div>
                    <div className={styles.quickActions}>
                      {Object.values(EmployeeStatus).map((status) => (
                        <Button
                          key={status}
                          type="button"
                          size="sm"
                          variant={status === selectedEmployee.status ? "default" : "outline"}
                          className={styles.quickActionButton}
                          disabled={pendingStatus || status === selectedEmployee.status}
                          onClick={() => applyEmployeeStatus(status)}
                        >
                          {formatStatusLabel(status)}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className={styles.detailSection}>
                  <div className={styles.sectionHeader}>
                    <h4 className={styles.panelTitle}>Fluxos ativos</h4>
                    <Button asChild variant="outline">
                      <Link href={`/employees/${selectedEmployee.id}`}>Abrir perfil</Link>
                    </Button>
                  </div>

                  {selectedEmployee.workflowRuns.length ? (
                    <div className={styles.sectionStack}>
                      {selectedEmployee.workflowRuns.map((workflow) => (
                        <div key={workflow.id} className={styles.detailCell}>
                          <div className={styles.sectionHeader}>
                            <span className={styles.metaValue}>{formatStatusLabel(workflow.kind)}</span>
                            <Badge variant={workflow.kind === "ONBOARDING" ? "success" : "warning"}>
                              {getWorkflowProgress(workflow.steps)}%
                            </Badge>
                          </div>
                          <p className={styles.detailText}>{workflow.steps.length} etapa(s) no fluxo ativo.</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyState}>Sem workflow ativo no momento.</p>
                  )}
                </div>
              </>
            ) : (
              <p className={styles.emptyState}>Selecione um colaborador para ver os detalhes.</p>
            )}
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Vistas salvas</h3>
              <p className={styles.panelDescription}>Guarde combinações úteis de filtros para voltar nelas em um clique.</p>
            </div>
            <WorkspaceSavedViews
              views={savedViews}
              currentQuery={viewQuery}
              onApply={applySavedView}
              type={SavedViewType.EMPLOYEES}
              saveWorkspaceViewAction={saveWorkspaceViewAction}
              deleteSavedViewAction={deleteSavedViewAction}
            />
          </section>

          {canManage ? (
            <section className={styles.formPanel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Novo colaborador</h3>
                <p className={styles.panelDescription}>Cadastro rápido para colocar a pessoa no sistema sem fricção.</p>
              </div>

              <form action={createEmployeeAction} className={styles.formGrid}>
                <div className={styles.formGrid2}>
                  <Input name="fullName" required placeholder="Nome completo" className={styles.fieldCompact} />
                  <Input name="preferredName" placeholder="Nome preferido" className={styles.fieldCompact} />
                </div>
                <div className={styles.formGrid2}>
                  <Input name="workEmail" type="email" placeholder="Email corporativo" className={styles.fieldCompact} />
                  <Select name="status" defaultValue="ONBOARDING" className={styles.selectCompact}>
                    <option value="ONBOARDING">Onboarding</option>
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                    <option value="OFFBOARDING">Offboarding</option>
                  </Select>
                </div>
                <div className={styles.formGrid2}>
                  <Input name="title" required placeholder="Cargo" className={styles.fieldCompact} />
                  <Input name="department" required placeholder="Área" className={styles.fieldCompact} />
                </div>

                <details className={styles.disclosureCard}>
                  <summary className={styles.disclosureSummary}>Adicionar detalhes opcionais</summary>
                  <div className={styles.disclosureBody}>
                    <div className={styles.formGrid2}>
                      <Input name="personalEmail" type="email" placeholder="Email pessoal" className={styles.fieldCompact} />
                      <Input name="phone" placeholder="Telefone" className={styles.fieldCompact} />
                    </div>
                    <div className={styles.formGrid2}>
                      <Input name="location" placeholder="Localização" className={styles.fieldCompact} />
                      <Input name="employmentType" placeholder="Tipo de contratação" className={styles.fieldCompact} />
                    </div>
                    <Input name="startDate" type="date" className={styles.fieldCompact} />
                    <Select name="managerEmployeeId" defaultValue="" className={styles.selectCompact}>
                      <option value="">Sem gestor definido</option>
                      {managerOptions.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.fullName} - {employee.title}
                        </option>
                      ))}
                    </Select>
                    <Textarea name="notes" placeholder="Notas iniciais" className={styles.textareaCompact} />
                  </div>
                </details>
                <div className={styles.formActions}>
                  <p className={styles.detailText}>Depois você pode complementar o perfil e iniciar o onboarding completo.</p>
                  <Button type="submit">Cadastrar</Button>
                </div>
              </form>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
