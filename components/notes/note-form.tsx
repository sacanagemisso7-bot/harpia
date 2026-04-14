"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NotebookPen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type NoteFormState = {
  error?: string;
  success?: string;
};

const initialState: NoteFormState = {};

type NoteFormProps = {
  title: string;
  action: (state: NoteFormState, formData: FormData) => Promise<NoteFormState>;
  placeholder?: string;
  compact?: boolean;
};

export function NoteForm({ title, action, placeholder, compact = false }: NoteFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className={compact ? "grid gap-3" : "grid gap-4"}>
      <div className="grid gap-2">
        {!compact ? <Label htmlFor="content">{title}</Label> : <span className="text-xs text-muted-foreground">{title}</span>}
        <Textarea
          id="content"
          name="content"
          placeholder={placeholder || "Adicione contexto útil para o time sobre este perfil, aplicação ou caso."}
          className={compact ? "min-h-24" : "min-h-28"}
        />
      </div>

      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <NotebookPen className="mr-2 h-4 w-4" />
          {pending ? "Salvando..." : "Salvar nota"}
        </Button>
      </div>
    </form>
  );
}
