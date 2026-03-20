"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type KnowledgeUploadState = {
  error?: string;
  success?: string;
};

const initialState: KnowledgeUploadState = {};

type KnowledgeUploadFormProps = {
  action: (state: KnowledgeUploadState, formData: FormData) => Promise<KnowledgeUploadState>;
};

export function KnowledgeUploadForm({ action }: KnowledgeUploadFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5" encType="multipart/form-data">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Titulo</Label>
          <Input id="title" name="title" placeholder="Ex.: Playbook de triagem para Product Engineering" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Tipo</Label>
          <select
            id="type"
            name="type"
            defaultValue="PLAYBOOK"
            className="h-11 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm"
          >
            <option value="PLAYBOOK">Playbook</option>
            <option value="POLICY">Policy</option>
            <option value="SCORECARD">Scorecard</option>
            <option value="TEMPLATE">Template</option>
            <option value="BRIEFING">Briefing</option>
            <option value="PDF">PDF</option>
            <option value="OTHER">Outro</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Contexto</Label>
        <Textarea
          id="description"
          name="description"
          className="min-h-24"
          placeholder="Explique em uma frase o que este material ajuda o time a responder."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="document">Arquivo</Label>
        <Input id="document" name="document" type="file" accept=".pdf,.txt,.md" />
      </div>

      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Enviar documento"}
      </Button>
    </form>
  );
}
