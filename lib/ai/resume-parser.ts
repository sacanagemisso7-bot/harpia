import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { getAiResumeModel } from "@/lib/ai/config";
import { getOpenAIClient } from "@/lib/ai/openai";

const experienceEntrySchema = z.object({
  role: z.string(),
  company: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  highlights: z.array(z.string()).max(4)
});

const educationEntrySchema = z.object({
  degree: z.string(),
  field: z.string().nullable(),
  institution: z.string(),
  conclusionYear: z.string().nullable()
});

export const parsedCandidateProfileSchema = z.object({
  executiveSummary: z.string(),
  headline: z.string(),
  location: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  linkedinUrl: z.string().url().nullable(),
  portfolioUrl: z.string().url().nullable(),
  currentTitle: z.string().nullable(),
  currentCompany: z.string().nullable(),
  totalYearsExperience: z.number().min(0).max(60).nullable(),
  highestEducation: z.string().nullable(),
  coreSkills: z.array(z.string()).max(20),
  softSkills: z.array(z.string()).max(10),
  languages: z.array(z.string()).max(10),
  strengths: z.array(z.string()).max(6),
  risks: z.array(z.string()).max(6),
  suggestedInterviewQuestions: z.array(z.string()).max(6),
  experience: z.array(experienceEntrySchema).max(8),
  education: z.array(educationEntrySchema).max(6)
});

export type ParsedCandidateProfile = z.infer<typeof parsedCandidateProfileSchema>;

export async function parseResumeWithAI(input: {
  candidateName: string;
  resumeText: string;
}) {
  const client = getOpenAIClient();

  const completion = await client.beta.chat.completions.parse({
    model: getAiResumeModel(),
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are an expert recruiting analyst. Extract a candidate profile from resume text with high factual precision. Do not invent details. If a field is not supported by the resume, return null or an empty array."
      },
      {
        role: "user",
        content: `Candidate name: ${input.candidateName}\n\nResume text:\n${input.resumeText.slice(0, 18000)}`
      }
    ],
    response_format: zodResponseFormat(parsedCandidateProfileSchema, "parsed_candidate_profile")
  });

  const parsed = completion.choices[0]?.message.parsed;

  if (!parsed) {
    throw new Error("AI provider did not return a parsed candidate profile.");
  }

  return parsed;
}
