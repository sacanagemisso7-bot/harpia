import { CalendarDays, Clock3, UserRound } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth/permissions";
import { listUpcomingPeopleEvents } from "@/modules/people-ops/queries";

import styles from "../../workspace-expansion.module.css";

export default async function PeopleCalendarPage() {
  const user = await requirePermission("view_people_calendar");
  const events = await listUpcomingPeopleEvents(user.organizationId, 24);
  const today = new Date();
  const weekAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thisWeek = events.filter((event) => event.startsAt <= weekAhead).length;
  const employeeLinked = events.filter((event) => event.relatedEmployee).length;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="People calendar"
        title="Eventos e marcos internos"
        description="Onboarding sessions, check-ins, revisoes iniciais, entrevistas de saida e outros marcos operacionais."
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Agenda</span>
          <strong className={styles.statValue}>{events.length}</strong>
          <span className={styles.statHint}>Eventos operacionais puxados para o radar do time.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>7 dias</span>
          <strong className={styles.statValue}>{thisWeek}</strong>
          <span className={styles.statHint}>Marcos que ja pedem preparo imediato.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Com colaborador</span>
          <strong className={styles.statValue}>{employeeLinked}</strong>
          <span className={styles.statHint}>Itens ligados a uma pessoa especifica.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Cadencia</span>
          <strong className={styles.statValue}>Live</strong>
          <span className={styles.statHint}>Visao unica para onboarding, check-ins e marcos internos.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Operational agenda</span>
              <h2 className={styles.panelTitle}>Fila cronologica do time</h2>
              <p className={styles.panelDescription}>Tudo que vai acontecer e exige preparo ou acompanhamento.</p>
            </div>
            {events.length ? (
              <div className={styles.timeline}>
                {events.map((event) => (
                  <div key={event.id} className={styles.timelineItem}>
                    <span className={styles.timelineDot} />
                    <div className={styles.timelineBody}>
                      <div className={styles.itemHeader}>
                        <div className={styles.itemLead}>
                          <strong className={styles.itemTitle}>{event.title}</strong>
                          <span className={styles.itemSubtitle}>
                            {event.relatedEmployee?.fullName ?? "Evento interno"} -{" "}
                            {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(event.startsAt)}
                          </span>
                        </div>
                        <Badge variant="outline">{event.type}</Badge>
                      </div>
                      {event.description ? <span className={styles.itemDescription}>{event.description}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Nenhum evento operacional agendado.</div>
            )}
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.spotlight}>
            <span className={styles.panelEyebrow}>Next event</span>
            <strong className={styles.spotlightValue}>{events[0] ? "Agora" : "--"}</strong>
            <p className={styles.panelDescription}>
              {events[0]
                ? `${events[0].title} em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(events[0].startsAt)}`
                : "Sem marcos imediatos na agenda."}
            </p>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Readout</span>
                <h3 className={styles.panelTitle}>Como usar esta fila</h3>
              </div>
              <span className={styles.iconLead}>
                <CalendarDays className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Prepare owners</strong>
                <span className={styles.itemDescription}>Veja o que vence primeiro e alinhe quem precisa agir.</span>
              </div>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Agrupe por pessoa</strong>
                <span className={styles.itemDescription}>Check-ins, onboarding e saida passam a aparecer no mesmo radar.</span>
              </div>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Antecipe gargalos</strong>
                <span className={styles.itemDescription}>Use a visao de 7 dias para evitar atraso em marcos sensiveis.</span>
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.metricStack}>
              <div className={styles.metricRow}>
                <span>
                  <Clock3 className="mr-2 inline h-4 w-4" />
                  Hoje
                </span>
                <strong>
                  {events.filter((event) => new Intl.DateTimeFormat("pt-BR").format(event.startsAt) === new Intl.DateTimeFormat("pt-BR").format(today)).length}
                </strong>
              </div>
              <div className={styles.metricRow}>
                <span>
                  <UserRound className="mr-2 inline h-4 w-4" />
                  Pessoas ligadas
                </span>
                <strong>{employeeLinked}</strong>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
