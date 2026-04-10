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
    <form action={formAction} className="chat-pane-shell space-y-4">
      {threadId ? <input type="hidden" name="threadId" value={threadId} /> : null}
      <div className="space-y-2 px-1">
        <p className="section-intro">Nova leitura</p>
        <p className="text-sm text-muted-foreground">Escreva uma pergunta, uma decisao ou uma acao que precisa sair do papel.</p>
      </div>
      <Textarea
        name="message"
        className="min-h-[160px] border-transparent bg-transparent shadow-none hover:border-transparent"
        placeholder="Pergunte sobre colaboradores, solicitacoes, tarefas, onboarding, politicas ou qualquer passo da operacao."
      />
      <FormMessage message={state.error} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="interactive-chip text-xs">Backlog do RH</span>
          <span className="interactive-chip text-xs">Solicitacoes abertas</span>
          <span className="interactive-chip text-xs">Pendencias de onboarding</span>
        </div>
        <Button type="submit" disabled={pending}>
          <Sparkles className="mr-2 h-4 w-4" />
          {pending ? "Pensando..." : "Enviar"}
        </Button>
      </div>
    </form>
  );
}
