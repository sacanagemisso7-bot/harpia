"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  BookOpenText,
  BriefcaseBusiness,
  CalendarClock,
  ClipboardList,
  CreditCard,
  LayoutGrid,
  Layers3,
  LogOut,
  Menu,
  MessageSquareMore,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserRoundSearch,
  UsersRound,
  X,
  type LucideIcon
} from "lucide-react";

import { HarpiaLogo } from "@/components/brand/harpia-logo";
import { HarpiaCommandPalette, type HarpiaCommandItem } from "@/components/navigation/harpia-command-palette";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { hasPermission, type AppPermission } from "@/lib/auth/permission-matrix";
import { cn } from "@/lib/utils";

import styles from "./harpia-system-shell.module.css";

type ShellUser = {
  name?: string | null;
  email?: string | null;
  role: string;
  organizationId: string;
  organizationName: string;
  memberships: Array<{
    organizationId: string;
    organizationName: string;
    role: string;
    isDefault: boolean;
  }>;
};

type HarpiaSystemShellClientProps = {
  user: ShellUser;
  canViewRevenueOps: boolean;
  billingSignal: string[];
  showBillingSignal: boolean;
  children: ReactNode;
  switchOrganization: (formData: FormData) => Promise<void>;
  signOutAction: (formData: FormData) => Promise<void>;
};

type NavSection = "workspace" | "people" | "admin" | "self";

type NavItem = {
  id: string;
  href: Route;
  label: string;
  description: string;
  icon: LucideIcon;
  section: NavSection;
  requiredPermission?: AppPermission;
  roles?: string[];
};

const SIDEBAR_STORAGE_KEY = "harpia-sidebar-collapsed";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    label: "Início",
    description: "Resumo do dia",
    icon: LayoutGrid,
    section: "workspace",
    requiredPermission: "view_people_command_center"
  },
  {
    id: "command-center",
    href: "/people/command-center",
    label: "Central",
    description: "O que pede atenção",
    icon: Layers3,
    section: "workspace",
    requiredPermission: "view_people_command_center"
  },
  {
    id: "chat",
    href: "/chat",
    label: "Chat da empresa",
    description: "Pergunte e aja",
    icon: MessageSquareMore,
    section: "workspace",
    requiredPermission: "view_chat"
  },
  {
    id: "employees",
    href: "/employees",
    label: "Colaboradores",
    description: "Pessoas e perfis",
    icon: UserRoundSearch,
    section: "people",
    requiredPermission: "view_employees"
  },
  {
    id: "requests",
    href: "/requests",
    label: "Solicitações",
    description: "Pedidos internos",
    icon: Bell,
    section: "people",
    requiredPermission: "view_hr_requests"
  },
  {
    id: "tasks",
    href: "/people/tasks",
    label: "Tarefas",
    description: "Pendências claras",
    icon: ClipboardList,
    section: "people",
    requiredPermission: "view_people_tasks"
  },
  {
    id: "onboarding",
    href: "/people/onboarding",
    label: "Onboarding",
    description: "Entradas guiadas",
    icon: UsersRound,
    section: "people",
    requiredPermission: "view_people_command_center"
  },
  {
    id: "offboarding",
    href: "/people/offboarding",
    label: "Offboarding",
    description: "Saídas seguras",
    icon: UsersRound,
    section: "people",
    requiredPermission: "view_people_command_center"
  },
  {
    id: "calendar",
    href: "/people/calendar",
    label: "Calendário",
    description: "Prazos e eventos",
    icon: CalendarClock,
    section: "people",
    requiredPermission: "view_people_calendar"
  },
  {
    id: "compliance",
    href: "/people/compliance",
    label: "Compliance",
    description: "Políticas e riscos",
    icon: ShieldCheck,
    section: "people",
    requiredPermission: "view_compliance"
  },
  {
    id: "knowledge",
    href: "/knowledge",
    label: "Conhecimento",
    description: "Respostas internas",
    icon: BookOpenText,
    section: "people",
    requiredPermission: "manage_knowledge"
  },
  {
    id: "approvals",
    href: "/people/agent-approvals",
    label: "Aprovações",
    description: "Decisões seguras",
    icon: ShieldCheck,
    section: "people",
    requiredPermission: "review_agent_approvals"
  },
  {
    id: "hiring",
    href: "/hiring",
    label: "Contratação",
    description: "Vagas e pipeline",
    icon: BriefcaseBusiness,
    section: "admin"
  },
  {
    id: "analytics",
    href: "/analytics",
    label: "Análises",
    description: "Indicadores úteis",
    icon: Radar,
    section: "admin",
    requiredPermission: "view_analytics"
  },
  {
    id: "revenue",
    href: "/ops/revenue",
    label: "Receita",
    description: "Metas e receita",
    icon: TrendingUp,
    section: "admin"
  },
  {
    id: "billing",
    href: "/settings/billing",
    label: "Plano e uso",
    description: "Limites e faturas",
    icon: CreditCard,
    section: "admin",
    requiredPermission: "manage_workspace"
  },
  {
    id: "settings",
    href: "/settings",
    label: "Configurações",
    description: "Conta e módulos",
    icon: Settings,
    section: "admin",
    requiredPermission: "manage_workspace"
  },
  {
    id: "policies",
    href: "/me/policies",
    label: "Minhas políticas",
    description: "Leituras obrigatórias",
    icon: ShieldCheck,
    section: "self",
    roles: ["EMPLOYEE"]
  }
];

