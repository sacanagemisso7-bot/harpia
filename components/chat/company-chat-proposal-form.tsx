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
    <form action={formAction} className="rounded-[1.15rem] border border-border/70 bg-white/75 p-4">
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="actionType" value={proposal.type} />
      <input type="hidden" name="payload" value={JSON.stringify(proposal.payload)} />
      <div className="space-y-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{proposal.label}</p>
            {proposal.riskLevel ? <Badge variant="outline">{proposal.riskLevel}</Badge> : null}
            {proposal.requiresApproval ? <Badge variant="outline">Requer aprovacao</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{proposal.description}</p>
        </div>
        <FormMessage message={state.error} />
        {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Aplicando..." : "Confirmar acao"}
        </Button>
      </div>
    </form>
  );
}
