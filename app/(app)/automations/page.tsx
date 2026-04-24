import Link from "next/link";

import { AutomationDraftForm, WatchtowerRunForm } from "@/components/automations/automation-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import styles from "@/components/operations/ops-workspace.module.css";
import { requirePermission } from "@/lib/auth/permissions";
import { getAutomationStudioData } from "@/modules/automations/queries";

export const metadata = {
  title: "Automa\u00e7\u00f5es | Harpia"
};

const statusLabel: Record<string, string> = {
  CANCELED: "Cancelado",
  COMPLETED: "Conclu\u00eddo",
  DRAFT: "Rascunho",
  FAILED: "Falhou",
  PENDING: "Pendente",
  QUEUED: "Na fila",
  RUNNING: "Rodando"
};

const riskLabel: Record<string, string> = {
  CRITICAL: "Cr\u00edtico",
  HIGH: "Alto",
  LOW: "Baixo",
  MEDIUM: "M\u00e9dio"
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(date);
}

export default async function AutomationsPage() {
  const user = await requirePermission("view_people_command_center");
  const data = await getAutomationStudioData(user.organizationId);

  return (
    <main className={styles.workspaceShell}>
      <section className={styles.workspaceHeader}>
        <div>
          <span className={styles.eyebrow}>{"Automa\u00e7\u00f5es com IA"}</span>
          <h1>Um operador silencioso para a rotina de People.</h1>
          <p>
            {
              "Watchtower monitora risco, SLA e bloqueios. Regras novas entram como rascunhos audit\u00e1veis antes de qualquer a\u00e7\u00e3o sens\u00edvel."
            }
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button asChild variant="outline">
            <Link href="/people/agent-approvals">{"Revisar aprova\u00e7\u00f5es"}</Link>
          </Button>
          <Button asChild>
            <Link href="/chat?prompt=Quais%20automacoes%20de%20People%20Ops%20voce%20recomenda%20ativar%20agora%3F">
              Planejar com IA
            </Link>
          </Button>
        </div>
      </section>

      <section className={styles.metricStrip}>
        <div>
          <span>Riscos ativos</span>
          <strong>{data.openWatchtowerTasks}</strong>
        </div>
        <div>
          <span>{"Aprova\u00e7\u00f5es pendentes"}</span>
          <strong>{data.pendingApprovals}</strong>
        </div>
        <div>
          <span>Runs recentes</span>
          <strong>{data.runs.length}</strong>
        </div>
        <div>
          <span>Jobs monitorados</span>
          <strong>{data.jobs.length}</strong>
        </div>
      </section>

      <section className={styles.detailGrid}>
        <article className={styles.detailMain}>
          <div className={styles.contextAssistant}>
            <div className={styles.assistantHeader}>
              <div>
                <span className={styles.eyebrow}>Watchtower</span>
                <h2>Varredura operacional</h2>
              </div>
              <Badge variant="outline">{"Produ\u00e7\u00e3o"}</Badge>
            </div>
            <p>
              {
                "Analisa solicita\u00e7\u00f5es, tarefas, onboarding, compliance e sinais de risco. Quando encontra algo acion\u00e1vel, cria trabalho rastre\u00e1vel em vez de executar mudan\u00e7as escondidas."
              }
            </p>
            <WatchtowerRunForm />
          </div>

          <div className={styles.assistedCreateBox}>
            <div className={styles.assistantHeader}>
              <div>
                <span className={styles.eyebrow}>Criar regra</span>
                <h2>{"Descreva a automa\u00e7\u00e3o em linguagem natural."}</h2>
              </div>
              <Badge>{"Pr\u00e9via obrigat\u00f3ria"}</Badge>
            </div>
            <AutomationDraftForm />
          </div>
        </article>

        <aside className={styles.detailAside}>
          <div className={styles.approvalCardPremium}>
            <span className={styles.eyebrow}>{"Camada de confian\u00e7a"}</span>
            <h2>{"IA n\u00e3o pula governan\u00e7a."}</h2>
            <ul className={styles.cleanList}>
              <li>Mostra o que viu antes de agir.</li>
              <li>{"Explica por que sugeriu a a\u00e7\u00e3o."}</li>
              <li>{"Bloqueia mudan\u00e7as sens\u00edveis at\u00e9 aprova\u00e7\u00e3o."}</li>
              <li>{"Mant\u00e9m trilha de auditoria por tenant."}</li>
            </ul>
          </div>
        </aside>
      </section>

      <section className={styles.splitWorkspace}>
        <div className={styles.workspacePane}>
          <div className={styles.paneHeader}>
            <div>
              <span className={styles.eyebrow}>Runs</span>
              <h2>{"Decis\u00f5es recentes"}</h2>
            </div>
          </div>
          <div className={styles.listStack}>
            {data.runs.length ? (
              data.runs.map((run) => (
                <article key={run.id} className={styles.flatListItem}>
                  <div>
                    <div className={styles.itemTitle}>{run.summary ?? run.actionType}</div>
                    <p>
                      {run.startedByUser?.name ?? run.startedByUser?.email ?? "Sistema"} {"\u00b7"} {formatDate(run.createdAt)}
                    </p>
                  </div>
                  <div className={styles.itemMeta}>
                    <Badge variant="outline">{statusLabel[run.status] ?? run.status}</Badge>
                    <Badge>{riskLabel[run.riskLevel] ?? run.riskLevel}</Badge>
                  </div>
                </article>
              ))
            ) : (
              <div className={styles.emptyState}>
                <h2>{"Nenhuma automa\u00e7\u00e3o registrada ainda."}</h2>
                <p>Rode o Watchtower ou crie uma regra assistida para iniciar a trilha operacional.</p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.workspacePane}>
          <div className={styles.paneHeader}>
            <div>
              <span className={styles.eyebrow}>Fila</span>
              <h2>{"Execu\u00e7\u00e3o em segundo plano"}</h2>
            </div>
          </div>
          <div className={styles.listStack}>
            {data.jobs.length ? (
              data.jobs.map((job) => (
                <article key={job.id} className={styles.flatListItem}>
                  <div>
                    <div className={styles.itemTitle}>{job.type.replaceAll("_", " ").toLowerCase()}</div>
                    <p>
                      {formatDate(job.createdAt)} {"\u00b7"} tentativas {job.attempts}
                    </p>
                  </div>
                  <Badge variant="outline">{statusLabel[job.status] ?? job.status}</Badge>
                </article>
              ))
            ) : (
              <div className={styles.emptyState}>
                <h2>Fila limpa.</h2>
                <p>{"Nenhum job de automa\u00e7\u00e3o aguardando execu\u00e7\u00e3o agora."}</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
