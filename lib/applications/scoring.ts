import { CriterionType } from "@prisma/client";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { getAiResumeModel, isAiConfigured } from "@/lib/ai/config";
import { getOpenAIClient } from "@/lib/ai/openai";

type ScoreCandidate = {
  fullName: string;
  summary: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  yearsExperience: number | null;
  highestEducation: string | null;
  parsedProfile: unknown;
  resumes?: Array<{
    extractedText: string | null;
  }>;
};

type ScoreJob = {
  title: string;
  summary: string;
  educationLevel: string | null;
  minExperienceYears: number | null;
  criteria: Array<{
    type: CriterionType;
    label: string;
    weight: number;
    notes: string | null;
  }>;
};

const applicationAssessmentSchema = z.object({
  score: z.number().int().min(0).max(100),
  scoreJustification: z.string(),
  executiveSummary: z.string(),
  strengths: z.array(z.string()).max(6),
  gaps: z.array(z.string()).max(6),
  detectedSkills: z.array(z.string()).max(20),
  detectedExperience: z.object({
    years: z.number().min(0).max(60).nullable(),
    highlights: z.array(z.string()).max(6)
  }),
  suggestedQuestions: z.array(z.string()).max(6)
});

export type ApplicationAssessment = z.infer<typeof applicationAssessmentSchema>;

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function tokenize(value: string) {
  return normalize(value)
    .split(/[^a-z0-9+#.]+/)
    .filter((token) => token.length >= 3);
}

function getProfileArrays(parsedProfile: unknown, key: string) {
  if (parsedProfile && typeof parsedProfile === "object" && key in parsedProfile) {
    const value = (parsedProfile as Record<string, unknown>)[key];

    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
  }

  return [];
}

function getProfileString(parsedProfile: unknown, key: string) {
  if (parsedProfile && typeof parsedProfile === "object" && key in parsedProfile) {
    const value = (parsedProfile as Record<string, unknown>)[key];

    if (typeof value === "string") {
      return value;
    }
  }

  return null;
}

function buildCandidateContext(candidate: ScoreCandidate) {
  const detectedSkills = [
    ...getProfileArrays(candidate.parsedProfile, "coreSkills"),
    ...getProfileArrays(candidate.parsedProfile, "softSkills"),
    ...getProfileArrays(candidate.parsedProfile, "skills")
  ];
  const strengths = getProfileArrays(candidate.parsedProfile, "strengths");
  const risks = getProfileArrays(candidate.parsedProfile, "risks");
  const resumeText = candidate.resumes?.[0]?.extractedText ?? "";
  const experienceHighlights = getProfileArrays(candidate.parsedProfile, "languages");
  const headline = getProfileString(candidate.parsedProfile, "headline");
  const executiveSummary = getProfileString(candidate.parsedProfile, "executiveSummary");

  const haystack = normalize(
    [
      candidate.fullName,
      candidate.summary,
      candidate.currentTitle,
      candidate.currentCompany,
      candidate.highestEducation,
      headline,
      executiveSummary,
      ...detectedSkills,
      ...strengths,
      ...risks,
      ...experienceHighlights,
      resumeText
    ]
      .filter(Boolean)
      .join(" ")
  );

  return {
    haystack,
    detectedSkills: Array.from(new Set(detectedSkills)).slice(0, 20),
    profileStrengths: strengths,
    profileRisks: risks,
    executiveSummary,
    resumeText,
    totalYearsExperience:
      candidate.yearsExperience ??
      (typeof (candidate.parsedProfile as { totalYearsExperience?: unknown })?.totalYearsExperience === "number"
        ? ((candidate.parsedProfile as { totalYearsExperience?: number }).totalYearsExperience ?? null)
        : null)
  };
}

function criterionMatchScore(
  context: ReturnType<typeof buildCandidateContext>,
  criterion: ScoreJob["criteria"][number]
) {
  const tokens = tokenize(`${criterion.label} ${criterion.notes ?? ""}`);

  if (!tokens.length) {
    return 0;
  }

  const matchedTokens = tokens.filter((token) => context.haystack.includes(token));
  const ratio = matchedTokens.length / tokens.length;

  if (ratio >= 0.55) return 1;
  if (ratio >= 0.28) return 0.55;
  if (ratio > 0) return 0.25;
  return 0;
}

function heuristicAssessment(job: ScoreJob, candidate: ScoreCandidate): ApplicationAssessment {
  const context = buildCandidateContext(candidate);
  const mustHave = job.criteria.filter((criterion) => criterion.type === CriterionType.MUST_HAVE);
  const niceToHave = job.criteria.filter((criterion) => criterion.type === CriterionType.NICE_TO_HAVE);

  const mustWeight = mustHave.reduce((sum, criterion) => sum + criterion.weight, 0) || 1;
  const niceWeight = niceToHave.reduce((sum, criterion) => sum + criterion.weight, 0) || 1;

  const mustScore =
    mustHave.reduce((sum, criterion) => sum + criterionMatchScore(context, criterion) * criterion.weight, 0) /
    mustWeight;
  const niceScore =
    niceToHave.reduce((sum, criterion) => sum + criterionMatchScore(context, criterion) * criterion.weight, 0) /
    niceWeight;

  const experienceTarget = job.minExperienceYears ?? 0;
  const experienceYears = context.totalYearsExperience ?? candidate.yearsExperience ?? 0;
  const experienceScore =
    experienceTarget <= 0 ? 1 : Math.max(0, Math.min(1, experienceYears / Math.max(experienceTarget, 1)));
  const educationScore =
    !job.educationLevel || !job.educationLevel.length
      ? 1
      : candidate.highestEducation
        ? 1
        : context.haystack.includes(normalize(job.educationLevel))
          ? 0.75
          : 0.2;
  const skillsScore = Math.min(1, context.detectedSkills.length / 8);

  const totalScore = Math.round(
    mustScore * 50 + niceScore * 20 + experienceScore * 15 + skillsScore * 10 + educationScore * 5
  );

  const matchedMust = mustHave.filter((criterion) => criterionMatchScore(context, criterion) >= 0.55);
  const missingMust = mustHave.filter((criterion) => criterionMatchScore(context, criterion) < 0.55);
  const matchedNice = niceToHave.filter((criterion) => criterionMatchScore(context, criterion) >= 0.55);

  const strengths = Array.from(
    new Set([
      ...matchedMust.map((criterion) => `Atende bem ao criterio: ${criterion.label}`),
      ...matchedNice.slice(0, 2).map((criterion) => `Traz diferencial em ${criterion.label}`),
      ...context.profileStrengths
    ])
  ).slice(0, 6);

  const gaps = Array.from(
    new Set([
      ...missingMust.map((criterion) => `Nao ha evidencia suficiente para ${criterion.label}`),
      ...(experienceYears < experienceTarget
        ? [`Experiencia aparente abaixo do minimo desejado de ${experienceTarget} anos`]
        : []),
      ...context.profileRisks
    ])
  ).slice(0, 6);

  const suggestedQuestions = Array.from(
    new Set([
      ...missingMust.map((criterion) => `Pode detalhar sua experiencia com ${criterion.label}?`),
      ...(gaps.length
        ? [`Quais entregas melhor demonstram sua aderencia aos requisitos centrais desta vaga?`]
        : [`Quais resultados voce gerou em contextos mais proximos desta vaga?`])
    ])
  ).slice(0, 6);

  const summaryLead =
    context.executiveSummary ||
    candidate.summary ||
    `${candidate.fullName} apresenta repertorio relevante para a vaga ${job.title}.`;

  return {
    score: totalScore,
    scoreJustification:
      totalScore >= 80
        ? "Alta aderencia aos criterios principais, com boa cobertura de experiencia e contexto de atuacao."
        : totalScore >= 60
          ? "Boa aderencia geral, mas com alguns pontos que ainda precisam de confirmacao em entrevista."
          : "Aderencia parcial aos requisitos. O perfil pode exigir validacao adicional antes de priorizacao.",
    executiveSummary: summaryLead,
    strengths,
    gaps,
    detectedSkills: context.detectedSkills,
    detectedExperience: {
      years: experienceYears || null,
      highlights: matchedMust.slice(0, 3).map((criterion) => criterion.label)
    },
    suggestedQuestions
  };
}

async function aiAssessment(job: ScoreJob, candidate: ScoreCandidate, fallback: ApplicationAssessment) {
  if (!isAiConfigured()) {
    return fallback;
  }

  const client = getOpenAIClient();

  const completion = await client.beta.chat.completions.parse({
    model: getAiResumeModel(),
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are a recruiting copilot scoring candidates for hiring teams. Produce an explainable score from 0 to 100 grounded only in the provided job and candidate data."
      },
      {
        role: "user",
        content: JSON.stringify({
          job,
          candidate: {
            ...candidate,
            resumes: candidate.resumes?.map((resume) => ({
              extractedText: resume.extractedText?.slice(0, 10000) ?? null
            }))
          },
          fallbackAssessment: fallback
        })
      }
    ],
    response_format: zodResponseFormat(applicationAssessmentSchema, "application_assessment")
  });

  return completion.choices[0]?.message.parsed ?? fallback;
}

export async function evaluateApplication(job: ScoreJob, candidate: ScoreCandidate) {
  const fallback = heuristicAssessment(job, candidate);

  try {
    return await aiAssessment(job, candidate, fallback);
  } catch (error) {
    console.error("Failed to evaluate application with AI, using heuristic fallback", error);
    return fallback;
  }
}
