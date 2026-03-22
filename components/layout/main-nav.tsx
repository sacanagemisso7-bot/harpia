"use client";

import Link from "next/link";
import type { Route } from "next";
import { BarChart3, BellRing, BookOpenText, BriefcaseBusiness, CalendarClock, ClipboardList, CreditCard, LayoutGrid, Layers3, MessageSquareMore, Settings, ShieldCheck, TrendingUp, UserRoundSearch, UsersRound } from "lucide-react";
import { usePathname } from "next/navigation";

import { hasPermission, type AppPermission } from "@/lib/auth/permission-matrix";
import { cn } from "@/lib/utils";

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
  { href: "/me/policies" as Route, label: "My Policies", icon: ShieldCheck, section: "self", roles: ["EMPLOYEE"] },
  { href: "/dashboard" as Route, label: "Home", icon: LayoutGrid, section: "command", requiredPermission: "view_people_command_center" },
  { href: "/people/command-center" as Route, label: "Command Center", icon: Layers3, section: "command", requiredPermission: "view_people_command_center" },
  { href: "/chat" as Route, label: "Company Chat", icon: MessageSquareMore, section: "command", requiredPermission: "view_chat" },
  { href: "/employees" as Route, label: "Employees", icon: UserRoundSearch, section: "people", requiredPermission: "view_employees" },
  { href: "/requests" as Route, label: "Service Desk", icon: BellRing, section: "people", requiredPermission: "view_hr_requests" },
  { href: "/people/tasks" as Route, label: "People Tasks", icon: ClipboardList, section: "people", requiredPermission: "view_people_tasks" },
  { href: "/people/onboarding" as Route, label: "Onboarding", icon: UsersRound, section: "people", requiredPermission: "view_people_command_center" },
  { href: "/people/offboarding" as Route, label: "Offboarding", icon: UsersRound, section: "people", requiredPermission: "view_people_command_center" },
  { href: "/people/calendar" as Route, label: "Calendar", icon: CalendarClock, section: "people", requiredPermission: "view_people_calendar" },
  { href: "/people/compliance" as Route, label: "Compliance", icon: ShieldCheck, section: "people", requiredPermission: "view_compliance" },
  { href: "/knowledge" as Route, label: "Knowledge", icon: BookOpenText, section: "people", requiredPermission: "manage_knowledge" },
  { href: "/people/agent-approvals" as Route, label: "Agent Approvals", icon: ShieldCheck, section: "people", requiredPermission: "review_agent_approvals" },
  { href: "/hiring" as Route, label: "Hiring", icon: BriefcaseBusiness, section: "admin" },
  { href: "/analytics" as Route, label: "Analytics", icon: BarChart3, section: "admin", requiredPermission: "view_analytics" },
  { href: "/settings/billing" as Route, label: "Billing", icon: CreditCard, section: "admin", requiredPermission: "manage_workspace" },
  { href: "/settings" as Route, label: "Settings", icon: Settings, section: "admin", requiredPermission: "manage_workspace" }
];

const navigationSections = [
  { id: "self", label: "Personal" },
  { id: "command", label: "Command" },
  { id: "people", label: "People Ops" },
  { id: "admin", label: "Admin" }
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
  const revenueOpsItem: NavigationItem = { href: "/ops/revenue" as Route, label: "Revenue Ops", icon: TrendingUp, section: "admin" };
  const completeNavigation: NavigationItem[] = canViewRevenueOps ? [...visibleNavigation, revenueOpsItem] : visibleNavigation;
  const groupedNavigation = navigationSections
    .map((section) => ({
      ...section,
      items: completeNavigation.filter((item) => item.section === section.id)
    }))
    .filter((section) => section.items.length > 0);

  return (
    <nav className="space-y-5">
      {groupedNavigation.map((section) => (
        <div key={section.id} className="space-y-2.5">
          <p className="nav-section-label">{section.label}</p>
          <div className="space-y-2">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = !item.disabled
                ? item.href === "/settings"
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
                : false;

              const content = (
                <>
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="nav-item-icon">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="truncate text-[0.94rem]">{item.label}</span>
                  </span>
                  {item.disabled ? <span className="nav-section-label tracking-[0.2em]">Soon</span> : null}
                </>
              );

              if (!item.disabled) {
                return (
                  <Link key={item.href} href={item.href} className={cn("nav-item-shell", isActive && "nav-item-active")}>
                    {content}
                  </Link>
                );
              }

              return (
                <div key={item.label} className="nav-item-shell cursor-not-allowed opacity-55">
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
