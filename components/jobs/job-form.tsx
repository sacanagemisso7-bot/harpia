"use client";

import { AutomationTrigger, CriterionType, JobStatus } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type JobCriterionInput = {
  id?: string;
  type: CriterionType;
  label: string;
  weight: number;
  notes?: string;
  order: number;
};

export type JobScorecardItemInput = {
  id?: string;
  label: string;
  category: string;
  description?: string;
  weight: number;
  isRequired: boolean;
  order: number;
};

export type JobAutomationRuleInput = {
  id?: string;
  trigger: AutomationTrigger;
  targetStageId: string;
  enabled: boolean;
  notes?: string;
};

type StageOption = {
  id: string;
  name: string;
};

type JobFormProps = {
  action: (formData: FormData) => Promise<void>;
  stages: StageOption[];
  canUseAutomations?: boolean;
  defaultValues?: {
    title: string;
    department: string;
    location: string;
    employmentType: string;
    seniority: string;
    summary: string;
    description: string;
    educationLevel?: string | null;
    minExperienceYears?: number | null;
    status: JobStatus;
    criteria: JobCriterionInput[];
    scorecardItems: JobScorecardItemInput[];
    automationRules: JobAutomationRuleInput[];
  };
  submitLabel: string;
};

const automationTriggerLabels: Record<AutomationTrigger, string> = {
  INTERVIEW_CREATED: "Entrevista criada",
  INTERVIEW_COMPLETED: "Entrevista concluida",
  FEEDBACK_RECOMMENDED: "Feedback positivo",
  FEEDBACK_REJECTED: "Feedback negativo"
};

const blankCriterion = (order: number): JobCriterionInput => ({
  type: CriterionType.MUST_HAVE,
  label: "",
  weight: 5,
  notes: "",
  order
});

const blankScorecardItem = (order: number): JobScorecardItemInput => ({
  label: "",
  category: "Execucao",
  description: "",
  weight: 5,
  isRequired: true,
  order
});

const blankAutomationRule = (): JobAutomationRuleInput => ({
  trigger: AutomationTrigger.INTERVIEW_CREATED,
  targetStageId: "",
  enabled: true,
  notes: ""
});

