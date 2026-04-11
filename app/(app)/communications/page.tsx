import { PageHeader } from "@/components/layout/page-header";
import { EmailTemplateForm } from "@/components/communications/email-template-form";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth/permissions";
import { getEmailTemplates } from "@/lib/communications/queries";
import { isEmailConfigured } from "@/lib/email/transporter";

import styles from "../workspace-expansion.module.css";
import { updateEmailTemplate } from "./actions";

export default async function CommunicationsPage() {
  const user = await requirePermission("manage_communications");
  const templates = await getEmailTemplates(user.organizationId);
  const smtpReady = isEmailConfigured();

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Communication"
        title="Templates de email prontos para operação"
        description="Mensagens de recebimento, avanco e reprovacao numa biblioteca simples de manter."
        actions={<Badge variant={smtpReady ? "success" : "warning"}>{smtpReady ? "SMTP configurado" : "SMTP pendente"}</Badge>}
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Templates</span>
          <strong className={styles.statValue}>{templates.length}</strong>
          <span className={styles.statHint}>Modelos ativos para a experiência do candidato.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>SMTP</span>
          <strong className={styles.statValue}>{smtpReady ? "On" : "Off"}</strong>
          <span className={styles.statHint}>Envio operacional depende desta configuração.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Variaveis</span>
          <strong className={styles.statValue}>4</strong>
          <span className={styles.statHint}>`candidate_name`, `job_title`, `company_name`, `stage_name`.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Modo</span>
          <strong className={styles.statValue}>Editable</strong>
          <span className={styles.statHint}>Assunto, texto e HTML no mesmo lugar.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Template library</span>
              <h2 className={styles.panelTitle}>Biblioteca operacional</h2>
              <p className={styles.panelDescription}>Edite assunto, versao texto e HTML dos emails do processo seletivo.</p>
            </div>
            <div className={styles.subGrid3}>
              {templates.map((template) => (
                <EmailTemplateForm key={template.id} action={updateEmailTemplate} template={template} />
              ))}
            </div>
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.spotlight}>
            <span className={styles.panelEyebrow}>Delivery</span>
            <strong className={styles.spotlightValue}>{smtpReady ? "Ready" : "Setup"}</strong>
            <p className={styles.panelDescription}>A camada de envio esta {smtpReady ? "pronta para operar" : "pendente de configuração SMTP"}.</p>
          </div>

          <div className={styles.panel}>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Mantenha o assunto curto</strong>
                <span className={styles.itemDescription}>Melhora clareza e evita tom excessivamente automatico.</span>
              </div>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Texto e HTML alinhados</strong>
                <span className={styles.itemDescription}>Garanta que a mensagem sobreviva bem a qualquer cliente de email.</span>
              </div>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Tono consistente</strong>
                <span className={styles.itemDescription}>A experiência do candidato deve soar igual em todas as etapas.</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
