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
    <form action={formAction} className={`workspace-form workspace-form-section ${compact ? "mt-3 px-4 py-4" : ""}`}>
      <input type="hidden" name="approvalRequestId" value={approvalRequestId} />
      <div className="space-y-2">
        <p className="scene-label">Approval review</p>
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
      {state.success ? <p className="workspace-form-success">{state.success}</p> : null}
      <div className="workspace-form-actions">
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
