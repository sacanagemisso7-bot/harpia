import { Badge } from "@/components/ui/badge";
import { EmailTemplateForm } from "@/components/communications/email-template-form";
import { requirePermission } from "@/lib/auth/permissions";
import { getEmailTemplates } from "@/lib/communications/queries";
import { isEmailConfigured } from "@/lib/email/transporter";

import styles from "@/components/operations/ops-workspace.module.css";
import { updateEmailTemplate } from "./actions";

function formatTemplateType(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function CommunicationsPage() {
  const user = await requirePermission("manage_communications");
  const templates = await getEmailTemplates(user.organizationId);
  const smtpReady = isEmailConfigured();

  const stats = [
    { label: "Templates", value: templates.length },
    { label: "SMTP", value: smtpReady ? "On" : "Off" },
    { label: "Variáveis", value: 4 },
    { label: "Modo", value: "Editável" }
  ];

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Communications</span>
        <h2 className={styles.title}>Comunicações</h2>
        <p className={styles.description}>
          Biblioteca de e-mails operacionais em um fluxo mais limpo para revisar assunto, conteúdo e prontidão de entrega.
        </p>
      </div>

      <div className={styles.statRow}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statPill}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarMeta}>
          <span className={styles.shortcutHint}>Mensagens de recebimento, avanço e reprovação em um lugar só, sem excesso de camadas.</span>
        </div>
        <Badge variant={smtpReady ? "success" : "warning"}>{smtpReady ? "SMTP configurado" : "SMTP pendente"}</Badge>
      </div>

      <div className={styles.body}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <div>
                <h3 className={styles.panelTitle}>Biblioteca atual</h3>
                <p className={styles.panelDescription}>Leitura rápida do que existe hoje e do tom operacional de cada template.</p>
              </div>
            </div>
          </div>

          <div className={styles.list}>
            {templates.length ? (
              templates.map((template) => (
                <div key={template.id} className={styles.row}>
                  <div className={styles.rowTop}>
                    <div className={styles.rowLead}>
                      <p className={styles.rowTitle}>{template.name}</p>
                      <p className={styles.rowSubtitle}>{formatTemplateType(template.type)}</p>
                    </div>
                    <Badge variant="outline">{template.subject.length} chars</Badge>
                  </div>
                  <p className={styles.detailText}>{template.subject}</p>
                  <p className={styles.detailText}>
                    {template.bodyText.slice(0, 180)}
                    {template.bodyText.length > 180 ? "..." : ""}
                  </p>
                </div>
              ))
            ) : (
              <div className={styles.emptyWrap}>
                <p className={styles.emptyState}>Ainda não há templates configurados neste workspace.</p>
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Prontidão de entrega</h3>
            </div>

            <div className={styles.sectionStack}>
              <div className={styles.detailCell}>
                <div className={styles.sectionHeader}>
                  <span className={styles.metaValue}>Camada de envio</span>
                  <Badge variant={smtpReady ? "success" : "warning"}>{smtpReady ? "Pronta" : "Pendente"}</Badge>
                </div>
                <p className={styles.detailText}>
                  {smtpReady
                    ? "A infraestrutura de envio está pronta para operar."
                    : "Configure SMTP para que os templates possam sair de forma confiável."}
                </p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>Variáveis suportadas</span>
                <p className={styles.detailText}>candidate_name, job_title, company_name e stage_name.</p>
              </div>
            </div>
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Boas práticas</h3>
              <p className={styles.panelDescription}>Ajustes pequenos que deixam a comunicação mais clara e menos robótica.</p>
            </div>

            <div className={styles.sectionStack}>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>Assunto curto</span>
                <p className={styles.detailText}>Ajuda o candidato a entender rápido o contexto do contato.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>Texto e HTML alinhados</span>
                <p className={styles.detailText}>Garante boa leitura em qualquer cliente de e-mail.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>Tom consistente</span>
                <p className={styles.detailText}>A experiência do candidato precisa soar coesa do início ao fim.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <section className={styles.listPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderRow}>
            <div>
              <h3 className={styles.panelTitle}>Editar templates</h3>
              <p className={styles.panelDescription}>Assunto, texto e HTML no mesmo fluxo, sem telas separadas.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-2">
          {templates.map((template) => (
            <EmailTemplateForm key={template.id} action={updateEmailTemplate} template={template} />
          ))}
        </div>
      </section>
    </div>
  );
}
