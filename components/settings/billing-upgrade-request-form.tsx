"use client";

import { BillingPlan } from "@prisma/client";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type BillingUpgradeRequestState = {
  error?: string;
  success?: string;
};

const initialState: BillingUpgradeRequestState = {};

type BillingUpgradeRequestFormProps = {
  action: (state: BillingUpgradeRequestState, formData: FormData) => Promise<BillingUpgradeRequestState>;
};

export function BillingUpgradeRequestForm({ action }: BillingUpgradeRequestFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="targetPlan">Plano desejado</Label>
          <Select id="targetPlan" name="targetPlan" defaultValue={BillingPlan.GROWTH}>
            <option value={BillingPlan.STARTER}>Starter</option>
            <option value={BillingPlan.GROWTH}>Growth</option>
            <option value={BillingPlan.BUSINESS}>Business</option>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="targetInterval">Cobrança</Label>
          <Select id="targetInterval" name="targetInterval" defaultValue="monthly">
            <option value="monthly">Mensal</option>
            <option value="annual">Anual</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="requestedExtraSeats">Seats extras</Label>
          <Input id="requestedExtraSeats" name="requestedExtraSeats" type="number" min={0} defaultValue={0} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="requestedAiAddonUnits">Pacotes de IA</Label>
          <Input id="requestedAiAddonUnits" name="requestedAiAddonUnits" type="number" min={0} defaultValue={0} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="requestedContractedMrrCents">MRR proposto (centavos)</Label>
          <Input id="requestedContractedMrrCents" name="requestedContractedMrrCents" type="number" min={0} defaultValue={0} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="note">Contexto do pedido</Label>
        <Textarea
          id="note"
          name="note"
          className="min-h-28"
          placeholder="Descreva volume, urgência comercial, condições negociadas ou contexto para aprovação."
        />
      </div>

      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando..." : "Solicitar aprovação comercial"}
        </Button>
      </div>
    </form>
  );
}
