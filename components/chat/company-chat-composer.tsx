"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";

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

  function submit(formData: FormData) {
    startTransition(async () => {
      const nextState = await action(initialState, formData);
      setState(nextState);
    });
  }

  return (
    <form
      className="space-y-3 rounded-[0.5rem] border border-border/90 bg-background px-3 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget));
      }}
    >
      {threadId ? <input type="hidden" name="threadId" value={threadId} /> : null}

      <Textarea
        name="message"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        className="min-h-[96px] resize-none border-0 bg-transparent px-0 py-0 text-[0.95rem] leading-7 shadow-none focus-visible:ring-0"
        placeholder="Envie uma mensagem..."
      />

      <FormMessage message={state.error} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-3">
        <p className="text-xs text-muted-foreground">Enter envia. Shift + Enter quebra a linha.</p>

        <Button type="submit" disabled={pending || !draft.trim()}>
          {pending ? "Respondendo..." : "Enviar"}
          {!pending ? <ArrowUp className="ml-2 h-4 w-4" /> : null}
        </Button>
      </div>
    </form>
  );
}
