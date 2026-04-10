"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export type ApplyToJobState = {
  error?: string;
  success?: string;
};

const initialState: ApplyToJobState = {};

type ApplyToJobFormProps = {
  jobs: Array<{
    id: string;
    title: string;
    location: string;
  }>;
  action: (state: ApplyToJobState, formData: FormData) => Promise<ApplyToJobState>;
};

export function ApplyToJobForm({ jobs, action }: ApplyToJobFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="workspace-form">
      <div className="space-y-2">
        <Label htmlFor="jobId">Selecionar vaga</Label>
        <Select id="jobId" name="jobId" defaultValue="">
          <option value="" disabled>
            Escolha uma vaga aberta
          </option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title} - {job.location}
            </option>
          ))}
        </Select>
      </div>
      <FormMessage message={state.error} />
      {state.success ? <p className="workspace-form-success">{state.success}</p> : null}
      <div className="workspace-form-actions">
        <Button type="submit" disabled={pending || jobs.length === 0} className="w-full">
          <BriefcaseBusiness className="mr-2 h-4 w-4" />
          {pending ? "Criando aplicacao..." : "Vincular a uma vaga"}
        </Button>
      </div>
    </form>
  );
}
