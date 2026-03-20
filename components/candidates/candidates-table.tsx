import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type CandidatesTableProps = {
  candidates: Array<{
    id: string;
    fullName: string;
    email: string | null;
    currentTitle: string | null;
    location: string | null;
    source: string;
    _count: {
      applications: number;
      resumes: number;
    };
  }>;
};

export function CandidatesTable({ candidates }: CandidatesTableProps) {
  if (!candidates.length) {
    return (
      <Card>
        <CardContent className="flex min-h-60 flex-col items-center justify-center gap-3 p-10 text-center">
          <div className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-secondary-foreground">
            Talent pool
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-2xl font-semibold">Nenhum candidato ainda</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Cadastre perfis e suba curriculos em PDF para comecar a consolidar a base de talentos.
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
                <th className="px-6 py-4 font-medium">Candidato</th>
                <th className="px-6 py-4 font-medium">Cargo atual</th>
                <th className="px-6 py-4 font-medium">Origem</th>
                <th className="px-6 py-4 font-medium">Curriculos</th>
                <th className="px-6 py-4 font-medium">Aplicacoes</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="border-t border-border/70 transition hover:bg-secondary/20">
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <Link href={`/candidates/${candidate.id}`} className="font-semibold hover:text-primary">
                        {candidate.fullName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {candidate.email || candidate.location || "Sem email informado"}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-muted-foreground">{candidate.currentTitle || "--"}</td>
                  <td className="px-6 py-5">
                    <Badge variant="outline">{candidate.source}</Badge>
                  </td>
                  <td className="px-6 py-5 text-muted-foreground">{candidate._count.resumes}</td>
                  <td className="px-6 py-5 text-muted-foreground">{candidate._count.applications}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
