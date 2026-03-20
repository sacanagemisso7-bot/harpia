"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MailPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type TeamInviteState = {
  error?: string;
  success?: string;
};

const initialState: TeamInviteState = {};

type TeamInviteFormProps = {
  action: (state: TeamInviteState, formData: FormData) => Promise<TeamInviteState>;
  assignableRoles: Array<{
    value: string;
    label: string;
  }>;
};

export function TeamInviteForm({ action, assignableRoles }: TeamInviteFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" name="email" type="email" placeholder="recruiter@empresa.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">Papel</Label>
          <Select id="invite-role" name="role" defaultValue={assignableRoles[0]?.value}>
            {assignableRoles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-message">Mensagem opcional</Label>
        <Textarea
          id="invite-message"
          name="message"
          className="min-h-24"
          placeholder="Contextualize a pessoa sobre o workspace, a vaga ou a fase do produto."
        />
      </div>
      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>
        <MailPlus className="mr-2 h-4 w-4" />
        {pending ? "Enviando convite..." : "Convidar membro"}
      </Button>
    </form>
  );
}