function sortByOrder<T extends { order?: number }>(items: T[]) {
  return [...items].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

export function JobForm({ action, stages, canUseAutomations = true, defaultValues, submitLabel }: JobFormProps) {
  const [criteria, setCriteria] = useState<JobCriterionInput[]>(
    defaultValues?.criteria.length ? sortByOrder(defaultValues.criteria) : [blankCriterion(0)]
  );
  const [scorecardItems, setScorecardItems] = useState<JobScorecardItemInput[]>(
    defaultValues?.scorecardItems.length ? sortByOrder(defaultValues.scorecardItems) : [blankScorecardItem(0)]
  );
  const [automationRules, setAutomationRules] = useState<JobAutomationRuleInput[]>(
    defaultValues?.automationRules.length ? defaultValues.automationRules : []
  );

  const updateCriterion = (index: number, nextValue: Partial<JobCriterionInput>) => {
    setCriteria((current) =>
      current.map((criterion, currentIndex) =>
        currentIndex === index ? { ...criterion, ...nextValue, order: currentIndex } : criterion
      )
    );
  };

  const addCriterion = () => {
    setCriteria((current) => [...current, blankCriterion(current.length)]);
  };

  const removeCriterion = (index: number) => {
    setCriteria((current) =>
      current.filter((_, currentIndex) => currentIndex !== index).map((criterion, order) => ({ ...criterion, order }))
    );
  };

  const updateScorecardItem = (index: number, nextValue: Partial<JobScorecardItemInput>) => {
    setScorecardItems((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...nextValue, order: currentIndex } : item
      )
    );
  };

  const addScorecardItem = () => {
    setScorecardItems((current) => [...current, blankScorecardItem(current.length)]);
  };

  const removeScorecardItem = (index: number) => {
    setScorecardItems((current) =>
      current.filter((_, currentIndex) => currentIndex !== index).map((item, order) => ({ ...item, order }))
    );
  };

  const updateAutomationRule = (index: number, nextValue: Partial<JobAutomationRuleInput>) => {
    setAutomationRules((current) =>
      current.map((rule, currentIndex) => (currentIndex === index ? { ...rule, ...nextValue } : rule))
    );
  };

  const addAutomationRule = () => {
    setAutomationRules((current) => [...current, blankAutomationRule()]);
  };

  const removeAutomationRule = (index: number) => {
    setAutomationRules((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="criteria" value={JSON.stringify(criteria)} />
      <input type="hidden" name="scorecardItems" value={JSON.stringify(scorecardItems)} />
      <input type="hidden" name="automationRules" value={JSON.stringify(automationRules)} />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Titulo da vaga</Label>
          <Input id="title" name="title" defaultValue={defaultValues?.title} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">Area</Label>
          <Input id="department" name="department" defaultValue={defaultValues?.department} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Localizacao</Label>
          <Input id="location" name="location" defaultValue={defaultValues?.location} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="employmentType">Tipo de contratacao</Label>
          <Input id="employmentType" name="employmentType" defaultValue={defaultValues?.employmentType} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="seniority">Senioridade</Label>
          <Input id="seniority" name="seniority" defaultValue={defaultValues?.seniority} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="educationLevel">Formacao minima</Label>
          <Input id="educationLevel" name="educationLevel" defaultValue={defaultValues?.educationLevel ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minExperienceYears">Experiencia minima (anos)</Label>
          <Input
            id="minExperienceYears"
            name="minExperienceYears"
            type="number"
            min={0}
            max={50}
            defaultValue={defaultValues?.minExperienceYears ?? 0}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="summary">Resumo executivo da vaga</Label>
          <Textarea
            id="summary"
            name="summary"
            className="min-h-24"
            defaultValue={defaultValues?.summary}
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Descricao completa</Label>
          <Textarea
            id="description"
            name="description"
            className="min-h-40"
            defaultValue={defaultValues?.description}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? JobStatus.DRAFT}
            className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm"
          >
            {Object.values(JobStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="space-y-4 rounded-[1.6rem] border border-border/70 bg-white/70 p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Criterios da vaga</h3>
            <p className="text-sm text-muted-foreground">Base para score, triagem e aderencia do candidato.</p>
          </div>
          <Button type="button" variant="outline" onClick={addCriterion}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar criterio
          </Button>
        </div>

        <div className="space-y-4">
          {criteria.map((criterion, index) => (
            <div key={`${criterion.id ?? "criterion"}-${index}`} className="rounded-[1.35rem] border border-border/70 bg-background/80 p-5">
              <div className="grid gap-4 md:grid-cols-12">
                <div className="space-y-2 md:col-span-3">
                  <Label>Tipo</Label>
                  <select
                    value={criterion.type}
                    onChange={(event) => updateCriterion(index, { type: event.target.value as CriterionType })}
                    className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm"
                  >
                    <option value={CriterionType.MUST_HAVE}>Obrigatorio</option>
                    <option value={CriterionType.NICE_TO_HAVE}>Desejavel</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-6">
                  <Label>Descricao</Label>
                  <Input
                    value={criterion.label}
                    onChange={(event) => updateCriterion(index, { label: event.target.value })}
                    placeholder="Ex.: Experiencia com produtos SaaS B2B"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Peso</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={criterion.weight}
                    onChange={(event) => updateCriterion(index, { weight: Number(event.target.value) || 1 })}
                  />
                </div>
                <div className="flex items-end md:col-span-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCriterion(index)} disabled={criteria.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 md:col-span-12">
                  <Label>Notas</Label>
                  <Textarea
                    className="min-h-20"
                    value={criterion.notes ?? ""}
                    onChange={(event) => updateCriterion(index, { notes: event.target.value })}
                    placeholder="Detalhes de contexto, exemplos de aderencia ou sinais de alerta."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-[1.6rem] border border-border/70 bg-white/70 p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Scorecard de entrevista</h3>
            <p className="text-sm text-muted-foreground">Template que guia o entrevistador por dimensao da vaga.</p>
          </div>
          <Button type="button" variant="outline" onClick={addScorecardItem}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar item
          </Button>
        </div>

        <div className="space-y-4">
          {scorecardItems.map((item, index) => (
            <div key={`${item.id ?? "scorecard"}-${index}`} className="rounded-[1.35rem] border border-border/70 bg-background/80 p-5">
              <div className="grid gap-4 md:grid-cols-12">
                <div className="space-y-2 md:col-span-4">
                  <Label>Item</Label>
                  <Input
                    value={item.label}
                    onChange={(event) => updateScorecardItem(index, { label: event.target.value })}
                    placeholder="Ex.: Product sense"
                  />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>Categoria</Label>
                  <Input
                    value={item.category}
                    onChange={(event) => updateScorecardItem(index, { category: event.target.value })}
                    placeholder="Ex.: Execucao"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Peso</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={item.weight}
                    onChange={(event) => updateScorecardItem(index, { weight: Number(event.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Obrigatorio</Label>
                  <select
                    value={item.isRequired ? "true" : "false"}
                    onChange={(event) => updateScorecardItem(index, { isRequired: event.target.value === "true" })}
                    className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm"
                  >
                    <option value="true">Sim</option>
                    <option value="false">Nao</option>
                  </select>
                </div>
                <div className="flex items-end md:col-span-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeScorecardItem(index)} disabled={scorecardItems.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 md:col-span-12">
                  <Label>Guia para o entrevistador</Label>
                  <Textarea
                    className="min-h-20"
                    value={item.description ?? ""}
                    onChange={(event) => updateScorecardItem(index, { description: event.target.value })}
                    placeholder="O que observar, que evidencias buscar e quais sinais ajudam a calibrar a nota."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-[1.6rem] border border-border/70 bg-white/70 p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Automacoes do pipeline</h3>
            <p className="text-sm text-muted-foreground">Mova automaticamente aplicacoes com base nos eventos chave da entrevista.</p>
          </div>
          <Button type="button" variant="outline" onClick={addAutomationRule} disabled={!canUseAutomations}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar regra
          </Button>
        </div>

        {!canUseAutomations ? (
          <div className="rounded-[1.35rem] border border-dashed border-border bg-background/80 p-5 text-sm text-muted-foreground">
            Automacoes por vaga fazem parte dos planos Growth e Business. No Starter, o restante da vaga continua funcionando normalmente.
          </div>
        ) : null}

        <div className="space-y-4">
          {canUseAutomations
            ? automationRules.map((rule, index) => (
            <div key={`${rule.id ?? "automation"}-${index}`} className="rounded-[1.35rem] border border-border/70 bg-background/80 p-5">
              <div className="grid gap-4 md:grid-cols-12">
                <div className="space-y-2 md:col-span-4">
                  <Label>Trigger</Label>
                  <select
                    value={rule.trigger}
                    onChange={(event) => updateAutomationRule(index, { trigger: event.target.value as AutomationTrigger })}
                    className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm"
                  >
                    {Object.values(AutomationTrigger).map((trigger) => (
                      <option key={trigger} value={trigger}>
                        {automationTriggerLabels[trigger]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-4">
                  <Label>Etapa de destino</Label>
                  <select
                    value={rule.targetStageId}
                    onChange={(event) => updateAutomationRule(index, { targetStageId: event.target.value })}
                    className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm"
                  >
                    <option value="">Selecione uma etapa</option>
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>Ativa</Label>
                  <select
                    value={rule.enabled ? "true" : "false"}
                    onChange={(event) => updateAutomationRule(index, { enabled: event.target.value === "true" })}
                    className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm"
                  >
                    <option value="true">Sim</option>
                    <option value="false">Nao</option>
                  </select>
                </div>
                <div className="flex items-end md:col-span-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeAutomationRule(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 md:col-span-12">
                  <Label>Observacoes</Label>
                  <Textarea
                    className="min-h-20"
                    value={rule.notes ?? ""}
                    onChange={(event) => updateAutomationRule(index, { notes: event.target.value })}
                    placeholder="Explique quando essa automacao deve ser usada e como o time interpreta esse trigger."
                  />
                </div>
              </div>
            </div>
              ))
            : null}
          {canUseAutomations && !automationRules.length ? (
            <div className="rounded-[1.35rem] border border-dashed border-border bg-background/80 p-5 text-sm text-muted-foreground">
              Nenhuma automacao configurada. Adicione regras apenas se quiser mover aplicacoes automaticamente.
            </div>
          ) : null}
        </div>
      </section>

      <Button type="submit" size="lg">
        {submitLabel}
      </Button>
    </form>
  );
}
