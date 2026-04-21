"use client";

import type { ReactNode } from "react";

import styles from "@/components/operations/ops-workspace.module.css";

type AiNextStepCardProps = {
  recommendedStep: string;
  reason: string;
  children: ReactNode;
  tone?: "default" | "attention" | "positive";
};

export function AiNextStepCard({ recommendedStep, reason, children, tone = "default" }: AiNextStepCardProps) {
  const toneClass =
    tone === "attention" ? styles.aiNextStepAttention : tone === "positive" ? styles.aiNextStepPositive : "";

  return (
    <aside className={`${styles.aiNextStepCard} ${toneClass}`}>
      <div className={styles.aiNextStepHeader}>
        <span>IA contextual</span>
        <span className={styles.aiNextStepSignal} aria-hidden="true" />
      </div>

      <div className={styles.aiNextStepBody}>
        <div>
          <span className={styles.aiNextStepLabel}>Próximo passo recomendado</span>
          <strong>{recommendedStep}</strong>
        </div>

        <div>
          <span className={styles.aiNextStepLabel}>Por que isso importa</span>
          <p>{reason}</p>
        </div>
      </div>

      <div className={styles.aiNextStepFooter}>
        <span className={styles.aiNextStepLabel}>Ação rápida</span>
        <div className={styles.aiNextStepActions}>{children}</div>
      </div>
    </aside>
  );
}
