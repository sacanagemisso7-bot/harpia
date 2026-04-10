"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

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
    <form action={formAction} className={compact ? "workspace-form gap-2" : "workspace-form"}>
      <div className="space-y-2">
        {!compact ? <Label htmlFor="stageId">Mover etapa</Label> : null}
        <Select id="stageId" name="stageId" defaultValue={currentStageId ?? ""} className={compact ? "h-10" : undefined}>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </Select>
      </div>
      <FormMessage message={state.error} />
      {!compact && state.success ? <p className="workspace-form-success">{state.success}</p> : null}
      <div className="workspace-form-actions">
        <Button type="submit" variant={compact ? "outline" : "default"} size={compact ? "sm" : "default"} disabled={pending}>
          {pending ? "Movendo..." : "Atualizar etapa"}
        </Button>
      </div>
    </form>
  );
}
