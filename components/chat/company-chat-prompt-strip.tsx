"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

import type { CompanyChatComposerState } from "./company-chat-composer";

const initialState: CompanyChatComposerState = {};

type CompanyChatPromptStripProps = {
  action: (state: CompanyChatComposerState, formData: FormData) => Promise<CompanyChatComposerState>;
  prompts: string[];
  threadId?: string;
  className?: string;
  buttonClassName?: string;
  iconClassName?: string;
};

export function CompanyChatPromptStrip({
  action,
  prompts,
  threadId,
  className,
  buttonClassName,
  iconClassName
}: CompanyChatPromptStripProps) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
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

  if (!prompts.length) {
    return null;
  }

  function submitPrompt(prompt: string) {
    const formData = new FormData();
    formData.set("message", prompt);

    if (threadId) {
      formData.set("threadId", threadId);
    }

    startTransition(async () => {
      const nextState = await action(initialState, formData);
      setState(nextState);
    });
  }

  return (
    <div className={className}>
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={pending}
          data-testid="company-chat-prompt"
          className={cn("interactive-chip text-xs text-muted-foreground", buttonClassName)}
          onClick={() => submitPrompt(prompt)}
        >
          <Sparkles className={cn("h-3.5 w-3.5", iconClassName)} />
          <span>{prompt}</span>
        </button>
      ))}
    </div>
  );
}
