import { CalendarDays, Clock3, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth/permissions";
import { listUpcomingPeopleEvents } from "@/modules/people-ops/queries";

import styles from "@/components/operations/ops-workspace.module.css";

export default async function PeopleCalendarPage() {
  const user = await requirePermission("view_people_calendar");
  const events = await listUpcomingPeopleEvents(user.organizationId, 24);
  const today = new Date();
  const weekAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thisWeek = events.filter((event) => event.startsAt <= weekAhead).length;
  const employeeLinked = events.filter((event) => event.relatedEmployee).length;
  const todayCount = events.filter(
    (event) => new Intl.DateTimeFormat("pt-BR").format(event.startsAt) === new Intl.DateTimeFormat("pt-BR").format(today)
  ).length;

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Agenda</span>
        <h2 className={styles.title}>People calendar</h2>
        <p className={styles.description}>
          Onboarding sessions, check-ins, revisões iniciais, saídas e outros marcos operacionais em uma fila simples de ler.
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statPill}>
          <strong>{events.length}</strong>
          <span>eventos mapeados</span>
        </div>
        <div className={styles.statPill}>
          <strong>{thisWeek}</strong>
          <span>próximos 7 dias</span>
        </div>
        <div className={styles.statPill}>
          <strong>{employeeLinked}</strong>
          <span>ligados a colaboradores</span>
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <div>
                <h3 className={styles.panelTitle}>Fila cronológica</h3>
                <p className={styles.panelDescription}>Tudo que vai acontecer e exige preparo do time.</p>
              </div>
            </div>
          </div>

          <div className={styles.list}>
            {events.length ? (
              events.map((event) => (
                <div key={event.id} className={styles.row}>
                  <div className={styles.rowTop}>
                    <div className={styles.rowLead}>
                      <p className={styles.rowTitle}>{event.title}</p>
                      <p className={styles.rowSubtitle}>
                        {event.relatedEmployee?.fullName ?? "Evento interno"} ·{" "}
                        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(event.startsAt)}
                      </p>
                    </div>
                    <Badge variant="outline">{event.type}</Badge>
                  </div>
                  {event.description ? <p className={styles.rowSubtitle}>{event.description}</p> : null}
                </div>
              ))
            ) : (
              <div className={styles.emptyWrap}>
                <p className={styles.emptyState}>Nenhum evento operacional agendado.</p>
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Próximo marco</h3>
            </div>

            <div className={styles.sectionStack}>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>
                  <CalendarDays className="mr-2 inline h-4 w-4" />
                  {events[0] ? events[0].title : "Sem próximos eventos"}
                </span>
                <p className={styles.detailText}>
                  {events[0]
                    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(events[0].startsAt)
                    : "Sem marcos imediatos na agenda."}
                </p>
              </div>
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Como usar esta fila</h3>
            </div>

            <div className={styles.sectionStack}>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>
                  <Clock3 className="mr-2 inline h-4 w-4" />
                  Hoje
                </span>
                <p className={styles.detailText}>{todayCount} evento(s) marcado(s) para hoje.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>
                  <UserRound className="mr-2 inline h-4 w-4" />
                  Pessoas ligadas
                </span>
                <p className={styles.detailText}>{employeeLinked} evento(s) ligados a uma pessoa específica.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>Melhor uso</span>
                <p className={styles.detailText}>Antecipe owners, materiais e follow-ups dos próximos sete dias.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
