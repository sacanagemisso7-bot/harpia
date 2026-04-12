"use client";

import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import type { CompanyChatActionProposal } from "@/types/company-chat";

export type CompanyChatActionState = {
  error?: string;
  success?: string;
};

const initialState: CompanyChatActionState = {};

type CompanyChatProposalFormProps = {
  action: (state: CompanyChatActionState, formData: FormData) => Promise<CompanyChatActionState>;
  threadId: string;
  proposal: CompanyChatActionProposal;
};

export function CompanyChatProposalForm({ action, threadId, proposal }: CompanyChatProposalFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-[0.45rem] border border-border/80 bg-background px-3 py-3">
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="actionType" value={proposal.type} />
      <input type="hidden" name="payload" value={JSON.stringify(proposal.payload)} />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{proposal.label}</p>
          {proposal.riskLevel ? <Badge variant="outline">{proposal.riskLevel}</Badge> : null}
          {proposal.requiresApproval ? <Badge variant="outline">Requer aprovação</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">{proposal.description}</p>
      </div>

      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Aplicando..." : proposal.requiresApproval ? "Enviar para aprovação" : "Confirmar ação"}
      </Button>
    </form>
  );
}
