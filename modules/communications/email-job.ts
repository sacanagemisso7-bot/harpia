import { BackgroundJobStatus, type BackgroundJob } from "@prisma/client";

import { sendTemplatedEmail } from "@/lib/email/send";
import { prisma } from "@/lib/prisma/client";

export async function processEmailDeliveryJob(job: BackgroundJob) {
  const payload = job.payload as {
    templateId: string;
    to: string;
    variables: Record<string, string>;
    applicationId?: string;
  };

  const template = await prisma.emailTemplate.findFirst({
    where: {
      id: payload.templateId,
      organizationId: job.organizationId
    }
  });

  if (!template) {
    return {
      status: BackgroundJobStatus.FAILED,
      error: "Email template not found."
    };
  }

  await sendTemplatedEmail({
    to: payload.to,
    template,
    variables: payload.variables
  });

  return {
    status: BackgroundJobStatus.SUCCEEDED,
    summary: `Email sent to ${payload.to}.`
  };
}
