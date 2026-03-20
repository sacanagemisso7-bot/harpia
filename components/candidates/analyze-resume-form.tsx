"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

export type AnalyzeResumeState = {
  error?: string;
  success?: string;
};

const initialState: AnalyzeResumeState = {};

type AnalyzeResumeFormProps = {
  action: (state: AnalyzeResumeState, formData: FormData) => Promise<AnalyzeResumeState>;
};

export function AnalyzeResumeForm({ action }: AnalyzeResumeFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="space-y-4">
      <Button type="submit" disabled={pending} className="w-full">
        <Sparkles className="mr-2 h-4 w-4" />
        {pending ? "Analisando..." : "Analisar curriculo com IA"}
      </Button>
      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
    </form>
  );
}
