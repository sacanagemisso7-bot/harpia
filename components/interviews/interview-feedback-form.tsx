"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type InterviewFeedbackState = {
  error?: string;
  success?: string;
};

type ScorecardRatingInput = {
  scorecardItemId: string;
  score: number;
};

type ScorecardItem = {
  id: string;
  label: string;
  category: string;
  description?: string | null;
  weight: number;
  isRequired: boolean;
};

const initialState: InterviewFeedbackState = {};

const recommendationValues = ["STRONG_YES", "YES", "MAYBE", "NO", "STRONG_NO"] as const;
type RecommendationValue = (typeof recommendationValues)[number];

const recommendationLabels: Record<RecommendationValue, string> = {
  STRONG_YES: "Strong yes",
  YES: "Yes",
  MAYBE: "Maybe",
  NO: "No",
  STRONG_NO: "Strong no"
};

type InterviewFeedbackFormProps = {
  action: (state: InterviewFeedbackState, formData: FormData) => Promise<InterviewFeedbackState>;
  scorecardItems?: ScorecardItem[];
  defaultValues?: {
    overallScore: number;
    communicationScore: number;
    roleFitScore: number;
    technicalScore?: number | null;
    recommendation: RecommendationValue;
    strengths: string;
    concerns?: string | null;
    notes?: string | null;
    scorecardRatings?: ScorecardRatingInput[];
  };
};

function ScoreSelect({ id, name, defaultValue }: { id: string; name: string; defaultValue?: number | null }) {
  return (
    <Select id={id} name={name} defaultValue={defaultValue ? String(defaultValue) : ""}>
      <option value="">Selecione</option>
      {[1, 2, 3, 4, 5].map((value) => (
        <option key={value} value={value}>
          {value}
        </option>
      ))}
    </Select>
  );
}

export function InterviewFeedbackForm({ action, scorecardItems = [], defaultValues }: InterviewFeedbackFormProps) {
  const router = useRouter();
  const [scorecardRatings, setScorecardRatings] = useState<ScorecardRatingInput[]>(
    defaultValues?.scorecardRatings?.length
      ? defaultValues.scorecardRatings
      : scorecardItems.map((item) => ({
          scorecardItemId: item.id,
          score: 3
        }))
  );
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  const updateScorecardRating = (scorecardItemId: string, score: number) => {
    setScorecardRatings((current) => {
      const existing = current.find((item) => item.scorecardItemId === scorecardItemId);

      if (existing) {
        return current.map((item) => (item.scorecardItemId === scorecardItemId ? { ...item, score } : item));
      }

      return [...current, { scorecardItemId, score }];
    });
  };

  return (
    <form action={formAction} className="workspace-form">
      <input type="hidden" name="scorecardRatings" value={JSON.stringify(scorecardRatings)} />

      <div className="workspace-form-grid">
        <div className="space-y-2">
          <Label htmlFor="overallScore">Nota geral</Label>
          <ScoreSelect id="overallScore" name="overallScore" defaultValue={defaultValues?.overallScore} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recommendation">Recomendacao</Label>
          <Select id="recommendation" name="recommendation" defaultValue={defaultValues?.recommendation ?? "MAYBE"}>
            {recommendationValues.map((value) => (
              <option key={value} value={value}>
                {recommendationLabels[value]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="workspace-form-grid workspace-form-grid-3">
        <div className="space-y-2">
          <Label htmlFor="communicationScore">Comunicacao</Label>
          <ScoreSelect id="communicationScore" name="communicationScore" defaultValue={defaultValues?.communicationScore} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roleFitScore">Role fit</Label>
          <ScoreSelect id="roleFitScore" name="roleFitScore" defaultValue={defaultValues?.roleFitScore} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="technicalScore">Tecnico</Label>
          <ScoreSelect id="technicalScore" name="technicalScore" defaultValue={defaultValues?.technicalScore} />
        </div>
      </div>

      {scorecardItems.length ? (
        <div className="workspace-form-section">
          <div className="workspace-form-copy">
            <p className="workspace-form-title">Scorecard da vaga</p>
            <p className="workspace-form-description">Avalie os eixos configurados especificamente para esta vaga.</p>
          </div>
          <div className="grid gap-4">
            {scorecardItems.map((item) => {
              const currentScore = scorecardRatings.find((rating) => rating.scorecardItemId === item.id)?.score ?? 3;

              return (
                <div key={item.id} className="workspace-form-subsection">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.category} - peso {item.weight}/10 {item.isRequired ? "- obrigatorio" : "- complementar"}
                      </p>
                      {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
                    </div>
                    <div className="w-full max-w-[160px]">
                      <Select
                        value={String(currentScore)}
                        onChange={(event) => updateScorecardRating(item.id, Number(event.target.value))}
                      >
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option key={value} value={value}>
                            Nota {value}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="strengths">Pontos fortes</Label>
        <Textarea
          id="strengths"
          name="strengths"
          className="min-h-24"
          defaultValue={defaultValues?.strengths}
          placeholder="Descreva evidencias, repertorio, clareza de comunicacao e sinais positivos."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="concerns">Riscos ou preocupacoes</Label>
        <Textarea
          id="concerns"
          name="concerns"
          className="min-h-20"
          defaultValue={defaultValues?.concerns ?? ""}
          placeholder="Quais gaps, incertezas ou pontos para validar depois?"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notas adicionais</Label>
        <Textarea
          id="notes"
          name="notes"
          className="min-h-24"
          defaultValue={defaultValues?.notes ?? ""}
          placeholder="Resumo livre, contexto da conversa e recomendacao final."
        />
      </div>
      <FormMessage message={state.error} />
      {state.success ? <p className="workspace-form-success">{state.success}</p> : null}
      <div className="workspace-form-actions">
        <Button type="submit" disabled={pending}>
          <ClipboardPenLine className="mr-2 h-4 w-4" />
          {pending ? "Salvando feedback..." : "Salvar feedback"}
        </Button>
      </div>
    </form>
  );
}
