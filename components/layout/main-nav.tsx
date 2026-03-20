"use client";

import Link from "next/link";
import type { Route } from "next";
import { BarChart3, BellRing, BookOpenText, BriefcaseBusiness, CalendarClock, ClipboardList, CreditCard, LayoutGrid, MessageSquareMore, Settings, ShieldCheck, Sparkles, TrendingUp, UserRoundSearch, UsersRound, WandSparkles } from "lucide-react";
import { usePathname } from "next/navigation";

import { hasPermission, type AppPermission } from "@/lib/auth/permission-matrix";
import { cn } from "@/lib/utils";

type NavigationItem =
  | {
      href: Route;
      label: string;
      icon: typeof LayoutGrid;
      requiredPermission?: AppPermission;
      roles?: string[];
      disabled?: false;
    }
  | {
      label: string;
      icon: typeof LayoutGrid;
      disabled: true;
    };

const navigation: NavigationItem[] = [
  { href: "/me/policies" as Route, label: "My Policies", icon: ShieldCheck, roles: ["EMPLOYEE"] },
  { href: "/dashboard" as Route, label: "Home", icon: LayoutGrid, requiredPermission: "view_people_command_center" },
  { href: "/people/command-center" as Route, label: "Command Center", icon: Sparkles, requiredPermission: "view_people_command_center" },
  { href: "/employees" as Route, label: "Employees", icon: UserRoundSearch, requiredPermission: "view_employees" },
  { href: "/requests" as Route, label: "Service Desk", icon: BellRing, requiredPermission: "view_hr_requests" },
  { href: "/people/tasks" as Route, label: "People Tasks", icon: ClipboardList, requiredPermission: "view_people_tasks" },
  { href: "/people/onboarding" as Route, label: "Onboarding", icon: UsersRound, requiredPermission: "view_people_command_center" },
  { href: "/people/offboarding" as Route, label: "Offboarding", icon: UsersRound, requiredPermission: "view_people_command_center" },
  { href: "/people/calendar" as Route, label: "Calendar", icon: CalendarClock, requiredPermission: "view_people_calendar" },
  { href: "/people/compliance" as Route, label: "Compliance", icon: ShieldCheck, requiredPermission: "view_compliance" },
  { href: "/knowledge" as Route, label: "Knowledge", icon: BookOpenText, requiredPermission: "manage_knowledge" },
  { href: "/chat" as Route, label: "Company Chat", icon: MessageSquareMore, requiredPermission: "view_chat" },
  { href: "/people/agent-approvals" as Route, label: "Agent Approvals", icon: WandSparkles, requiredPermission: "review_agent_approvals" },
  { href: "/hiring" as Route, label: "Hiring", icon: BriefcaseBusiness },
  { href: "/analytics" as Route, label: "Analytics", icon: BarChart3, requiredPermission: "view_analytics" },
  { href: "/settings/billing" as Route, label: "Billing", icon: CreditCard, requiredPermission: "manage_workspace" },
  { href: "/settings" as Route, label: "Settings", icon: Settings, requiredPermission: "manage_workspace" }
];

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
  const completeNavigation = canViewRevenueOps
    ? [...visibleNavigation, { href: "/ops/revenue" as Route, label: "Revenue Ops", icon: TrendingUp }]
    : visibleNavigation;

  return (
    <nav className="space-y-2">
      {completeNavigation.map((item) => {
        const Icon = item.icon;
        const isActive = !item.disabled
          ? item.href === "/settings"
            ? pathname === item.href
            : pathname.startsWith(item.href)
          : false;

        const content = (
          <>
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              {item.label}
            </span>
            {item.disabled ? <span className="text-[10px] uppercase tracking-[0.24em]">Soon</span> : null}
          </>
        );

        if (!item.disabled) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-[1.1rem] border px-4 py-3 text-sm font-medium transition duration-300",
                isActive
                  ? "border-primary/30 bg-primary text-primary-foreground shadow-[0_14px_34px_rgba(25,72,51,0.24)]"
                  : "border-transparent bg-white/20 text-muted-foreground hover:-translate-y-0.5 hover:border-white/70 hover:bg-white/70 hover:text-secondary-foreground"
              )}
            >
              {content}
            </Link>
          );
        }

        return (
          <div
            key={item.label}
            className={cn(
              "flex items-center justify-between rounded-[1.1rem] border border-transparent bg-white/20 px-4 py-3 text-sm font-medium transition",
              item.disabled && "cursor-not-allowed opacity-50",
              "text-muted-foreground"
            )}
          >
            {content}
          </div>
        );
      })}
    </nav>
  );
}
