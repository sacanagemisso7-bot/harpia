import { EmailTemplateType } from "@prisma/client";

import { env } from "@/lib/env";
import { getEmailTransporter } from "@/lib/email/transporter";
import { renderTemplate } from "@/lib/email/templates";

type SendTemplatedEmailInput = {
  to: string;
  template: {
    type: EmailTemplateType;
    subject: string;
    bodyHtml: string;
    bodyText: string;
  };
  variables: Record<string, string>;
};

export async function sendTemplatedEmail(input: SendTemplatedEmailInput) {
  const transporter = getEmailTransporter();

  const subject = renderTemplate(input.template.subject, input.variables);
  const html = renderTemplate(input.template.bodyHtml, input.variables);
  const text = renderTemplate(input.template.bodyText, input.variables);

  return transporter.sendMail({
    from: env.EMAIL_FROM,
    to: input.to,
    subject,
    html,
    text
  });
}