const sectionLabels: Record<NavSection, string> = {
  workspace: "Principal",
  people: "Pessoas",
  admin: "Admin",
  self: "Você"
};

const sectionOrder: NavSection[] = ["workspace", "people", "admin", "self"];

const compactHeaderMatchers = [
  (pathname: string) => pathname.startsWith("/chat"),
  (pathname: string) => pathname.startsWith("/employees"),
  (pathname: string) => pathname.startsWith("/requests"),
  (pathname: string) => pathname.startsWith("/people/tasks"),
  (pathname: string) => pathname.startsWith("/pipeline"),
  (pathname: string) => pathname.startsWith("/candidates"),
  (pathname: string) => pathname.startsWith("/jobs")
];

const routeMeta = [
  {
    match: (pathname: string) => pathname.startsWith("/chat"),
    title: "Chat da empresa",
    description: "Converse com contexto real e transforme resposta em ação."
  },
  {
    match: (pathname: string) => pathname.startsWith("/people/command-center"),
    title: "Central",
    description: "O que precisa de atenção agora, sem caçar em vários módulos."
  },
  {
    match: (pathname: string) => pathname.startsWith("/employees"),
    title: "Colaboradores",
    description: "Base, perfis, histórico e próximas ações do time."
  },
  {
    match: (pathname: string) => pathname.startsWith("/requests"),
    title: "Solicitações",
    description: "Pedidos internos com dono, prazo e próximo passo visíveis."
  },
  {
    match: (pathname: string) => pathname.startsWith("/hiring"),
    title: "Contratação",
    description: "Vagas, candidatos e decisões em um fluxo simples."
  },
  {
    match: (pathname: string) => pathname.startsWith("/analytics"),
    title: "Análises",
    description: "Indicadores para entender ritmo, gargalo e resultado."
  },
  {
    match: (pathname: string) => pathname.startsWith("/settings/billing"),
    title: "Plano e uso",
    description: "Plano atual, consumo e próximas mudanças."
  },
  {
    match: (pathname: string) => pathname.startsWith("/settings"),
    title: "Configurações",
    description: "Configurações centrais da operação."
  }
];

