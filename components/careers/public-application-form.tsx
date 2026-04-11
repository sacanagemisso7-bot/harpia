"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type PublicApplyState = {
  error?: string;
  success?: string;
};

const initialState: PublicApplyState = {};

type PublicApplicationFormProps = {
  action: (state: PublicApplyState, formData: FormData) => Promise<PublicApplyState>;
};

export function PublicApplicationForm({ action }: PublicApplicationFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="fullName">Nome completo</Label>
          <Input id="fullName" name="fullName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" name="phone" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentTitle">Cargo atual</Label>
          <Input id="currentTitle" name="currentTitle" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentCompany">Empresa atual</Label>
          <Input id="currentCompany" name="currentCompany" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="linkedinUrl">LinkedIn</Label>
          <Input id="linkedinUrl" name="linkedinUrl" type="url" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Localização</Label>
          <Input id="location" name="location" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="summary">Resumo profissional</Label>
          <Textarea id="summary" name="summary" className="min-h-32" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="resume">Currículo em PDF</Label>
          <Input id="resume" name="resume" type="file" accept="application/pdf" />
        </div>
      </div>
      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Enviando candidatura..." : "Enviar candidatura"}
      </Button>
    </form>
  );
}
