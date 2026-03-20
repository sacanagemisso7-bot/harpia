"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AcceptInviteState = {
  error?: string;
};

const initialState: AcceptInviteState = {};

type AcceptInviteFormProps = {
  email: string;
  organizationName: string;
  action: (state: AcceptInviteState, formData: FormData) => Promise<AcceptInviteState>;
};

export function AcceptInviteForm({ email, organizationName, action }: AcceptInviteFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-4 text-sm text-muted-foreground">
        Convite para <span className="font-medium text-foreground">{organizationName}</span> com o email{" "}
        <span className="font-medium text-foreground">{email}</span>.
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nome completo</Label>
        <Input id="name" name="name" placeholder="Seu nome" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Crie sua senha</Label>
        <Input id="password" name="password" type="password" placeholder="Minimo de 8 caracteres" required />
      </div>
      <FormMessage message={state.error} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Ativando acesso..." : "Aceitar convite e entrar"}
      </Button>
    </form>
  );
}
