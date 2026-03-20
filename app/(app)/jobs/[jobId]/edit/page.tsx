import { notFound } from "next/navigation";

import { JobForm } from "@/components/jobs/job-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/permissions";
import { hasPlanFeature } from "@/lib/billing/features";
import { getJobById } from "@/lib/jobs/queries";
import { getPipelineStages } from "@/lib/pipeline/queries";

import { updateJob } from "../../actions";

export default async function EditJobPage({
  params
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const user = await requirePermission("manage_jobs");
  const [job, stages] = await Promise.all([getJobById(jobId, user.organizationId), getPipelineStages(user.organizationId)]);

  if (!job) {
    notFound();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar vaga</CardTitle>
        <CardDescription>Atualize o perfil da vaga sem perder a estrutura de criterios.</CardDescription>
      </CardHeader>
      <CardContent>
        <JobForm
          action={updateJob.bind(null, jobId)}
          stages={stages}
          canUseAutomations={hasPlanFeature(user.organizationBillingPlan, "job_automations")}
          submitLabel="Salvar alteracoes"
          defaultValues={{
            title: job.title,
            department: job.department,
            location: job.location,
            employmentType: job.employmentType,
            seniority: job.seniority,
            summary: job.summary,
            description: job.description,
            educationLevel: job.educationLevel,
            minExperienceYears: job.minExperienceYears,
            status: job.status,
            criteria: job.criteria.map((criterion) => ({
              id: criterion.id,
              type: criterion.type,
              label: criterion.label,
              weight: criterion.weight,
              notes: criterion.notes ?? "",
              order: criterion.order
            })),
            scorecardItems: job.scorecardItems.map((item) => ({
              id: item.id,
              label: item.label,
              category: item.category,
              description: item.description ?? "",
              weight: item.weight,
              isRequired: item.isRequired,
              order: item.order
            })),
            automationRules: job.automationRules.map((rule) => ({
              id: rule.id,
              trigger: rule.trigger,
              targetStageId: rule.targetStageId,
              enabled: rule.enabled,
              notes: rule.notes ?? ""
            }))
          }}
        />
      </CardContent>
    </Card>
  );
}
