import { notFound } from "next/navigation";

import { PublicApplicationForm } from "@/components/careers/public-application-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCareersJob } from "@/lib/careers/queries";

import { submitPublicApplication } from "./actions";

export default async function CareersJobPage({
  params
}: {
  params: Promise<{ slug: string; jobId: string }>;
}) {
  const { slug, jobId } = await params;
  const job = await getCareersJob(slug, jobId);

  if (!job) {
    notFound();
  }

  return (
    <main className="min-h-screen px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="panel aurora px-8 py-10">
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">{job.department}</Badge>
            <Badge variant="outline">{job.location}</Badge>
            <Badge variant="outline">{job.seniority}</Badge>
          </div>
          <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight">{job.title}</h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{job.summary}</p>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Sobre a vaga</CardTitle>
              <CardDescription>{job.organization.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{job.description}</p>
              <div className="grid gap-4">
                {job.criteria.map((criterion) => (
                  <div key={criterion.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{criterion.label}</p>
                      <Badge variant={criterion.type === "MUST_HAVE" ? "success" : "outline"}>
                        {criterion.type === "MUST_HAVE" ? "Obrigatorio" : "Desejavel"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{criterion.notes || "Sem observacoes adicionais."}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Candidatar-se</CardTitle>
              <CardDescription>Preencha seus dados e envie seu currículo para entrar no processo.</CardDescription>
            </CardHeader>
            <CardContent>
              <PublicApplicationForm action={submitPublicApplication.bind(null, slug, job.id)} />
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
