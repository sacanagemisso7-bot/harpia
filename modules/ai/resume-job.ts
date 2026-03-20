import { BackgroundJobStatus, type BackgroundJob } from "@prisma/client";

import { getAiResumeModel } from "@/lib/ai/config";
import { parseResumeWithAI } from "@/lib/ai/resume-parser";
import { prisma } from "@/lib/prisma/client";

export async function processResumeParsingJob(job: BackgroundJob) {
  const payload = job.payload as {
    candidateId: string;
    resumeId: string;
  };

  const candidate = await prisma.candidate.findFirst({
    where: {
      id: payload.candidateId,
      organizationId: job.organizationId
    },
    include: {
      resumes: {
        where: {
          id: payload.resumeId
        },
        take: 1
      }
    }
  });

  if (!candidate) {
    return {
      status: BackgroundJobStatus.FAILED,
      error: "Candidate not found for resume parsing."
    };
  }

  const resume = candidate.resumes[0];

  if (!resume?.extractedText) {
    return {
      status: BackgroundJobStatus.FAILED,
      error: "Resume text is not available for parsing."
    };
  }

  const parsedProfile = await parseResumeWithAI({
    candidateName: candidate.fullName,
    resumeText: resume.extractedText
  });

  await prisma.candidate.update({
    where: {
      id: candidate.id
    },
    data: {
      email: candidate.email ?? parsedProfile.email ?? null,
      phone: candidate.phone ?? parsedProfile.phone ?? null,
      linkedinUrl: candidate.linkedinUrl ?? parsedProfile.linkedinUrl ?? null,
      portfolioUrl: candidate.portfolioUrl ?? parsedProfile.portfolioUrl ?? null,
      location: candidate.location ?? parsedProfile.location ?? null,
      summary: candidate.summary ?? parsedProfile.executiveSummary,
      yearsExperience: candidate.yearsExperience ?? parsedProfile.totalYearsExperience ?? null,
      highestEducation: candidate.highestEducation ?? parsedProfile.highestEducation ?? null,
      currentTitle: candidate.currentTitle ?? parsedProfile.currentTitle ?? null,
      currentCompany: candidate.currentCompany ?? parsedProfile.currentCompany ?? null,
      parsedProfile: {
        executiveSummary: parsedProfile.executiveSummary,
        headline: parsedProfile.headline,
        coreSkills: parsedProfile.coreSkills,
        softSkills: parsedProfile.softSkills,
        languages: parsedProfile.languages,
        strengths: parsedProfile.strengths,
        risks: parsedProfile.risks,
        suggestedInterviewQuestions: parsedProfile.suggestedInterviewQuestions,
        experience: parsedProfile.experience,
        education: parsedProfile.education,
        generatedAt: new Date().toISOString(),
        model: getAiResumeModel()
      }
    }
  });

  await prisma.resume.update({
    where: {
      id: resume.id
    },
    data: {
      parsedAt: new Date()
    }
  });

  return {
    status: BackgroundJobStatus.SUCCEEDED,
    summary: `Resume parsed for ${candidate.fullName}.`
  };
}
