"use client";

import Link from "next/link";
import type { Route } from "next";
import { BarChart3, BellRing, BookOpenText, BriefcaseBusiness, CalendarClock, ClipboardList, CreditCard, LayoutGrid, Layers3, MessageSquareMore, Settings, ShieldCheck, TrendingUp, UserRoundSearch, UsersRound } from "lucide-react";
import { usePathname } from "next/navigation";

import { hasPermission, type AppPermission } from "@/lib/auth/permission-matrix";
import { cn } from "@/lib/utils";
import styles from "@/components/layout/harpia-shell.module.css";

type NavigationItem =
  | {
      href: Route;
      label: string;
      icon: typeof LayoutGrid;
      section: "self" | "command" | "people" | "admin";
      requiredPermission?: AppPermission;
      roles?: string[];
      disabled?: false;
    }
  | {
      label: string;
      icon: typeof LayoutGrid;
      section: "self" | "command" | "people" | "admin";
      disabled: true;
    };

const navigation: NavigationItem[] = [
  { href: "/me/policies" as Route, label: "Minhas políticas", icon: ShieldCheck, section: "self", roles: ["EMPLOYEE"] },
  { href: "/dashboard" as Route, label: "Início", icon: LayoutGrid, section: "command", requiredPermission: "view_people_command_center" },
  { href: "/people/command-center" as Route, label: "Central", icon: Layers3, section: "command", requiredPermission: "view_people_command_center" },
  { href: "/chat" as Route, label: "Chat da empresa", icon: MessageSquareMore, section: "command", requiredPermission: "view_chat" },
  { href: "/employees" as Route, label: "Colaboradores", icon: UserRoundSearch, section: "people", requiredPermission: "view_employees" },
  { href: "/requests" as Route, label: "Solicitações", icon: BellRing, section: "people", requiredPermission: "view_hr_requests" },
  { href: "/people/tasks" as Route, label: "Tarefas", icon: ClipboardList, section: "people", requiredPermission: "view_people_tasks" },
  { href: "/people/onboarding" as Route, label: "Onboarding", icon: UsersRound, section: "people", requiredPermission: "view_people_command_center" },
  { href: "/people/offboarding" as Route, label: "Offboarding", icon: UsersRound, section: "people", requiredPermission: "view_people_command_center" },
  { href: "/people/calendar" as Route, label: "Calendário", icon: CalendarClock, section: "people", requiredPermission: "view_people_calendar" },
  { href: "/people/compliance" as Route, label: "Compliance", icon: ShieldCheck, section: "people", requiredPermission: "view_compliance" },
  { href: "/knowledge" as Route, label: "Conhecimento", icon: BookOpenText, section: "people", requiredPermission: "manage_knowledge" },
  { href: "/people/agent-approvals" as Route, label: "Aprovações", icon: ShieldCheck, section: "people", requiredPermission: "review_agent_approvals" },
  { href: "/hiring" as Route, label: "Contratação", icon: BriefcaseBusiness, section: "admin" },
  { href: "/analytics" as Route, label: "Análises", icon: BarChart3, section: "admin", requiredPermission: "view_analytics" },
  { href: "/settings/billing" as Route, label: "Plano e uso", icon: CreditCard, section: "admin", requiredPermission: "manage_workspace" },
  { href: "/settings" as Route, label: "Configurações", icon: Settings, section: "admin", requiredPermission: "manage_workspace" }
];

const navigationSections = [
  { id: "self", label: "Pessoal", code: "01" },
  { id: "command", label: "Central", code: "02" },
  { id: "people", label: "People Ops", code: "03" },
  { id: "admin", label: "Admin", code: "04" }
] as const;

type MainNavProps = {
  role: string;
  canViewRevenueOps?: boolean;
};

export function MainNav({ role, canViewRevenueOps = false }: MainNavProps) {
  const pathname = usePathname();
  const visibleNavigation = navigation.filter((item) =>
    item.disabled
      ? true
      : (!item.roles || item.roles.includes(role)) && (!item.requiredPermission || hasPermission(role, item.requiredPermission))
  );
  const revenueOpsItem: NavigationItem = { href: "/ops/revenue" as Route, label: "Receita", icon: TrendingUp, section: "admin" };
  const completeNavigation: NavigationItem[] = canViewRevenueOps ? [...visibleNavigation, revenueOpsItem] : visibleNavigation;
  const groupedNavigation = navigationSections
    .map((section) => ({
      ...section,
      items: completeNavigation.filter((item) => item.section === section.id)
    }))
    .filter((section) => section.items.length > 0);
  const activeItem =
    completeNavigation.find((item) => !item.disabled && (item.href === "/settings" ? pathname === item.href : pathname.startsWith(item.href))) ??
    completeNavigation[0];
  const activeSection = groupedNavigation.find((section) => section.id === activeItem?.section) ?? groupedNavigation[0];

  return (
    <nav className={styles.navRoot}>
      {activeItem && activeSection ? (
        <div className={styles.navCurrent}>
          <div className={styles.navCurrentGhost} aria-hidden="true">
            {activeSection.code}
          </div>
          <div className={styles.navCurrentEyebrow}>
            <span className={styles.navCurrentCode}>{activeSection.code}</span>
            <span className={styles.navCurrentState}>ativo</span>
          </div>
          <p className={styles.navCurrentTitle}>{activeItem.label}</p>
          <div className={styles.navCurrentMeta}>
            <span className={styles.navCurrentPill}>{activeSection.label}</span>
            <span className={styles.navCurrentPill}>{pathname === "/dashboard" ? "resumo" : "rota ativa"}</span>
          </div>
          <div className={styles.navCurrentTrail} />
        </div>
      ) : null}

      {groupedNavigation.map((section) => (
        <div key={section.id} className={styles.navGroup}>
          <div className={styles.navGroupHeader}>
            <span className={styles.navGroupCode}>{section.code}</span>
            <p className="nav-section-label">{section.label}</p>
            <div className={styles.navGroupLine} />
          </div>
          <div className={styles.navGroupItems}>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = !item.disabled
                ? item.href === "/settings"
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                : false;

              const content = (
                <>
                  <span className={styles.navLead}>
                    <span className="nav-item-icon">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className={styles.navLabel}>
                      <span className={styles.navLabelText}>{item.label}</span>
                      {!item.disabled ? <span className={styles.navLabelSub}>{section.label}</span> : null}
                    </span>
                  </span>
                  {item.disabled ? (
                    <span className="nav-section-label tracking-[0.2em]">Em breve</span>
                  ) : (
                    <span className={styles.navTrail}>{isActive ? "ativo" : "pronto"}</span>
                  )}
                </>
              );

              if (!item.disabled) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("nav-item-shell", styles.navItem, isActive && "nav-item-active", isActive && styles.navItemActive)}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div key={item.label} className={cn("nav-item-shell cursor-not-allowed opacity-55", styles.navItem)}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
