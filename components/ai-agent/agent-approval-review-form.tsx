"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Textarea } from "@/components/ui/textarea";

export type AgentApprovalReviewState = {
  error?: string;
  success?: string;
};

const initialState: AgentApprovalReviewState = {};

type AgentApprovalReviewFormProps = {
  action: (state: AgentApprovalReviewState, formData: FormData) => Promise<AgentApprovalReviewState>;
  approvalRequestId: string;
  compact?: boolean;
};

export function AgentApprovalReviewForm({
  action,
  approvalRequestId,
  compact = false
}: AgentApprovalReviewFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={`space-y-3 rounded-[1.1rem] border border-border/70 bg-white/80 p-4 ${compact ? "mt-3" : ""}`}>
      <input type="hidden" name="approvalRequestId" value={approvalRequestId} />
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground" htmlFor={`approval-notes-${approvalRequestId}`}>
          Observacoes
        </label>
        <Textarea
          id={`approval-notes-${approvalRequestId}`}
          name="notes"
          className={compact ? "min-h-20" : "min-h-28"}
          placeholder="Opcional: contexto, ressalvas ou motivo da decisao."
        />
      </div>
      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" name="decision" value="APPROVE" disabled={pending}>
          {pending ? "Processando..." : "Aprovar e executar"}
        </Button>
        <Button type="submit" name="decision" value="REJECT" variant="outline" disabled={pending}>
          {pending ? "Processando..." : "Rejeitar"}
        </Button>
      </div>
    </form>
  );
}
