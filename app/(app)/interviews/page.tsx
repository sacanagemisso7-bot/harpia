import Link from "next/link";
import { ArrowRight } from "lucide-react";

import styles from "../workspace-expansion.module.css";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { getUpcomingInterviews } from "@/lib/interviews/queries";

function isWithinHours(date: Date, hours: number) {
  return date.getTime() - Date.now() <= hours * 60 * 60 * 1000;
}

export default async function InterviewsPage() {
  const user = await requirePermission("view_interviews");
  const interviews = await getUpcomingInterviews(user.organizationId);

  const next24h = interviews.filter((interview) => isWithinHours(interview.startsAt, 24)).length;
  const uniqueJobs = new Set(interviews.map((interview) => interview.application.job.title)).size;
  const uniqueHosts = new Set(interviews.map((interview) => interview.scheduledBy.name)).size;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Interviews"
        title="Agenda de entrevistas"
        description="Compromissos do pipeline, candidatos e entrevistadores em uma agenda operacional mais clara."
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Agendadas</span>
          <strong className={styles.statValue}>{interviews.length}</strong>
          <p className={styles.statHint}>Compromissos futuros encontrados</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Próximas 24h</span>
          <strong className={styles.statValue}>{next24h}</strong>
          <p className={styles.statHint}>Itens que pedem aten??o mais imediata</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Vagas</span>
          <strong className={styles.statValue}>{uniqueJobs}</strong>
          <p className={styles.statHint}>Requisi??es representadas na agenda</p>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Hosts</span>
          <strong className={styles.statValue}>{uniqueHosts}</strong>
          <p className={styles.statHint}>Pessoas marcando entrevistas</p>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.column}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Agenda</span>
              <h2 className={styles.panelTitle}>Próximas entrevistas</h2>
              <p className={styles.panelDescription}>Veja status, vaga, candidato, horario e atalhos diretos para aplicação e entrevista.</p>
            </div>

            <div className={styles.list}>
              {interviews.length ? (
                interviews.map((interview) => (
                  <div key={interview.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{interview.title}</strong>
                        <span className={styles.itemSubtitle}>{interview.application.candidate.fullName}</span>
                      </div>
                      <div className={styles.actionRow}>
                        <Badge
                          variant={interview.status === "COMPLETED" ? "success" : interview.status === "CANCELLED" ? "destructive" : "outline"}
                        >
                          {interview.status}
                        </Badge>
                        <Badge variant="outline">{interview.application.job.title}</Badge>
                      </div>
                    </div>

                    <p className={styles.itemDescription}>
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(interview.startsAt)} •{" "}
                      {new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(interview.endsAt)}
                    </p>
                    <p className={styles.itemMeta}>
                      {interview.location || "Sem local definido"} • {interview.scheduledBy.name}
                    </p>

                    <div className={styles.actionRow}>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/applications/${interview.applicationId}`}>Aplicação</Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/interviews/${interview.id}`}>
                          Abrir
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>Nenhuma entrevista agendada ainda.</div>
              )}
            </div>
          </section>
        </div>

        <aside className={styles.column}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Proximidade</span>
              <h2 className={styles.panelTitle}>O que vem primeiro</h2>
              <p className={styles.panelDescription}>Compromissos mais próximos para o time se preparar antes da agenda apertar.</p>
            </div>

            <div className={styles.list}>
              {interviews.length ? (
                interviews.slice(0, 4).map((interview) => (
                  <div key={interview.id} className={styles.listItem}>
                    <strong className={styles.itemTitle}>{interview.application.candidate.fullName}</strong>
                    <p className={styles.itemDescription}>{interview.application.job.title}</p>
                    <span className={styles.itemMeta}>
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(interview.startsAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>Sem entrevistas próximas para destacar.</div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