function matchesPath(pathname: string, href: Route) {
  if (href === "/settings") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function resolveRouteCopy(pathname: string, fallbackLabel: string) {
  const matched = routeMeta.find((entry) => entry.match(pathname));

  if (matched) {
    return matched;
  }

  return {
    title: fallbackLabel,
    description: "Tudo que você precisa para agir sem trocar de contexto."
  };
}

function accountName(user: ShellUser) {
  return user.name ?? user.email ?? "Operador";
}

function getRoleLabel(role: string) {
  return (
    {
      OWNER: "Owner",
      ADMIN: "Admin",
      PEOPLE_ADMIN: "People Admin",
      PEOPLE_OPS: "People Ops",
      MANAGER: "Manager",
      RECRUITER: "Recruiter",
      HIRING_MANAGER: "Hiring Manager",
      EMPLOYEE: "Colaborador"
    } satisfies Record<string, string>
  )[role] ?? role;
}

export function HarpiaSystemShellClient({
  user,
  canViewRevenueOps,
  billingSignal,
  showBillingSignal,
  children,
  switchOrganization,
  signOutAction
}: HarpiaSystemShellClientProps) {
  const pathname = usePathname();
  const isDashboardRoute = pathname === "/dashboard";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    try {
      setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1");
    } catch {
      // Ignore storage failures and keep default UI working.
    }
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? "1" : "0");
    } catch {
      // Ignore storage failures and keep interaction working.
    }
  }, [mounted, sidebarCollapsed]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "[") {
        event.preventDefault();
        setSidebarCollapsed((current) => !current);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  const visibleNav = navItems.filter((item) => {
    if (item.id === "revenue" && !canViewRevenueOps) {
      return false;
    }

    if (item.roles && !item.roles.includes(user.role)) {
      return false;
    }

    if (item.requiredPermission && !hasPermission(user.role, item.requiredPermission)) {
      return false;
    }

    return true;
  });

  const activeItem =
    visibleNav.find((item) => matchesPath(pathname, item.href)) ??
    visibleNav.find((item) => item.href === "/dashboard") ??
    visibleNav[0];

  const groupedNav = sectionOrder
    .map((section) => ({
      section,
      label: sectionLabels[section],
      items: visibleNav.filter((item) => item.section === section)
    }))
    .filter((group) => group.items.length > 0);

  const currentCopy = resolveRouteCopy(pathname, activeItem?.label ?? "Workspace");
  const currentRoleLabel = getRoleLabel(user.role);
  const isCompactHeaderRoute = compactHeaderMatchers.some((matcher) => matcher(pathname));
  const commandItems: HarpiaCommandItem[] = [
    ...(hasPermission(user.role, "view_hr_requests")
      ? [
          {
            id: "requests-risk",
            label: "Solicitações em risco",
            description: "Abrir a fila filtrada por SLA em risco.",
            href: "/requests?view=risk" as Route,
            section: "Atalhos",
            keywords: ["requests", "sla", "risk", "risco"]
          }
        ]
      : []),
    ...(hasPermission(user.role, "view_people_tasks")
      ? [
          {
            id: "tasks-overdue",
            label: "Tarefas vencidas",
            description: "Abrir tarefas com prazo vencido.",
            href: "/people/tasks?view=overdue" as Route,
            section: "Atalhos",
            keywords: ["tasks", "overdue", "vencidas", "atrasadas"]
          }
        ]
      : []),
    ...(hasPermission(user.role, "view_employees")
      ? [
          {
            id: "employees-managerless",
            label: "Colaboradores sem gestor",
            description: "Abrir a base filtrada por pessoas sem owner claro.",
            href: "/employees?view=managerless" as Route,
            section: "Atalhos",
            keywords: ["employees", "managerless", "gestor", "owner"]
          }
        ]
      : []),
    ...(hasPermission(user.role, "review_agent_approvals")
      ? [
          {
            id: "approvals-pending",
            label: "Aprovações pendentes",
            description: "Abrir a fila de revisão do agente.",
            href: "/people/agent-approvals" as Route,
            section: "Atalhos",
            keywords: ["approvals", "agent", "review", "pending"]
          }
        ]
      : []),
    ...visibleNav.map((item) => ({
      id: item.id,
      label: item.label,
      description: item.description,
      href: item.href,
      section: sectionLabels[item.section],
      keywords: [item.id, item.section]
    }))
  ];

  if (isDashboardRoute) {
    return <div className={styles.dashboardRoute}>{children}</div>;
  }

  return (
    <div className={cn(styles.shell, sidebarCollapsed && styles.shellCollapsed, mobileNavOpen && styles.shellMobileOpen)}>
      <button
        type="button"
        className={styles.mobileBackdrop}
        aria-label="Fechar navegação"
        onClick={() => setMobileNavOpen(false)}
      />

      <aside className={styles.sidebar}>
        <div className={styles.sidebarInner}>
          <div className={styles.sidebarHeader}>
            <Link href={"/dashboard" as Route} className={styles.brandCard} aria-label="Abrir dashboard da Harpia">
              <HarpiaLogo
                variant={sidebarCollapsed ? "icon" : "compact"}
                showTagline={!sidebarCollapsed}
                className={styles.brandLockup}
              />
            </Link>

            <button
              type="button"
              className={styles.sidebarToggle}
              onClick={() => setSidebarCollapsed((current) => !current)}
              aria-label={sidebarCollapsed ? "Expandir barra lateral" : "Ocultar barra lateral"}
              title={sidebarCollapsed ? "Expandir menu" : "Ocultar menu"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className={styles.sidebarToggleIcon} />
              ) : (
                <PanelLeftClose className={styles.sidebarToggleIcon} />
              )}
            </button>
          </div>

          {!sidebarCollapsed ? <p className={styles.sidebarHelper}>Ctrl + K busca qualquer coisa · [ recolhe o menu</p> : null}

          <nav className={styles.navGroups} aria-label="Navegação principal">
            {groupedNav.map((group) => (
              <div key={group.section} className={styles.navGroup}>
                <span className={styles.navGroupLabel}>{group.label}</span>

                <div className={styles.navList}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeItem?.id === item.id;

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={cn(styles.navLink, isActive && styles.navLinkActive)}
                        aria-current={isActive ? "page" : undefined}
                        aria-label={item.label}
                        data-tooltip={item.label}
                        data-section={group.label}
                        title={item.label}
                      >
                        <span className={styles.navIconWrap}>
                          <Icon className={styles.navIcon} />
                        </span>
                        <span className={styles.navCopy}>
                          <span className={styles.navLabel}>{item.label}</span>
                          <span className={styles.navDescription}>{item.description}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {sidebarCollapsed ? (
            <div className={styles.sidebarFooterCompact}>
              {user.memberships.length > 1 ? (
                <button
                  type="button"
                  className={styles.compactUtilityButton}
                  onClick={() => setSidebarCollapsed(false)}
                  title="Expandir menu para trocar de workspace"
                  aria-label="Expandir menu para trocar de workspace"
                >
                  <BriefcaseBusiness className={styles.signOutIcon} />
                </button>
              ) : null}

              <form action={signOutAction}>
                <button type="submit" className={styles.compactUtilityButton} title="Sair" aria-label="Sair">
                  <LogOut className={styles.signOutIcon} />
                </button>
              </form>
            </div>
          ) : (
            <div className={styles.sidebarFooter}>
              {user.memberships.length > 1 ? (
                <form action={switchOrganization} className={styles.workspaceCard}>
                  <span className={styles.workspaceLabel}>Workspace ativo</span>
                  <select name="organizationId" defaultValue={user.organizationId} className={styles.workspaceSelect}>
                    {user.memberships.map((membership) => (
                      <option key={membership.organizationId} value={membership.organizationId}>
                        {membership.organizationName}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className={styles.workspaceAction}>
                    Trocar
                  </button>
                </form>
              ) : (
                <div className={styles.workspaceCard}>
                  <span className={styles.workspaceLabel}>Workspace ativo</span>
                  <strong className={styles.workspaceTitle}>{user.organizationName}</strong>
                  <span className={styles.workspaceMeta}>{currentRoleLabel}</span>
                </div>
              )}

              <form action={signOutAction}>
                <button type="submit" className={styles.signOutButton}>
                  <LogOut className={styles.signOutIcon} />
                  Sair
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>

      <div className={styles.main}>
        <header className={cn(styles.topbar, isCompactHeaderRoute && styles.topbarCompact)}>
          <div className={styles.topbarIntro}>
            <span className={styles.topbarEyebrow}>{user.organizationName}</span>
            <h1 className={styles.topbarTitle}>{currentCopy.title}</h1>
            {!isCompactHeaderRoute ? <p className={styles.topbarSubtitle}>{currentCopy.description}</p> : null}
          </div>

          <div className={styles.topbarMeta}>
            {showBillingSignal ? (
              <div className={styles.topbarChips}>
                <Link href={"/settings/billing" as Route} className={styles.billingChip}>
                  {billingSignal.join(" • ")}
                </Link>
              </div>
            ) : null}

            <div className={styles.topbarControls}>
              <button
                type="button"
                className={styles.mobileMenuButton}
                onClick={() => setMobileNavOpen((current) => !current)}
                aria-label={mobileNavOpen ? "Fechar navegação" : "Abrir navegação"}
              >
                {mobileNavOpen ? <X className={styles.mobileMenuIcon} /> : <Menu className={styles.mobileMenuIcon} />}
                <span>{mobileNavOpen ? "Fechar" : "Menu"}</span>
              </button>

              <HarpiaCommandPalette
                items={commandItems}
                triggerClassName={styles.commandTrigger}
                triggerLabel="Buscar ou executar"
              />

              <ThemeToggle className={styles.themeControl} />

              <div className={styles.accountChip}>
                <strong>{accountName(user)}</strong>
                <span>{currentRoleLabel}</span>
              </div>
            </div>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
