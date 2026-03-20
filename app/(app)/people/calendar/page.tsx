import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/permissions";
import { listUpcomingPeopleEvents } from "@/modules/people-ops/queries";

export default async function PeopleCalendarPage() {
  const user = await requirePermission("view_people_calendar");
  const events = await listUpcomingPeopleEvents(user.organizationId, 24);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People calendar"
        title="Eventos e marcos internos"
        description="Onboarding sessions, check-ins, revisoes iniciais, entrevistas de saida e outros marcos operacionais."
      />

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Agenda operacional</CardTitle>
          <CardDescription>Eventos ligados a colaboradores e fluxos internos da empresa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {events.length ? (
            events.map((event) => (
              <div key={event.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {event.relatedEmployee?.fullName ?? "Evento interno"} -{" "}
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(event.startsAt)}
                    </p>
                    {event.description ? <p className="mt-2 text-sm text-muted-foreground">{event.description}</p> : null}
                  </div>
                  <Badge variant="outline">{event.type}</Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
              Nenhum evento operacional agendado.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
