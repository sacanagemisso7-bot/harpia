"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AiResolveActionState } from "@/types/ai-resolve";

import styles from "@/components/operations/ops-workspace.module.css";

const initialState: AiResolveActionState = {};

type AiResolvePanelProps = {
  entityId: string;
  entityFieldName: string;
  selectionFieldName?: string;
  label?: string;
  summary: string;
  suggestedAction: string;
  expectedImpact: string;
  confidence: "Alta" | "Média" | "Baixa";
  sources: string[];
  suggestedStatus: string;
  statusOptions: Array<{ value: string; label: string }>;
  draftNote: string;
  action: (state: AiResolveActionState, formData: FormData) => Promise<AiResolveActionState>;
};

export function AiResolvePanel({
  entityId,
  entityFieldName,
  selectionFieldName = "status",
  label = "Resolver com IA",
  summary,
  suggestedAction,
  expectedImpact,
  confidence,
  sources,
  suggestedStatus,
  statusOptions,
  draftNote,
  action
}: AiResolvePanelProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState(suggestedStatus);
  const [note, setNote] = useState(draftNote);

  useEffect(() => {
    setStatus(suggestedStatus);
  }, [suggestedStatus]);

  useEffect(() => {
    setNote(draftNote);
  }, [draftNote]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    router.refresh();

    if (state.mode === "apply") {
      setIsOpen(false);
      setIsEditing(false);
    }
  }, [router, state.mode, state.success]);

  const confidenceTone = useMemo(() => {
    if (confidence === "Alta") {
      return styles.aiResolveConfidenceHigh;
    }

    if (confidence === "Média") {
      return styles.aiResolveConfidenceMedium;
    }

    return styles.aiResolveConfidenceLow;
  }, [confidence]);

  return (
    <div className={styles.aiResolvePanel}>
      <div className={styles.aiResolveHeader}>
        <div className={styles.aiResolveLead}>
          <span className={styles.metaLabel}>Assistência operacional</span>
          <h4 className={styles.panelTitle}>Resolver com IA</h4>
        </div>
        <Button type="button" variant="outline" onClick={() => setIsOpen((current) => !current)}>
          <Sparkles className="mr-2 h-4 w-4" />
          {isOpen ? "Ocultar" : label}
        </Button>
      </div>

      {isOpen ? (
        <form action={formAction} className={styles.aiResolveBody}>
          <input type="hidden" name={entityFieldName} value={entityId} />
          <input type="hidden" name={selectionFieldName} value={status} />
          <input type="hidden" name="note" value={note} />

          <div className={styles.aiResolveSummary}>
            <p className={styles.detailText}>{summary}</p>
            <div className={styles.aiResolveMeta}>
              <div className={styles.aiResolveMetric}>
                <span className={styles.metaLabel}>Ação sugerida</span>
                <span className={styles.metaValue}>{suggestedAction}</span>
              </div>
              <div className={styles.aiResolveMetric}>
                <span className={styles.metaLabel}>Impacto esperado</span>
                <span className={styles.metaValue}>{expectedImpact}</span>
              </div>
              <div className={styles.aiResolveMetric}>
                <span className={styles.metaLabel}>Confiança</span>
                <span className={`${styles.aiResolveConfidence} ${confidenceTone}`}>{confidence}</span>
              </div>
            </div>
          </div>

          <div className={styles.aiResolveSources}>
            <span className={styles.metaLabel}>Fontes usadas</span>
            <ul className={styles.aiResolveSourceList}>
              {sources.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
          </div>

          <div className={styles.contextAssistantGrid}>
            <div>
              <span className={styles.metaLabel}>O que a IA viu</span>
              <p>{summary}</p>
            </div>
            <div>
              <span className={styles.metaLabel}>O que vai mudar</span>
              <p>{suggestedAction} com registro visível no histórico.</p>
            </div>
            <div>
              <span className={styles.metaLabel}>Controle</span>
              <p>Você pode editar, aplicar direto ou pedir aprovação antes de executar.</p>
            </div>
          </div>

          {isEditing ? (
            <div className={styles.aiResolveEditor}>
              <div className={styles.formGrid2}>
                <Select value={status} onChange={(event) => setStatus(event.target.value)} className={styles.selectCompact}>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <div className={styles.aiResolveHint}>Edite o destino antes de aplicar ou pedir aprovação.</div>
              </div>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className={styles.textareaCompact}
                placeholder="Ajuste o encaminhamento antes de aplicar."
              />
            </div>
          ) : (
            <div className={styles.aiResolveNotePreview}>
              <span className={styles.metaLabel}>Rascunho que será registrado</span>
              <p className={styles.detailText}>{note}</p>
            </div>
          )}

          <FormMessage message={state.error} />
          {state.success ? <p className={styles.aiResolveSuccess}>{state.success}</p> : null}

          <div className={styles.aiResolveActions}>
            <Button type="submit" name="mode" value="apply" disabled={pending}>
              {pending ? "Aplicando..." : "Aplicar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setIsEditing((current) => !current)}
            >
              {isEditing ? "Fechar edição" : "Editar antes"}
            </Button>
            <Button type="submit" name="mode" value="approval" variant="outline" disabled={pending}>
              {pending ? "Enviando..." : "Pedir aprovação"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
