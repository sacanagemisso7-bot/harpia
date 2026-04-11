"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";

import { hasPermission } from "@/lib/auth/permission-matrix";
import { brandPaths } from "@/lib/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

import type { DashboardData, DashboardFocusItem, DashboardViewer } from "./dashboard-model";
import { sidebarItems } from "./dashboard-model";
import { HarpiaContextPanel } from "./harpia-context-panel";
import { HarpiaModuleDeck } from "./harpia-module-deck";
import { HarpiaOverviewBoard } from "./harpia-overview-board";
import { HarpiaSidebar } from "./harpia-sidebar";
import { HarpiaSurface } from "./harpia-surface";
import styles from "./harpia-dashboard-system.module.css";

function formatEventDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(date));
}

function buildFocusItems(data: DashboardData) {
  const priorityItems: DashboardFocusItem[] = [
    ...data.alerts.slice(0, 3).map((alert, index) => ({
      id: `alert-${index}-${alert.title}`,
      title: alert.title,
      subtitle: alert.description,
      meta: alert.type,
      value: alert.severity === "high" ? "alta" : "media",
      tone: alert.severity === "high" ? ("critical" as const) : ("attention" as const),
      href: alert.href as Route,
      source: "priority" as const,
      insights: [
        "Este item apareceu no radar operacional da organização.",
        "Vale revisar o responsavel e a janela de resposta antes que o impacto cresca.",
        "Abrir o fluxo certo agora reduz ruido no restante da operação."
      ]
    })),
    ...data.requests
      .filter((request) => request.effectiveSlaStatus !== "ON_TRACK")
      .slice(0, 2)
      .map((request) => ({
        id: `request-${request.id}`,
        title: request.title,
        subtitle: request.assigneeUser?.name ?? "Sem responsavel definido",
        meta: request.status,
        value: request.effectiveSlaStatus.toLowerCase(),
        tone: request.effectiveSlaStatus === "BREACHED" ? ("critical" as const) : ("attention" as const),
        href: "/requests" as Route,
        source: "priority" as const,
        insights: [
          "O SLA ja saiu da faixa ideal ou esta perto disso.",
          "Revisar ownership e próxima ação costuma destravar esse tipo de fila.",
          "O contexto completo esta na area de requests."
        ]
      }))
  ].slice(0, 5);

  const hiringItems: DashboardFocusItem[] = data.hiring.intelligenceHighlights.slice(0, 5).map((entry) => ({
    id: `candidate-${entry.id}`,
    title: entry.candidateName,
    subtitle: entry.jobTitle,
    meta: entry.stageName,
    value: `${entry.score} score`,
    tone: entry.score >= 85 ? "critical" : "stable",
    href: entry.href as Route,
    source: "hiring" as const,
    insights: [
      "Perfil com leitura forte para decisão mais r?pida.",
      "Vale validar se o stage atual ainda faz sentido para o score observado.",
      "Abrir o caso mostra entrevista, histórico e próximas ações."
    ]
  }));

  const operationsItems: DashboardFocusItem[] = [
    ...data.onboarding.slice(0, 2).map((entry) => ({
      id: `onboarding-${entry.id}`,
      title: entry.employee.fullName,
      subtitle: entry.employee.title,
      meta: "onboarding",
      value: `${entry.steps.filter((step) => step.status === "DONE").length}/${entry.steps.length}`,
      tone: "stable" as const,
      href: "/people/onboarding" as Route,
      source: "operations" as const,
      insights: [
        "Fluxo ativo de entrada com etapas em andamento.",
        "Uma leitura r?pida do progresso evita gargalos escondidos no onboarding.",
        "O detalhe completo fica na area de people ops."
      ]
    })),
    ...data.offboarding.slice(0, 1).map((entry) => ({
      id: `offboarding-${entry.id}`,
      title: entry.employee.fullName,
      subtitle: entry.employee.title,
      meta: "offboarding",
      value: `${entry.steps.filter((step) => step.status === "DONE").length}/${entry.steps.length}`,
      tone: "attention" as const,
      href: "/people/offboarding" as Route,
      source: "operations" as const,
      insights: [
        "Saídas costumam exigir checagem de compliance e handoff.",
        "Vale confirmar documentos e ownership das ultimas etapas.",
        "O fluxo completo esta na area de offboarding."
      ]
    })),
    ...data.events.slice(0, 2).map((event) => ({
      id: `event-${event.id}`,
      title: event.title,
      subtitle: event.relatedEmployee?.fullName ?? "Sem colaborador",
      meta: formatEventDate(event.startsAt),
      value: "agenda",
      tone: "stable" as const,
      href: "/people/calendar" as Route,
      source: "operations" as const,
      insights: [
        "Evento próximo que ajuda a orientar a cadencia do dia.",
        "Agendas e marcos de people ops influenciam a fila operacional.",
        "Abrir o calendario mostra o contexto completo do evento."
      ]
    }))
  ].slice(0, 5);

  return { priorityItems, hiringItems, operationsItems };
}

