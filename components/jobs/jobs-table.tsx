import Link from "next/link";
import { JobStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type JobsTableProps = {
  jobs: Array<{
    id: string;
    title: string;
    department: string;
    location: string;
    seniority: string;
    status: JobStatus;
    _count: {
      applications: number;
    };
  }>;
};

const statusVariant: Record<JobStatus, "default" | "success" | "warning" | "outline"> = {
  DRAFT: "outline",
  OPEN: "success",
  ON_HOLD: "warning",
  CLOSED: "default"
};

const statusLabel: Record<JobStatus, string> = {
  DRAFT: "Rascunho",
  OPEN: "Aberta",
  ON_HOLD: "Em espera",
  CLOSED: "Encerrada"
};

export function JobsTable({ jobs }: JobsTableProps) {
  if (!jobs.length) {
    return (
      <Card>
        <CardContent className="flex min-h-60 flex-col items-center justify-center gap-3 p-10 text-center">
          <div className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-secondary-foreground">
            Empty state
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-2xl font-semibold">Nenhuma vaga criada ainda</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Crie a primeira vaga para começar a estruturar criterios, pipeline e ranking de candidatos.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Vaga</th>
                <th className="px-6 py-4 font-medium">Senioridade</th>
                <th className="px-6 py-4 font-medium">Local</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Candidaturas</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-border/70 transition hover:bg-secondary/20">
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <Link href={`/jobs/${job.id}`} className="font-semibold text-foreground hover:text-primary">
                        {job.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">{job.department}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-muted-foreground">{job.seniority}</td>
                  <td className="px-6 py-5 text-muted-foreground">{job.location}</td>
                  <td className="px-6 py-5">
                    <Badge variant={statusVariant[job.status]}>{statusLabel[job.status]}</Badge>
                  </td>
                  <td className="px-6 py-5 text-muted-foreground">{job._count.applications}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
