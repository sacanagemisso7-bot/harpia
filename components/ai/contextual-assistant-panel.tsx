import Link from "next/link";
import type { Route } from "next";
import { BrainCircuit, FileText, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AiTriageSignal } from "@/lib/ai/triage";

import styles from "@/components/operations/ops-workspace.module.css";

type ContextualAssistantPanelProps = {
  title?: string;
  summary: string;
  signal: AiTriageSignal;
  itemLabel: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

function chatHref(prompt: string) {
  return `/chat?prompt=${encodeURIComponent(prompt)}`;
}

export function ContextualAssistantPanel({
  title = "Assistente contextual",
  summary,
  signal,
  itemLabel,
  primaryHref,
  primaryLabel = signal.nextAction,
  secondaryHref,
  secondaryLabel = "Automatizar com IA"
}: ContextualAssistantPanelProps) {
  return (
    <section className={styles.contextAssistant}>
      <div className={styles.contextAssistantHeader}>
        <span className={styles.contextAssistantIcon} aria-hidden="true">
          <BrainCircuit className="h-4 w-4" />
        </span>
        <div>
          <span className={styles.metaLabel}>{title}</span>
          <h4 className={styles.panelTitle}>{signal.nextAction}</h4>
        </div>
      </div>

      <p className={styles.detailText}>{summary}</p>

      <div className={styles.contextAssistantGrid}>
        <div>
          <span className={styles.metaLabel}>Por que importa</span>
          <p>{signal.reason}</p>
        </div>
        <div>
          <span className={styles.metaLabel}>Base útil</span>
          <p>{signal.knowledgeHint}</p>
        </div>
        <div>
          <span className={styles.metaLabel}>Pode resolver sozinho?</span>
          <p>{signal.canAutoResolve ? "Sim, com revisão quando houver risco." : "Não sem contexto humano."}</p>
        </div>
      </div>

      <div className={styles.contextAssistantActions}>
        {primaryHref ? (
          <Button asChild size="sm">
            <a href={primaryHref}>
              <WandSparkles className="mr-2 h-4 w-4" />
              {primaryLabel}
            </a>
          </Button>
        ) : null}
        <Button asChild size="sm" variant="outline">
          <Link href={(secondaryHref ?? chatHref(signal.automationPrompt)) as Route}>
            <WandSparkles className="mr-2 h-4 w-4" />
            {secondaryLabel}
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/knowledge?q=${encodeURIComponent(signal.knowledgeHint)}` as Route}>
            <FileText className="mr-2 h-4 w-4" />
            Ver política
          </Link>
        </Button>
      </div>

      <p className={styles.contextAssistantFootnote}>Contexto usado: status, SLA, dono, prioridade e histórico de {itemLabel}.</p>
    </section>
  );
}
