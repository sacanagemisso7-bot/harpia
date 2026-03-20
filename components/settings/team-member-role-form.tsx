"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Select } from "@/components/ui/select";

export type TeamRoleState = {
  error?: string;
  success?: string;
};

const initialState: TeamRoleState = {};

type TeamMemberRoleFormProps = {
  currentRole: string;
  allowedRoles: Array<{
    value: string;
    label: string;
  }>;
  action: (state: TeamRoleState, formData: FormData) => Promise<TeamRoleState>;
};

export function TeamMemberRoleForm({ currentRole, allowedRoles, action }: TeamMemberRoleFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <Select name="role" defaultValue={currentRole} className="min-w-[180px]">
        {allowedRoles.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Salvando..." : "Atualizar papel"}
      </Button>
      <FormMessage message={state.error} />
      {state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
    </form>
  );
}
