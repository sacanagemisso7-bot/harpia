"use server";

import { JobStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/permissions";
import { hasPlanFeature } from "@/lib/billing/features";
import { checkBillingLimit } from "@/lib/billing/usage";
import { prisma } from "@/lib/prisma/client";
import { jobFormSchema } from "@/lib/validations/job";

function parseJobFormData(formData: FormData) {
  const rawCriteria = formData.get("criteria");
  const rawScorecardItems = formData.get("scorecardItems");
  const rawAutomationRules = formData.get("automationRules");

  const criteria = typeof rawCriteria === "string" ? JSON.parse(rawCriteria) : [];
  const scorecardItems = typeof rawScorecardItems === "string" ? JSON.parse(rawScorecardItems) : [];
  const automationRules = typeof rawAutomationRules === "string" ? JSON.parse(rawAutomationRules) : [];

  return jobFormSchema.parse({
    title: formData.get("title"),
    department: formData.get("department"),
    location: formData.get("location"),
    employmentType: formData.get("employmentType"),
    seniority: formData.get("seniority"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    educationLevel: formData.get("educationLevel") || undefined,
    minExperienceYears: Number(formData.get("minExperienceYears") || 0),
    status: (formData.get("status") as JobStatus) ?? JobStatus.DRAFT,
    criteria,
    scorecardItems,
    automationRules
  });
}

export async function createJob(formData: FormData) {
  const user = await requirePermission("manage_jobs");
  const organization = await prisma.organization.findUnique({
    where: {
      id: user.organizationId
    },
    select: {
      billingPlan: true
    }
  });

  if (!organization) {
    redirect("/settings?billing=organization-not-found");
  }

  const jobLimit = await checkBillingLimit(user.organizationId, organization.billingPlan, "activeJobs");

  if (!jobLimit.allowed) {
    redirect("/pricing?billing=job-limit");
  }

  const payload = parseJobFormData(formData);
  const automationRules = hasPlanFeature(organization.billingPlan, "job_automations") ? payload.automationRules : [];

  const job = await prisma.job.create({
    data: {
      organizationId: user.organizationId,
      createdById: user.id,
      title: payload.title,
      department: payload.department,
      location: payload.location,
      employmentType: payload.employmentType,
      seniority: payload.seniority,
      summary: payload.summary,
      description: payload.description,
      educationLevel: payload.educationLevel,
      minExperienceYears: payload.minExperienceYears,
      status: payload.status,
      criteria: {
        create: payload.criteria.map((criterion) => ({
          type: criterion.type,
          label: criterion.label,
          weight: criterion.weight,
          notes: criterion.notes,
          order: criterion.order
        }))
      },
      scorecardItems: {
        create: payload.scorecardItems.map((item) => ({
          organizationId: user.organizationId,
          label: item.label,
          category: item.category,
          description: item.description,
          weight: item.weight,
          isRequired: item.isRequired,
          order: item.order
        }))
      },
      automationRules: {
        create: automationRules.map((rule) => ({
          organizationId: user.organizationId,
          trigger: rule.trigger,
          targetStageId: rule.targetStageId,
          enabled: rule.enabled,
          notes: rule.notes
        }))
      }
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/jobs");

  redirect(`/jobs/${job.id}`);
}

export async function updateJob(jobId: string, formData: FormData) {
  const user = await requirePermission("manage_jobs");
  const organization = await prisma.organization.findUnique({
    where: {
      id: user.organizationId
    },
    select: {
      billingPlan: true
    }
  });

  if (!organization) {
    redirect("/settings/billing?billing=organization-not-found");
  }

  const payload = parseJobFormData(formData);
  const automationRules = hasPlanFeature(organization.billingPlan, "job_automations") ? payload.automationRules : [];

  await prisma.job.updateMany({
    where: {
      id: jobId,
      organizationId: user.organizationId
    },
    data: {
      title: payload.title,
      department: payload.department,
      location: payload.location,
      employmentType: payload.employmentType,
      seniority: payload.seniority,
      summary: payload.summary,
      description: payload.description,
      educationLevel: payload.educationLevel,
      minExperienceYears: payload.minExperienceYears,
      status: payload.status
    }
  });

  await prisma.jobCriterion.deleteMany({
    where: { jobId }
  });

  await prisma.jobScorecardItem.deleteMany({
    where: { jobId }
  });

  await prisma.jobAutomationRule.deleteMany({
    where: { jobId }
  });

  await prisma.jobCriterion.createMany({
    data: payload.criteria.map((criterion) => ({
      jobId,
      type: criterion.type,
      label: criterion.label,
      weight: criterion.weight,
      notes: criterion.notes,
      order: criterion.order
    }))
  });

  await prisma.jobScorecardItem.createMany({
    data: payload.scorecardItems.map((item) => ({
      organizationId: user.organizationId,
      jobId,
      label: item.label,
      category: item.category,
      description: item.description,
      weight: item.weight,
      isRequired: item.isRequired,
      order: item.order
    }))
  });

  if (automationRules.length) {
    await prisma.jobAutomationRule.createMany({
      data: automationRules.map((rule) => ({
        organizationId: user.organizationId,
        jobId,
        trigger: rule.trigger,
        targetStageId: rule.targetStageId,
        enabled: rule.enabled,
        notes: rule.notes
      }))
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/edit`);

  redirect(`/jobs/${jobId}`);
}
