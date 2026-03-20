"use client";

import { useActionState, useEffect } from "react";
import { ArrowRight, CalendarRange } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type DemoRequestFormState = {
  error?: string;
  success?: string;
};

const initialState: DemoRequestFormState = {};

type DemoRequestFormProps = {
  action: (state: DemoRequestFormState, formData: FormData) => Promise<DemoRequestFormState>;
  sourcePage: string;
  compact?: boolean;
};

export function DemoRequestForm({ action, sourcePage, compact = false }: DemoRequestFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      const form = document.getElementById(`demo-request-${sourcePage}`) as HTMLFormElement | null;
      form?.reset();
    }
  }, [sourcePage, state.success]);

  return (
    <form id={`demo-request-${sourcePage}`} action={formAction} className="space-y-4">
      <input type="hidden" name="sourcePage" value={sourcePage} />
      <div className={`grid gap-4 ${compact ? "" : "md:grid-cols-2"}`}>
        <div className="space-y-2">
          <Label htmlFor={`${sourcePage}-name`}>Nome</Label>
          <Input id={`${sourcePage}-name`} name="name" placeholder="Seu nome" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${sourcePage}-email`}>Email</Label>
          <Input id={`${sourcePage}-email`} name="email" type="email" placeholder="voce@empresa.com" />
        </div>
      </div>
      <div className={`grid gap-4 ${compact ? "" : "md:grid-cols-2"}`}>
        <div className="space-y-2">
          <Label htmlFor={`${sourcePage}-company`}>Empresa</Label>
          <Input id={`${sourcePage}-company`} name="company" placeholder="Nome da empresa" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${sourcePage}-role`}>Cargo</Label>
          <Input id={`${sourcePage}-role`} name="role" placeholder="Head de RH, Founder, Recruiter..." />
        </div>
      </div>
      <div className={`grid gap-4 ${compact ? "" : "md:grid-cols-2"}`}>
        <div className="space-y-2">
          <Label htmlFor={`${sourcePage}-teamSize`}>Tamanho do time</Label>
          <Input id={`${sourcePage}-teamSize`} name="teamSize" placeholder="10-50, 50-200..." />
        </div>
        {compact ? null : (
          <div className="rounded-[1.35rem] border border-border/70 bg-white/70 p-4 text-sm text-muted-foreground">
            Diga rapidamente seu contexto e o time comercial consegue responder de forma bem mais objetiva.
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${sourcePage}-message`}>Contexto</Label>
        <Textarea
          id={`${sourcePage}-message`}
          name="message"
          className="min-h-28"
          placeholder="Quantas vagas voces abrem por mes, como fazem triagem hoje e o que mais incomoda no processo?"
        />
      </div>
      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
      <Button type="submit" size={compact ? "default" : "lg"} disabled={pending}>
        {compact ? <CalendarRange className="mr-2 h-4 w-4" /> : <ArrowRight className="mr-2 h-4 w-4" />}
        {pending ? "Enviando..." : "Agendar demo"}
      </Button>
    </form>
  );
}
