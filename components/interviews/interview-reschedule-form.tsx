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
  compact?: boolean;
};

export function InterviewRescheduleForm({
  action,
  defaultValues,
  compact = false
}: InterviewRescheduleFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className={compact ? "grid gap-3" : "grid gap-4"}>
      <input type="hidden" name="status" value="SCHEDULED" />

      <div className="grid gap-2">
        {!compact ? <Label htmlFor="reschedule-title">Título</Label> : null}
        <Input id="reschedule-title" name="title" defaultValue={defaultValues.title} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          {!compact ? (
            <Label htmlFor="reschedule-startsAt">Início</Label>
          ) : (
            <span className="text-xs text-muted-foreground">Início</span>
          )}
          <Input id="reschedule-startsAt" name="startsAt" type="datetime-local" defaultValue={defaultValues.startsAt} />
        </div>
        <div className="grid gap-2">
          {!compact ? <Label htmlFor="reschedule-endsAt">Fim</Label> : <span className="text-xs text-muted-foreground">Fim</span>}
          <Input id="reschedule-endsAt" name="endsAt" type="datetime-local" defaultValue={defaultValues.endsAt} />
        </div>
      </div>

      {compact ? (
        <details className="rounded-[0.45rem] border border-border/80 bg-background px-3 py-3">
          <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
            Local, link, notas e aviso opcional
          </summary>
          <div className="mt-3 grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="reschedule-location">Local</Label>
              <Input id="reschedule-location" name="location" defaultValue={defaultValues.location ?? ""} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reschedule-meetingUrl">Link</Label>
              <Input
                id="reschedule-meetingUrl"
                name="meetingUrl"
                type="url"
                defaultValue={defaultValues.meetingUrl ?? ""}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reschedule-notes">Notas</Label>
              <Textarea
                id="reschedule-notes"
                name="notes"
                className="min-h-24"
                defaultValue={defaultValues.notes ?? ""}
              />
            </div>

            <label className="flex items-center gap-3 text-sm text-muted-foreground">
              <input type="checkbox" name="sendNotification" value="true" className="h-4 w-4 rounded border-border" />
              Enviar atualização por e-mail ao candidato
            </label>
          </div>
        </details>
      ) : (
        <>
          <div className="grid gap-2">
            <Label htmlFor="reschedule-location">Local</Label>
            <Input id="reschedule-location" name="location" defaultValue={defaultValues.location ?? ""} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reschedule-meetingUrl">Link</Label>
            <Input id="reschedule-meetingUrl" name="meetingUrl" type="url" defaultValue={defaultValues.meetingUrl ?? ""} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reschedule-notes">Notas</Label>
            <Textarea id="reschedule-notes" name="notes" className="min-h-24" defaultValue={defaultValues.notes ?? ""} />
          </div>

          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <input type="checkbox" name="sendNotification" value="true" className="h-4 w-4 rounded border-border" />
            Enviar atualização por e-mail ao candidato
          </label>
        </>
      )}

      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <CalendarRange className="mr-2 h-4 w-4" />
          {pending ? "Reagendando..." : "Salvar reagendamento"}
        </Button>
      </div>
    </form>
  );
}
