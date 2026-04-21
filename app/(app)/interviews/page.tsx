import Link from "next/link";
import { ArrowRight, CalendarClock, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { getUpcomingInterviews } from "@/lib/interviews/queries";

import styles from "@/components/operations/ops-workspace.module.css";

function isWithinHours(date: Date, hours: number) {
  return date.getTime() - Date.now() <= hours * 60 * 60 * 1000;
}

function formatDateRange(startsAt: Date, endsAt: Date) {
  const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(startsAt);
  const end = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(endsAt);
  return `${date} · ${end}`;
}

export default async function InterviewsPage() {
  const user = await requirePermission("view_interviews");
  const interviews = await getUpcomingInterviews(user.organizationId);

  const next24h = interviews.filter((interview) => isWithinHours(interview.startsAt, 24)).length;
  const next72h = interviews.filter((interview) => isWithinHours(interview.startsAt, 72)).length;
  const uniqueJobs = new Set(interviews.map((interview) => interview.application.job.title)).size;
  const uniqueHosts = new Set(interviews.map((interview) => interview.scheduledBy.name)).size;

  const hostLoad = Array.from(
    interviews.reduce<Map<string, { name: string; count: number }>>((map, interview) => {
      const key = interview.scheduledBy.email;
      const current = map.get(key) ?? { name: interview.scheduledBy.name, count: 0 };
      current.count += 1;
      map.set(key, current);
      return map;
    }, new Map()).values()
  )
    .sort((left, right) => right.count - left.count)
    .slice(0, 4);

  const stats = [
    { label: "Agendadas", value: interviews.length },
    { label: "Próximas 24h", value: next24h },
    { label: "Próximas 72h", value: next72h },
    { label: "Responsáveis", value: uniqueHosts }
  ];

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Entrevistas</span>
        <h2 className={styles.title}>Agenda de entrevistas</h2>
        <p className={styles.description}>
          Uma agenda operacional clara para o time enxergar o que vem agora, quem conduz e onde a preparação precisa acontecer.
        </p>
      </div>

      <div className={styles.statRow}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statPill}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
        <div className={styles.statPill}>
          <strong>{uniqueJobs}</strong>
          <span>Vagas representadas</span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarMeta}>
          <div className={styles.tabs}>
            <Button asChild variant="outline" size="sm">
              <Link href="/pipeline">Abrir pipeline</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/candidates">Ver candidatos</Link>
            </Button>
          </div>
          <span className={styles.shortcutHint}>A ideia aqui é abrir a agenda e agir rápido, sem navegar por várias telas intermediárias.</span>
        </div>
      </div>

      <div className={styles.workflowGuide}>
        <span>
          <strong>1.</strong> Veja o próximo horário
        </span>
        <span>
          <strong>2.</strong> Abra a aplicação
        </span>
        <span>
          <strong>3.</strong> Registre o feedback
        </span>
      </div>

      <div className={styles.body}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <div>
                <h3 className={styles.panelTitle}>Próximas entrevistas</h3>
                <p className={styles.panelDescription}>Candidato, vaga, horário e atalhos diretos para abrir a entrevista ou a aplicação.</p>
              </div>
            </div>
          </div>

          <div className={styles.list}>
            {interviews.length ? (
              interviews.map((interview) => (
                <div key={interview.id} className={styles.row}>
                  <div className={styles.rowTop}>
                    <div className={styles.rowLead}>
                      <p className={styles.rowTitle}>{interview.title}</p>
                      <p className={styles.rowSubtitle}>
                        {interview.application.candidate.fullName} · {interview.application.job.title}
                      </p>
                    </div>
                    <Badge variant="outline">Agendada</Badge>
                  </div>

                  <div className={styles.rowMeta}>
                    <span className={styles.metaValue}>{formatDateRange(interview.startsAt, interview.endsAt)}</span>
                    <span className={styles.metaValue}>{interview.location || "Sem local definido"}</span>
                  </div>

                  <div className={styles.rowMeta}>
                    <span className={styles.metaLabel}>Responsável</span>
                    <span className={styles.metaValue}>{interview.scheduledBy.name}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/applications/${interview.applicationId}`}>Abrir aplicação</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/interviews/${interview.id}`}>
                        Abrir entrevista
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyWrap}>
                <div className={styles.sectionStack}>
                  <p className={styles.emptyTitle}>Nenhuma entrevista agendada.</p>
                  <p className={styles.emptyState}>Quando uma entrevista for marcada, ela aparece aqui com horário, candidato e atalhos.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Próximas 72 horas</h3>
            </div>

            <div className={styles.sectionStack}>
              {interviews.slice(0, 4).length ? (
                interviews.slice(0, 4).map((interview) => (
                  <div key={`next-${interview.id}`} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>
                        <CalendarClock className="mr-2 inline h-4 w-4" />
                        {interview.application.candidate.fullName}
                      </span>
                    </div>
                    <p className={styles.detailText}>{interview.application.job.title}</p>
                    <p className={styles.detailText}>{formatDateRange(interview.startsAt, interview.endsAt)}</p>
                  </div>
                ))
              ) : (
                <p className={styles.emptyState}>Sem compromissos próximos para destacar.</p>
              )}
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Agenda por responsável</h3>
            </div>

            <div className={styles.sectionStack}>
              {hostLoad.length ? (
                hostLoad.map((host) => (
                  <div key={host.name} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>
                        <UserRound className="mr-2 inline h-4 w-4" />
                        {host.name}
                      </span>
                      <Badge variant="outline">{host.count}</Badge>
                    </div>
                    <p className={styles.detailText}>Entrevista(s) sob coordenação deste host.</p>
                  </div>
                ))
              ) : (
                <p className={styles.emptyState}>Ainda não há distribuição suficiente para destacar hosts.</p>
              )}
            </div>
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Atalhos úteis</h3>
              <p className={styles.panelDescription}>Entre na parte certa do fluxo sem voltar para hubs antigos.</p>
            </div>

            <div className={styles.sectionStack}>
              <Link href="/pipeline" className={styles.detailCell}>
                <span className={styles.metaValue}>Pipeline</span>
                <p className={styles.detailText}>Continue a fila ativa do processo seletivo.</p>
              </Link>
              <Link href="/jobs" className={styles.detailCell}>
                <span className={styles.metaValue}>Vagas</span>
                <p className={styles.detailText}>Abra a configuração e o contexto das requisições em andamento.</p>
              </Link>
              <Link href="/candidates" className={styles.detailCell}>
                <span className={styles.metaValue}>Candidatos</span>
                <p className={styles.detailText}>Revise perfis, histórico e origem do volume.</p>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
