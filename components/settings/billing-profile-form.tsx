"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type BillingProfileState = {
  error?: string;
  success?: string;
};

const initialState: BillingProfileState = {};

type BillingProfileFormProps = {
  action: (state: BillingProfileState, formData: FormData) => Promise<BillingProfileState>;
  defaultValues: {
    billingLegalName: string;
    billingTaxId: string;
    billingBillingEmail: string;
    billingCountryCode: string;
    billingAiOverageRateCents: number;
  };
};

export function BillingProfileForm({ action, defaultValues }: BillingProfileFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="billingLegalName">Razão social</Label>
          <Input id="billingLegalName" name="billingLegalName" defaultValue={defaultValues.billingLegalName} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="billingTaxId">Documento fiscal</Label>
          <Input id="billingTaxId" name="billingTaxId" defaultValue={defaultValues.billingTaxId} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="billingBillingEmail">E-mail de cobrança</Label>
          <Input id="billingBillingEmail" name="billingBillingEmail" type="email" defaultValue={defaultValues.billingBillingEmail} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="billingCountryCode">País / zona fiscal</Label>
          <Input id="billingCountryCode" name="billingCountryCode" defaultValue={defaultValues.billingCountryCode} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="billingAiOverageRateCents">Overage de IA por análise (centavos)</Label>
        <Input
          id="billingAiOverageRateCents"
          name="billingAiOverageRateCents"
          type="number"
          min={0}
          defaultValue={defaultValues.billingAiOverageRateCents}
        />
      </div>

      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar perfil fiscal"}
        </Button>
      </div>
    </form>
  );
}
