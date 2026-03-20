import { InterviewRecommendation } from "@prisma/client";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { getAiResumeModel, isAiConfigured } from "@/lib/ai/config";
import { getOpenAIClient } from "@/lib/ai/openai";

const stageCopilotSchema = z.object({
  recommendation: z.enum(["ADVANCE", "HOLD", "REJECT"]),
  summary: z.string(),
  reasons: z.array(z.string()).max(5),
  nextActions: z.array(z.string()).max(5)
});

export type StageCopilotDecision = z.infer<typeof stageCopilotSchema>;

type StageCopilotInput = {
  application: {
    score: number | null;
    scoreJustification: string | null;
    executiveSummary: string | null;
    currentStage: { name: string } | null;
    job: {
      title: string;
      department: string;
      scorecardItems: Array<{ label: string; category: string; weight: number; isRequired: boolean }>;
    };
    candidate: {
      fullName: string;
      currentTitle: string | null;
      yearsExperience: number | null;
    };
    interviews: Array<{
      title: string;
      feedbacks: Array<{
        recommendation: InterviewRecommendation;
        strengths: string;
        concerns: string | null;
      }>;
    }>;
  };
  playbook?: {
    title: string;
    screeningGuidance: string;
    interviewGuidance: string;
    decisionGuidance: string;
    strongSignals: unknown;
    riskSignals: unknown;
  } | null;
};

function jsonArrayToStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function heuristicCopilotDecision(input: StageCopilotInput): StageCopilotDecision {
  const latestFeedback = input.application.interviews.flatMap((interview) => interview.feedbacks).at(-1);
  const strongSignals = jsonArrayToStrings(input.playbook?.strongSignals);
  const riskSignals = jsonArrayToStrings(input.playbook?.riskSignals);
  const score = input.application.score ?? 0;

  if (
    latestFeedback?.recommendation === InterviewRecommendation.NO ||
    latestFeedback?.recommendation === InterviewRecommendation.STRONG_NO
  ) {
    return {
      recommendation: "REJECT",
      summary: "O contexto atual sugere encerrar o processo com feedback claro e rapido.",
      reasons: [
        "Ultimo feedback estruturado foi negativo.",
        latestFeedback.concerns || "Ha sinais de desalinhamento com os criterios da vaga.",
        ...riskSignals.slice(0, 2)
      ].filter(Boolean),
      nextActions: [
        "Fechar a candidatura na etapa terminal adequada.",
        "Enviar comunicacao objetiva ao candidato.",
        "Registrar no historico os principais gaps observados."
      ]
    };
  }

  if (
    score >= 80 ||
    latestFeedback?.recommendation === InterviewRecommendation.YES ||
    latestFeedback?.recommendation === InterviewRecommendation.STRONG_YES
  ) {
    return {
      recommendation: "ADVANCE",
      summary: "O conjunto de sinais sugere avancar mantendo verificacoes finais objetivas.",
      reasons: [
        input.application.scoreJustification || "Score de aderencia acima da media.",
        latestFeedback?.strengths || "Feedback recente aponta boa aderencia.",
        ...strongSignals.slice(0, 2)
      ].filter(Boolean),
      nextActions: [
        "Mover para a proxima etapa coerente com o plano da vaga.",
        "Validar referencias ou sinais finais de execucao.",
        "Preparar comunicacao de continuidade com prazo definido."
      ]
    };
  }

  return {
    recommendation: "HOLD",
    summary: "Ha sinais promissores, mas ainda faltam evidencias para uma decisao mais confiante.",
    reasons: [
      input.application.scoreJustification || "Aderencia parcial aos criterios da vaga.",
      input.playbook?.decisionGuidance || "O playbook recomenda aprofundar validacoes antes da decisao.",
      latestFeedback?.concerns || "Ainda existem pontos em aberto para validar."
    ].filter(Boolean),
    nextActions: [
      "Aprofundar os gaps em uma nova conversa ou case.",
      "Usar o playbook do departamento para orientar a proxima validacao.",
      "Evitar mover a candidatura sem clareza sobre os riscos remanescentes."
    ]
  };
}

export async function getStageCopilotDecision(input: StageCopilotInput) {
  const fallback = heuristicCopilotDecision(input);

  if (!isAiConfigured()) {
    return fallback;
  }

  try {
    const client = getOpenAIClient();
    const completion = await client.beta.chat.completions.parse({
      model: getAiResumeModel(),
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a hiring operations copilot. Recommend whether the team should advance, hold, or reject a candidate at the current stage based only on the provided evidence."
        },
        {
          role: "user",
          content: JSON.stringify({
            application: input.application,
            playbook: input.playbook,
            heuristicFallback: fallback
          })
        }
      ],
      response_format: zodResponseFormat(stageCopilotSchema, "stage_copilot")
    });

    return completion.choices[0]?.message.parsed ?? fallback;
  } catch (error) {
    console.error("Failed to generate stage copilot decision with AI, using fallback", error);
    return fallback;
  }
}
