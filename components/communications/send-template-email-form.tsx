"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

export type SendTemplateEmailState = {
  error?: string;
  success?: string;
};

const initialState: SendTemplateEmailState = {};

type SendTemplateEmailFormProps = {
  action: (state: SendTemplateEmailState, formData: FormData) => Promise<SendTemplateEmailState>;
  templateType: string;
  label: string;
};

export function SendTemplateEmailForm({
  action,
  templateType,
  label
}: SendTemplateEmailFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="templateType" value={templateType} />
      <Button type="submit" variant="outline" disabled={pending} className="w-full justify-start">
        <Send className="mr-2 h-4 w-4" />
        {pending ? "Enviando..." : label}
      </Button>
      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}
    </form>
  );
}
