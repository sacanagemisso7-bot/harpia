import { JobForm } from "@/components/jobs/job-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/permissions";
import { hasPlanFeature } from "@/lib/billing/features";
import { getPipelineStages } from "@/lib/pipeline/queries";

import { createJob } from "../actions";

export default async function NewJobPage() {
  const user = await requirePermission("manage_jobs");
  const stages = await getPipelineStages(user.organizationId);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Nova vaga</CardTitle>
          <CardDescription>
            Configure a vaga com dados claros e criterios que alimentarao o score do candidato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobForm
            action={createJob}
            stages={stages}
            canUseAutomations={hasPlanFeature(user.organizationBillingPlan, "job_automations")}
            submitLabel="Criar vaga"
          />
        </CardContent>
      </Card>
    </div>
  );
}
