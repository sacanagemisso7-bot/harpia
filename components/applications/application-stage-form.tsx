"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Label } from "@/components/ui/label";

export type StageTransitionState = {
  error?: string;
  success?: string;
};

const initialState: StageTransitionState = {};

type ApplicationStageFormProps = {
  stages: Array<{
    id: string;
    name: string;
  }>;
  currentStageId?: string | null;
  action: (state: StageTransitionState, formData: FormData) => Promise<StageTransitionState>;
  compact?: boolean;
};

export function ApplicationStageForm({
  stages,
  currentStageId,
  action,
  compact = false
}: ApplicationStageFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className={compact ? "space-y-2" : "space-y-4"}>
      <div className="space-y-2">
        {!compact ? <Label htmlFor="stageId">Mover etapa</Label> : null}
        <select
          id="stageId"
          name="stageId"
          defaultValue={currentStageId ?? ""}
          className="flex h-10 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
      </div>
      <FormMessage message={state.error} />
      {!compact && state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
      <Button type="submit" variant={compact ? "outline" : "default"} size={compact ? "sm" : "default"} disabled={pending}>
        {pending ? "Movendo..." : "Atualizar etapa"}
      </Button>
    </form>
  );
}
