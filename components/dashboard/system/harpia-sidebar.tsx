import Link from "next/link";
import type { Route } from "next";
import {
  Bell,
  BriefcaseBusiness,
  LayoutGrid,
  MessageSquareMore,
  RefreshCcw,
  Settings,
  UserRoundSearch
} from "lucide-react";

import { HarpiaMark } from "@/components/brand/harpia-logo";

import type { HarpiaSidebarItem } from "./dashboard-model";
import styles from "./harpia-dashboard-system.module.css";

function joinClasses(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function HarpiaGlyph({ type }: { type: HarpiaSidebarItem["icon"] }) {
  const common = styles.navIcon;

  switch (type) {
    case "home":
      return <LayoutGrid className={common} />;
    case "chat":
      return <MessageSquareMore className={common} />;
    case "people":
      return <UserRoundSearch className={common} />;
    case "desk":
      return <Bell className={common} />;
    case "jobs":
      return <BriefcaseBusiness className={common} />;
    case "settings":
      return <Settings className={common} />;
    default:
      return <LayoutGrid className={common} />;
  }
}

export function HarpiaSidebar({
  items,
  activeHref,
  onReset
}: {
  items: HarpiaSidebarItem[];
  activeHref: Route;
  onReset: () => void;
}) {
  return (
    <aside className={styles.sidebar} aria-label="Primary navigation">
      <Link href={"/dashboard" as Route} className={styles.brandBlock} aria-label="Harpia dashboard">
        <span className={styles.brandMark}>
          <HarpiaMark className={styles.brandSvg} alt="Harpia" />
        </span>

        <span className={styles.brandText}>
          <strong className={styles.brandTitle}>Harpia</strong>
          <span className={styles.brandMeta}>Decision system</span>
        </span>
      </Link>

      <div className={styles.sidebarGroup}>
        <span className={styles.sidebarLabel}>Workspace</span>

        {items.map((item) => {
          const isActive = item.href === activeHref;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={joinClasses(styles.navLink, isActive && styles.navLinkActive)}
              aria-current={isActive ? "page" : undefined}
            >
              <HarpiaGlyph type={item.icon} />
              <span className={styles.navText}>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <button type="button" className={styles.navAction} onClick={onReset}>
        <RefreshCcw className={styles.navIcon} />
        <span className={styles.navText}>Limpar foco</span>
      </button>
    </aside>
  );
}
