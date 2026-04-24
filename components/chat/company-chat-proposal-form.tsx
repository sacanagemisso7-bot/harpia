"use client";

import { useActionState } from "react";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

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

const riskLabels = {
  CRITICAL: "cr\u00edtico",
  HIGH: "alto",
  LOW: "baixo",
  MEDIUM: "m\u00e9dio"
} satisfies Record<NonNullable<CompanyChatActionProposal["riskLevel"]>, string>;

export function CompanyChatProposalForm({ action, threadId, proposal }: CompanyChatProposalFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const affectedRecords = Array.isArray(proposal.payload.applicationIds)
    ? proposal.payload.applicationIds.length
    : proposal.payload.requestId || proposal.payload.taskId || proposal.payload.employeeId || proposal.payload.applicationId
      ? 1
      : 0;
  const riskLabel = proposal.riskLevel ? riskLabels[proposal.riskLevel] : "baixo";

  return (
    <form action={formAction} className="grid gap-3 border border-border/65 bg-background/90 px-3.5 py-3.5">
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="actionType" value={proposal.type} />
      <input type="hidden" name="payload" value={JSON.stringify(proposal.payload)} />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center border border-border/70 bg-secondary/50 text-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <p className="text-sm font-semibold text-foreground">{proposal.label}</p>
          {proposal.riskLevel ? <Badge variant="outline">{proposal.riskLevel}</Badge> : null}
          {proposal.requiresApproval ? <Badge variant="outline">{"Requer aprova\u00e7\u00e3o"}</Badge> : null}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{proposal.description}</p>
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
        <span className="border border-border/60 bg-secondary/35 px-2 py-2">
          <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5" />
          {`Risco ${riskLabel}`}
        </span>
        <span className="border border-border/60 bg-secondary/35 px-2 py-2">
          {affectedRecords ? `${affectedRecords} registro(s) afetado(s)` : "Sem altera\u00e7\u00e3o direta ainda"}
        </span>
        <span className="border border-border/60 bg-secondary/35 px-2 py-2">
          {proposal.requiresApproval ? "Passa por aprova\u00e7\u00e3o" : "Executa com auditoria"}
        </span>
      </div>

      <FormMessage message={state.error} />
      {state.success ? (
        <p className="inline-flex items-center gap-2 text-sm text-emerald-700" aria-live="polite">
          <CheckCircle2 className="h-4 w-4" />
          {state.success}
        </p>
      ) : null}

      <Button type="submit" variant="secondary" disabled={pending} className="w-fit">
        {pending ? "Aplicando..." : proposal.requiresApproval ? "Enviar para aprova\u00e7\u00e3o" : "Confirmar a\u00e7\u00e3o"}
      </Button>
    </form>
  );
}
