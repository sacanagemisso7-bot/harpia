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
    <form action={formAction} className="workspace-form">
      <div className="workspace-form-grid">
        <div className="space-y-2">
          <Label htmlFor="billingLegalName">Razao social</Label>
          <Input id="billingLegalName" name="billingLegalName" defaultValue={defaultValues.billingLegalName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingTaxId">Documento fiscal</Label>
          <Input id="billingTaxId" name="billingTaxId" defaultValue={defaultValues.billingTaxId} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingBillingEmail">Email de cobranca</Label>
          <Input id="billingBillingEmail" name="billingBillingEmail" type="email" defaultValue={defaultValues.billingBillingEmail} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingCountryCode">Pais / VAT zone</Label>
          <Input id="billingCountryCode" name="billingCountryCode" defaultValue={defaultValues.billingCountryCode} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingAiOverageRateCents">Overage IA por analise (centavos)</Label>
          <Input
            id="billingAiOverageRateCents"
            name="billingAiOverageRateCents"
            type="number"
            min={0}
            defaultValue={defaultValues.billingAiOverageRateCents}
          />
        </div>
      </div>

      <FormMessage message={state.error} />
      {state.success ? <p className="workspace-form-success">{state.success}</p> : null}

      <div className="workspace-form-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar perfil fiscal"}
        </Button>
      </div>
    </form>
  );
}
