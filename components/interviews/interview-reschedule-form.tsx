"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type InterviewRescheduleState = {
  error?: string;
  success?: string;
};

const initialState: InterviewRescheduleState = {};

type InterviewRescheduleFormProps = {
  action: (state: InterviewRescheduleState, formData: FormData) => Promise<InterviewRescheduleState>;
  defaultValues: {
    title: string;
    startsAt: string;
    endsAt: string;
    location?: string | null;
    meetingUrl?: string | null;
    notes?: string | null;
  };
};

export function InterviewRescheduleForm({ action, defaultValues }: InterviewRescheduleFormProps) {
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
        <Label htmlFor="reschedule-title">Titulo</Label>
        <Input id="reschedule-title" name="title" defaultValue={defaultValues.title} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reschedule-startsAt">Inicio</Label>
          <Input id="reschedule-startsAt" name="startsAt" type="datetime-local" defaultValue={defaultValues.startsAt} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reschedule-endsAt">Fim</Label>
          <Input id="reschedule-endsAt" name="endsAt" type="datetime-local" defaultValue={defaultValues.endsAt} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reschedule-location">Local</Label>
        <Input id="reschedule-location" name="location" defaultValue={defaultValues.location ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reschedule-meetingUrl">Link</Label>
        <Input id="reschedule-meetingUrl" name="meetingUrl" type="url" defaultValue={defaultValues.meetingUrl ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reschedule-notes">Notas</Label>
        <Textarea id="reschedule-notes" name="notes" className="min-h-24" defaultValue={defaultValues.notes ?? ""} />
      </div>
      <label className="flex items-center gap-3 text-sm text-muted-foreground">
        <input type="checkbox" name="sendNotification" value="true" className="h-4 w-4 rounded border-border" />
        Enviar atualizacao por email ao candidato
      </label>
      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>
        <CalendarRange className="mr-2 h-4 w-4" />
        {pending ? "Reagendando..." : "Salvar reagendamento"}
      </Button>
    </form>
  );
}
