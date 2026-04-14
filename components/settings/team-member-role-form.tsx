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
    <form action={formAction} className="grid gap-3 md:grid-cols-[minmax(0,220px)_auto] md:items-end">
      <div className="grid gap-2">
        <Select name="role" defaultValue={currentRole}>
          {allowedRoles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Salvando..." : "Atualizar papel"}
        </Button>
        <FormMessage message={state.error} />
        {state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
      </div>
    </form>
  );
}
