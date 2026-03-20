"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type BillingCommercialState = {
  error?: string;
  success?: string;
};

const initialState: BillingCommercialState = {};

type BillingAddonsFormProps = {
  action: (state: BillingCommercialState, formData: FormData) => Promise<BillingCommercialState>;
  defaultValues: {
    billingExtraSeats: number;
    billingAiAddonUnits: number;
    billingContractedMrrCents: number;
  };
};

export function BillingAddonsForm({ action, defaultValues }: BillingAddonsFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="billingExtraSeats">Seats extras</Label>
          <Input id="billingExtraSeats" name="billingExtraSeats" type="number" min={0} defaultValue={defaultValues.billingExtraSeats} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingAiAddonUnits">Pacotes IA</Label>
          <Input
            id="billingAiAddonUnits"
            name="billingAiAddonUnits"
            type="number"
            min={0}
            defaultValue={defaultValues.billingAiAddonUnits}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingContractedMrrCents">MRR contratado (centavos)</Label>
          <Input
            id="billingContractedMrrCents"
            name="billingContractedMrrCents"
            type="number"
            min={0}
            defaultValue={defaultValues.billingContractedMrrCents}
          />
        </div>
      </div>

      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar termos comerciais"}
      </Button>
    </form>
  );
}
