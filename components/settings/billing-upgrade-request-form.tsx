"use client";

import { BillingPlan } from "@prisma/client";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="targetPlan">Plano desejado</Label>
          <select
            id="targetPlan"
            name="targetPlan"
            defaultValue={BillingPlan.GROWTH}
            className="flex h-11 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm"
          >
            <option value={BillingPlan.STARTER}>Starter</option>
            <option value={BillingPlan.GROWTH}>Growth</option>
            <option value={BillingPlan.BUSINESS}>Business</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetInterval">Cobranca</Label>
          <select
            id="targetInterval"
            name="targetInterval"
            defaultValue="monthly"
            className="flex h-11 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm"
          >
            <option value="monthly">Mensal</option>
            <option value="annual">Anual</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="requestedExtraSeats">Seats extras</Label>
          <Input id="requestedExtraSeats" name="requestedExtraSeats" type="number" min={0} defaultValue={0} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="requestedAiAddonUnits">Pacotes IA</Label>
          <Input id="requestedAiAddonUnits" name="requestedAiAddonUnits" type="number" min={0} defaultValue={0} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="requestedContractedMrrCents">MRR proposto (centavos, opcional)</Label>
          <Input id="requestedContractedMrrCents" name="requestedContractedMrrCents" type="number" min={0} defaultValue={0} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="note">Contexto do pedido</Label>
          <Textarea
            id="note"
            name="note"
            className="min-h-28"
            placeholder="Descreva volume, urgencia comercial, condicoes negociadas ou contexto para aprovacao."
          />
        </div>
      </div>

      <FormMessage message={state.error} />
      {state.success ? <p className="text-sm text-emerald-700">{state.success}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Solicitar aprovacao comercial"}
      </Button>
    </form>
  );
}
