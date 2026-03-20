import { PageHeader } from "@/components/layout/page-header";
import { EmailTemplateForm } from "@/components/communications/email-template-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/permissions";
import { getEmailTemplates } from "@/lib/communications/queries";
import { isEmailConfigured } from "@/lib/email/transporter";

import { updateEmailTemplate } from "./actions";

export default async function CommunicationsPage() {
  const user = await requirePermission("manage_communications");
  const templates = await getEmailTemplates(user.organizationId);
  const smtpReady = isEmailConfigured();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Communication"
        title="Templates de email prontos para operacao"
        description="Centralize mensagens de recebimento, avanco e reprovacao com linguagem consistente para a experiencia do candidato."
        actions={<Badge variant={smtpReady ? "success" : "warning"}>{smtpReady ? "SMTP configurado" : "SMTP pendente"}</Badge>}
      />

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Biblioteca de templates</CardTitle>
          <CardDescription>
            Edite assunto, versao texto e HTML dos emails do processo seletivo. Variaveis disponiveis: `candidate_name`, `job_title`, `company_name`, `stage_name`.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 xl:grid-cols-3">
          {templates.map((template) => (
            <EmailTemplateForm key={template.id} action={updateEmailTemplate} template={template} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
