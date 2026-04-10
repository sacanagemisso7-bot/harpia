import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import styles from "@/components/layout/harpia-shell.module.css";

type HarpiaTopbarProps = {
  className?: string;
  eyebrow?: string;
  title: string;
  summary?: string;
  actions?: ReactNode;
  ghost?: string;
};

export function HarpiaTopbar({ className, eyebrow = "Workspace", title, summary, actions, ghost = "Harpia" }: HarpiaTopbarProps) {
  return (
    <div className={cn(styles.topbar, className)}>
      <div className={styles.topbarGlow} />
      <div className={styles.topbarGhost} aria-hidden="true">
        {ghost}
      </div>
      <div className={styles.topbarGrid}>
        <div className={styles.topbarMain}>
          <div className={styles.topbarEyebrow}>
            <p className="scene-label">{eyebrow}</p>
            <span className={styles.topbarStatus}>Operational surface</span>
          </div>
          <h1 className={styles.topbarTitle}>{title}</h1>
          {summary ? <p className={styles.topbarText}>{summary}</p> : null}
          <div className={styles.topbarTrail} aria-hidden="true">
            <span>observe</span>
            <span>filter</span>
            <span>decide</span>
          </div>
        </div>

        {actions ? <div className={styles.topbarDock}>{actions}</div> : null}
      </div>
    </div>
  );
}
