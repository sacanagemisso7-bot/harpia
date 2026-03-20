"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Textarea } from "@/components/ui/textarea";

export type CompanyChatComposerState = {
  error?: string;
  success?: string;
  threadId?: string;
};

const initialState: CompanyChatComposerState = {};

type CompanyChatComposerProps = {
  action: (state: CompanyChatComposerState, formData: FormData) => Promise<CompanyChatComposerState>;
  threadId?: string;
};

export function CompanyChatComposer({ action, threadId }: CompanyChatComposerProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.threadId) {
      router.replace(`/chat?threadId=${state.threadId}`);
      router.refresh();
    }
  }, [router, state.threadId]);

  return (
    <form action={formAction} className="space-y-4">
      {threadId ? <input type="hidden" name="threadId" value={threadId} /> : null}
      <Textarea
        name="message"
        className="min-h-28"
        placeholder="Pergunte sobre colaboradores, solicitacoes internas, tarefas, onboarding, politicas, knowledge base ou peca ajuda para operar o dia a dia."
      />
      <FormMessage message={state.error} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border/70 bg-white px-3 py-2">Backlog do RH</span>
          <span className="rounded-full border border-border/70 bg-white px-3 py-2">Solicitacoes abertas</span>
          <span className="rounded-full border border-border/70 bg-white px-3 py-2">Pendencias de onboarding</span>
        </div>
        <Button type="submit" disabled={pending}>
          <Sparkles className="mr-2 h-4 w-4" />
          {pending ? "Pensando..." : "Enviar"}
        </Button>
      </div>
    </form>
  );
}
