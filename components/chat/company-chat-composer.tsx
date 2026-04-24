"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Textarea } from "@/components/ui/textarea";
import { COMPANY_CHAT_SUBMISSION_EVENT, type CompanyChatSubmissionEventDetail } from "@/components/chat/company-chat-events";

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
  initialDraft?: string;
};

export function CompanyChatComposer({ action, threadId, initialDraft = "" }: CompanyChatComposerProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [state, setState] = useState(initialState);
  const [draft, setDraft] = useState(initialDraft);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDraft((current) => current || initialDraft);
  }, [initialDraft]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [draft]);

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
    const message = String(formData.get("message") ?? "").trim();

    if (typeof window !== "undefined" && message) {
      window.dispatchEvent(
        new CustomEvent<CompanyChatSubmissionEventDetail>(COMPANY_CHAT_SUBMISSION_EVENT, {
          detail: {
            phase: "start",
            threadId: threadId ?? null,
            message
          }
        })
      );
    }

    startTransition(async () => {
      const nextState = await action(initialState, formData);
      setState(nextState);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent<CompanyChatSubmissionEventDetail>(COMPANY_CHAT_SUBMISSION_EVENT, {
            detail: {
              phase: "finish",
              threadId: nextState.threadId ?? threadId ?? null
            }
          })
        );
      }
    });
  }

  return (
    <form
      className="grid gap-3 border border-border/70 bg-background/95 px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget));
      }}
    >
      {threadId ? <input type="hidden" name="threadId" value={threadId} /> : null}

      <Textarea
        ref={textareaRef}
        name="message"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        className="min-h-[62px] max-h-[220px] resize-none border-0 bg-transparent px-0 py-0 text-[0.95rem] leading-7 shadow-none focus-visible:ring-0"
        placeholder={"Pergunte sobre pessoas, tarefas, pol\u00edticas ou decis\u00f5es do workspace..."}
      />

      <FormMessage message={state.error} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/55 pt-3">
        <p className="text-xs text-muted-foreground">
          {pending ? "Harpia est\u00e1 respondendo..." : "Enter envia \u00b7 Shift + Enter quebra a linha"}
        </p>

        <Button type="submit" disabled={pending || !draft.trim()} className="min-w-[8.5rem]">
          {pending ? "Respondendo..." : "Enviar"}
          {!pending ? <ArrowUp className="ml-2 h-4 w-4" /> : null}
        </Button>
      </div>
    </form>
  );
}