export function HarpiaLayout({
  data,
  viewer
}: {
  data: DashboardData;
  viewer: DashboardViewer;
}) {
  const navItems = useMemo(
    () => sidebarItems.filter((item) => !item.permission || hasPermission(viewer.role, item.permission)),
    [viewer.role]
  );

  const { priorityItems, hiringItems, operationsItems } = useMemo(() => buildFocusItems(data), [data]);
  const allFocusItems = [...priorityItems, ...hiringItems, ...operationsItems];
  const [selectedItemId, setSelectedItemId] = useState<string | null>(priorityItems[0]?.id ?? hiringItems[0]?.id ?? null);

  const selectedItem = allFocusItems.find((item) => item.id === selectedItemId) ?? null;

  const metricCards = [
    {
      label: "Employees",
      value: data.metrics.employees,
      hint: `${data.metrics.onboardingActive} onboarding ativos`
    },
    {
      label: "Requests",
      value: data.metrics.openRequests,
      hint: `${data.metrics.requestsAtRisk} fluxos em risco`
    },
    {
      label: "Candidates",
      value: data.hiring.applicationCount,
      hint: `${data.hiring.jobCount} vagas em operação`
    },
    {
      label: "Today",
      value: data.metrics.eventsToday,
      hint: `${data.metrics.overdueTasks} pendencias vencidas`
    }
  ];

  const topbarPills = [
    viewer.organizationName,
    `${data.hiring.jobCount} vagas`,
    `${data.hiring.applicationCount} candidatos`,
    `${data.metrics.pendingCompliance} pendencias`
  ];

  function handleReset() {
    setSelectedItemId(null);
  }

  function handleSelectItem(item: DashboardFocusItem) {
    setSelectedItemId(item.id);
  }

  return (
    <div className={styles.layout}>
      <HarpiaSidebar items={navItems} activeHref={"/dashboard" as Route} onReset={handleReset} />

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarTitle}>
            <span className={styles.eyebrow}>Overview</span>
            <h1 className={styles.title}>Workspace</h1>
            <p className={styles.subtitle}>Uma leitura direta da operação, sem excesso visual e sem elementos desnecessarios.</p>
          </div>

          <div className={styles.topbarMeta}>
            {topbarPills.map((item) => (
              <span key={item} className={styles.metaPill}>
                <span className={styles.metaDot} aria-hidden="true" />
                {item}
              </span>
            ))}
            <div className={styles.topbarControls}>
              <ThemeToggle className={styles.themeDock} />
              <Button asChild variant="outline" size="sm" className={styles.pdfButton}>
                <Link href={brandPaths.executiveDeck}>PDF executivo</Link>
              </Button>
            </div>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.primaryColumn}>
            <div className={styles.metricsGrid}>
              {metricCards.map((card) => (
                <HarpiaSurface key={card.label} className={styles.metricCard}>
                  <span className={styles.metricLabel}>{card.label}</span>
                  <div className={styles.metricValue}>{card.value}</div>
                  <p className={styles.metricHint}>{card.hint}</p>
                </HarpiaSurface>
              ))}
            </div>

            <HarpiaOverviewBoard
              priorityItems={priorityItems}
              hiringItems={hiringItems}
              operationsItems={operationsItems}
              selectedItemId={selectedItemId}
              onSelectItem={handleSelectItem}
            />

            <HarpiaModuleDeck data={data} />
          </div>

          <aside className={styles.secondaryColumn}>
            <HarpiaContextPanel item={selectedItem} topSignals={hiringItems} urgentSignals={priorityItems} />
          </aside>
        </div>
      </main>
    </div>
  );
}
