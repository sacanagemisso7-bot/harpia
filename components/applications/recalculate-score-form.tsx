"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

export type RecalculateScoreState = {
  error?: string;
  success?: string;
};

const initialState: RecalculateScoreState = {};

type RecalculateScoreFormProps = {
  action: (state: RecalculateScoreState, formData: FormData) => Promise<RecalculateScoreState>;
};

export function RecalculateScoreForm({ action }: RecalculateScoreFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="space-y-4">
      <Button type="submit" variant="secondary" disabled={pending} className="w-full">
        <RefreshCw className="mr-2 h-4 w-4" />
        {pending ? "Recalculando..." : "Recalcular score"}
      </Button>
      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
    </form>
  );
}
