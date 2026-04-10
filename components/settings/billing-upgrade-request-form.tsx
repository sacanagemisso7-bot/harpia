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
    <form action={formAction} className="workspace-form">
      <div className="workspace-form-grid">
        <div className="space-y-2">
          <Label htmlFor="targetPlan">Plano desejado</Label>
          <Select id="targetPlan" name="targetPlan" defaultValue={BillingPlan.GROWTH}>
            <option value={BillingPlan.STARTER}>Starter</option>
            <option value={BillingPlan.GROWTH}>Growth</option>
            <option value={BillingPlan.BUSINESS}>Business</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetInterval">Cobranca</Label>
          <Select id="targetInterval" name="targetInterval" defaultValue="monthly">
            <option value="monthly">Mensal</option>
            <option value="annual">Anual</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="requestedExtraSeats">Seats extras</Label>
          <Input id="requestedExtraSeats" name="requestedExtraSeats" type="number" min={0} defaultValue={0} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="requestedAiAddonUnits">Pacotes IA</Label>
          <Input id="requestedAiAddonUnits" name="requestedAiAddonUnits" type="number" min={0} defaultValue={0} />
        </div>
        <div className="space-y-2 workspace-form-span-full">
          <Label htmlFor="requestedContractedMrrCents">MRR proposto (centavos, opcional)</Label>
          <Input id="requestedContractedMrrCents" name="requestedContractedMrrCents" type="number" min={0} defaultValue={0} />
        </div>
        <div className="space-y-2 workspace-form-span-full">
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
      {state.success ? <p className="workspace-form-success">{state.success}</p> : null}

      <div className="workspace-form-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando..." : "Solicitar aprovacao comercial"}
        </Button>
      </div>
    </form>
  );
}
