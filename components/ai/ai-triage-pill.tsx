import { Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AiTriageSignal } from "@/lib/ai/triage";

import styles from "@/components/operations/ops-workspace.module.css";

type AiTriagePillProps = {
  signal: AiTriageSignal;
  compact?: boolean;
};

const levelLabel: Record<AiTriageSignal["urgency"], string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica"
};

export function AiTriagePill({ signal, compact = false }: AiTriagePillProps) {
  return (
    <div className={cn(styles.aiTriage, compact && styles.aiTriageCompact)} data-risk={signal.risk}>
      <span className={styles.aiTriageIcon} aria-hidden="true">
        <Zap className="h-3.5 w-3.5" />
      </span>
      <span className={styles.aiTriageText}>
        <strong>{signal.nextAction}</strong>
        {!compact ? <span>{signal.ownerArea}</span> : null}
      </span>
      <Badge variant={signal.risk === "critical" ? "destructive" : signal.risk === "high" ? "warning" : "outline"}>
        {levelLabel[signal.urgency]}
      </Badge>
    </div>
  );
}
