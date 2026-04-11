"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Textarea } from "@/components/ui/textarea";

export type CompanyChatComposerState = {
  error?: string;
  success?: string;
  threadId?: string;
  submissionId?: string;
};

const initialState: CompanyChatComposerState = {};

type CompanyChatComposerProps = {
  action: (state: CompanyChatComposerState, formData: FormData) => Promise<CompanyChatComposerState>;
  threadId?: string;
};

export function CompanyChatComposer({ action, threadId }: CompanyChatComposerProps) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!state.submissionId) {
      return;
    }

    if (state.threadId && state.threadId !== threadId) {
      router.replace(`/chat?threadId=${state.threadId}`);
    }

    router.refresh();
  }, [router, state.submissionId, state.threadId, threadId]);

  useEffect(() => {
    if (state.submissionId && state.success) {
      setDraft("");
    }
  }, [state.submissionId, state.success]);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const nextState = await action(initialState, formData);
      setState(nextState);
    });
  }

  return (
    <form
      className="chat-pane-shell space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit(new FormData(event.currentTarget));
      }}
    >
      {threadId ? <input type="hidden" name="threadId" value={threadId} /> : null}

      <div className="space-y-2 px-1">
        <p className="section-intro">Mensagem</p>
        <p className="text-sm text-muted-foreground">
          Pergunte como você perguntaria a alguém do time. O Harpia cuida do contexto e responde no mesmo fluxo.
        </p>
      </div>

      <Textarea
        name="message"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="min-h-[132px] border-transparent bg-transparent px-0 text-[0.98rem] leading-7 shadow-none hover:border-transparent focus-visible:ring-0"
        placeholder="Pergunte do jeito mais natural possível. Ex.: O que está travando o onboarding hoje?"
      />

      <FormMessage message={state.error} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="interactive-chip text-xs">People ops</span>
          <span className="interactive-chip text-xs">Hiring</span>
          <span className="interactive-chip text-xs">Compliance</span>
        </div>

        <Button type="submit" disabled={pending || !draft.trim()}>
          <Sparkles className="mr-2 h-4 w-4" />
          {pending ? "Pensando..." : "Enviar mensagem"}
          {!pending ? <ArrowUpRight className="ml-2 h-4 w-4" /> : null}
        </Button>
      </div>
    </form>
  );
}
