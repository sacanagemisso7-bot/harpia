import Link from "next/link";
import type { Route } from "next";
import { BarChart3, BriefcaseBusiness, CalendarClock, Rows3, UsersRound } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/permissions";

const modules = [
  {
    href: "/jobs",
    title: "Vagas",
    description: "Gestao de requisicoes, scorecards e operacao do pipeline de contratacao.",
    icon: BriefcaseBusiness
  },
  {
    href: "/candidates",
    title: "Candidatos",
    description: "Banco de talentos, parsing de curriculos e enriquecimento de perfil.",
    icon: UsersRound
  },
  {
    href: "/pipeline",
    title: "Pipeline",
    description: "Movimentacao do funil, score, historico e visao operacional.",
    icon: Rows3
  },
  {
    href: "/interviews",
    title: "Entrevistas",
    description: "Agenda, scorecards, feedbacks e coordenacao de entrevistas.",
    icon: CalendarClock
  },
  {
    href: "/analytics",
    title: "Analytics",
    description: "Leitura de volume, score, SLA e desempenho do modulo de hiring.",
    icon: BarChart3
  }
] satisfies Array<{
  href: Route;
  title: string;
  description: string;
  icon: typeof BriefcaseBusiness;
}>;

export default async function HiringHubPage() {
  await requirePermission("view_people_command_center");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Hiring module"
        title="Recrutamento como modulo complementar"
        description="O modulo de hiring continua forte dentro da plataforma, mas agora atua conectado ao sistema operacional interno de pessoas e processos."
      />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <Link key={module.href} href={module.href}>
              <Card className="panel-hover h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle>{module.title}</CardTitle>
                      <CardDescription>{module.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm font-semibold text-primary">Abrir modulo</CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
