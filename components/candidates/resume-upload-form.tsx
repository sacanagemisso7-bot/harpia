"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ResumeUploadState = {
  error?: string;
};

const initialState: ResumeUploadState = {};

type ResumeUploadFormProps = {
  action: (state: ResumeUploadState, formData: FormData) => Promise<ResumeUploadState>;
};

export function ResumeUploadForm({ action }: ResumeUploadFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="resume">Curriculo em PDF</Label>
        <Input id="resume" name="resume" type="file" accept="application/pdf" required />
      </div>
      <FormMessage message={state.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Enviar curriculo"}
      </Button>
    </form>
  );
}
