import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/permissions";
import { getUpcomingInterviews } from "@/lib/interviews/queries";

export default async function InterviewsPage() {
  const user = await requirePermission("view_interviews");
  const interviews = await getUpcomingInterviews(user.organizationId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Interviews"
        title="Agenda de entrevistas"
        description="Visualize os proximos compromissos do pipeline e acesse rapidamente a aplicacao relacionada."
      />

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Proximas entrevistas</CardTitle>
          <CardDescription>Agenda operacional do time de recrutamento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {interviews.length ? (
            interviews.map((interview) => (
              <div
                key={interview.id}
                className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5 transition hover:-translate-y-1 hover:shadow-soft"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={interview.status === "COMPLETED" ? "success" : interview.status === "CANCELLED" ? "destructive" : "outline"}>
                        {interview.status}
                      </Badge>
                      <Badge variant="outline">{interview.application.job.title}</Badge>
                    </div>
                    <div>
                      <p className="font-semibold">{interview.title}</p>
                      <p className="text-sm text-muted-foreground">{interview.application.candidate.fullName}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(interview.startsAt)}
                      {" - "}
                      {new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(interview.endsAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground lg:items-end">
                    <div className="text-left lg:text-right">
                      <p>{interview.location || "Sem local definido"}</p>
                      <p>{interview.scheduledBy.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/applications/${interview.applicationId}`}>Aplicacao</Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/interviews/${interview.id}`}>
                          Abrir
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-border bg-white/75 p-6 text-sm text-muted-foreground">
              Nenhuma entrevista agendada ainda.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
