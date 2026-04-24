"use client";

import { AgentRiskLevel } from "@prisma/client";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AutomationActionState } from "@/app/(app)/automations/actions";
import { createAutomationDraftAction, runWatchtowerNowAction } from "@/app/(app)/automations/actions";
import styles from "@/components/operations/ops-workspace.module.css";

const initialState: AutomationActionState = {};

export function WatchtowerRunForm() {
  const [state, formAction, isPending] = useActionState(runWatchtowerNowAction, initialState);

  return (
    <form action={formAction} className={styles.inlineForm}>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Analisando..." : "Rodar agora"}
      </Button>
      <p className={cn(styles.feedbackLine, state.error && styles.dangerText)}>
        {state.error ?? state.success ?? "Varre SLA, riscos, tarefas atrasadas e sinais de compliance."}
      </p>
    </form>
  );
}

export function AutomationDraftForm() {
  const [state, formAction, isPending] = useActionState(createAutomationDraftAction, initialState);

  return (
    <form action={formAction} className={styles.assistedCreateForm}>
      <div className={styles.formGrid}>
        <div className={styles.formFieldWide}>
          <Label htmlFor="automation-prompt">{"O que a IA deve observar?"}</Label>
          <Textarea
            id="automation-prompt"
            name="prompt"
            className={styles.textareaCompact}
            placeholder={
              "Ex.: quando uma solicita\u00e7\u00e3o de benef\u00edcios ficar sem resposta por 24h, sugerir dono, resposta e escalonamento."
            }
            required
          />
        </div>
        <div>
          <Label htmlFor="automation-trigger">Gatilho</Label>
          <Input id="automation-trigger" name="trigger" placeholder="SLA, request, tarefa..." />
        </div>
        <div>
          <Label htmlFor="automation-owner">{"Respons\u00e1vel"}</Label>
          <Input id="automation-owner" name="owner" placeholder="People Ops" />
        </div>
        <div>
          <Label htmlFor="automation-risk">Risco</Label>
          <Select id="automation-risk" name="riskLevel" defaultValue={AgentRiskLevel.MEDIUM}>
            <option value={AgentRiskLevel.LOW}>Baixo</option>
            <option value={AgentRiskLevel.MEDIUM}>{"M\u00e9dio"}</option>
            <option value={AgentRiskLevel.HIGH}>Alto</option>
            <option value={AgentRiskLevel.CRITICAL}>{"Cr\u00edtico"}</option>
          </Select>
        </div>
      </div>
      <div className={styles.formActions}>
        <p className={cn(styles.feedbackLine, state.error && styles.dangerText)}>
          {state.error ??
            state.success ??
            "A automa\u00e7\u00e3o nasce como rascunho. A execu\u00e7\u00e3o sens\u00edvel exige aprova\u00e7\u00e3o."}
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Estruturando..." : "Criar rascunho"}
        </Button>
      </div>
    </form>
  );
}
