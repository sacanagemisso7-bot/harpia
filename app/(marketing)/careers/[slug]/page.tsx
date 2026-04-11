import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCareersJobs, getCareersOrganization } from "@/lib/careers/queries";

export default async function CareersPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [organization, jobs] = await Promise.all([
    getCareersOrganization(slug),
    getCareersJobs(slug)
  ]);

  if (!organization) {
    notFound();
  }

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="panel aurora px-8 py-10">
          <p className="section-intro">{organization.name}</p>
          <h1 className="mt-4 max-w-4xl font-display text-5xl font-semibold tracking-tight">
            Oportunidades abertas para construir a próxima geracao do time.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Explore as vagas e candidate-se em poucos minutos. Sua candidatura entra direto no fluxo operacional do Harpia.
          </p>
        </section>

        <section className="grid gap-5">
          {jobs.length ? (
            jobs.map((job) => (
              <Card key={job.id} className="panel-hover">
                <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="success">{job.department}</Badge>
                      <Badge variant="outline">{job.location}</Badge>
                      <Badge variant="outline">{job.seniority}</Badge>
                    </div>
                    <div>
                      <h2 className="font-display text-2xl font-semibold">{job.title}</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{job.summary}</p>
                    </div>
                  </div>
                  <Button asChild>
                    <Link href={`/careers/${slug}/jobs/${job.id}`}>
                      Ver vaga
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                Nenhuma vaga aberta no momento.
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
