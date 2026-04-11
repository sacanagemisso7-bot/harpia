"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
    <form action={formAction} className="workspace-form" encType="multipart/form-data">
      <div className="workspace-form-grid">
        <div className="space-y-2">
          <Label htmlFor="title">Titulo</Label>
          <Input id="title" name="title" placeholder="Ex.: Playbook de triagem para Product Engineering" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Tipo</Label>
          <Select id="type" name="type" defaultValue="PLAYBOOK">
            <option value="PLAYBOOK">Playbook</option>
            <option value="POLICY">Policy</option>
            <option value="SCORECARD">Scorecard</option>
            <option value="TEMPLATE">Template</option>
            <option value="BRIEFING">Briefing</option>
            <option value="PDF">PDF</option>
            <option value="OTHER">Outro</option>
          </Select>
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
        <p className="workspace-form-note">Aceita PDF, Markdown e texto puro para ingestão e indexacao automatica.</p>
      </div>

      <FormMessage message={state.error} />
      {state.success ? <p className="workspace-form-success">{state.success}</p> : null}

      <div className="workspace-form-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando..." : "Enviar documento"}
        </Button>
      </div>
    </form>
  );
}
