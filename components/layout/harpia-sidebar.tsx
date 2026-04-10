import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import styles from "@/components/layout/harpia-shell.module.css";

type HarpiaSidebarProps = {
  className?: string;
  rail?: ReactNode;
  brand: ReactNode;
  intro?: ReactNode;
  navigation: ReactNode;
  workspace?: ReactNode;
  userCard?: ReactNode;
  footer?: ReactNode;
};

export function HarpiaSidebar({ className, rail, brand, intro, navigation, workspace, userCard, footer }: HarpiaSidebarProps) {
  return (
    <aside className={cn("sticky top-4 grid h-[calc(100vh-2rem)] text-foreground", styles.sidebar, className)}>
      <div className={cn("scene-rail", styles.rail)}>
        <div className={styles.railGlow} />
        <div className={styles.railDust} />
        {rail}
      </div>

      <div className={cn("scene-shell", styles.deck)}>
        <div className={styles.sidebarGlow} />
        <div className={styles.sidebarDust} />

        <div className={styles.brandStage}>
          <div className={styles.brandLink}>{brand}</div>
          {intro ? <div className={styles.introSlot}>{intro}</div> : null}
        </div>

        <div className={cn("min-h-0 flex-1 overflow-y-auto pr-1", styles.navViewport)}>{navigation}</div>

        <div className={styles.bottomStack}>
          {workspace}
          {userCard}
          {footer}
        </div>
      </div>
    </aside>
  );
}
