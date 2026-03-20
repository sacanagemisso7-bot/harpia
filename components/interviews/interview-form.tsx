"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type InterviewFormState = {
  error?: string;
  success?: string;
};

const initialState: InterviewFormState = {};

type InterviewFormProps = {
  action: (state: InterviewFormState, formData: FormData) => Promise<InterviewFormState>;
};

export function InterviewForm({ action }: InterviewFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="status" value="SCHEDULED" />
      <div className="space-y-2">
        <Label htmlFor="title">Titulo</Label>
        <Input id="title" name="title" placeholder="Ex.: Entrevista de triagem" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startsAt">Inicio</Label>
          <Input id="startsAt" name="startsAt" type="datetime-local" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endsAt">Fim</Label>
          <Input id="endsAt" name="endsAt" type="datetime-local" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Local</Label>
        <Input id="location" name="location" placeholder="Google Meet, presencial, telefone..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="meetingUrl">Link</Label>
        <Input id="meetingUrl" name="meetingUrl" type="url" placeholder="https://meet.google.com/..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" name="notes" className="min-h-24" />
      </div>
      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>
        <CalendarPlus2 className="mr-2 h-4 w-4" />
        {pending ? "Agendando..." : "Agendar entrevista"}
      </Button>
    </form>
  );
}
