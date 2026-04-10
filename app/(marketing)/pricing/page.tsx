import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleGauge, ShieldCheck } from "lucide-react";

import { SiteChrome } from "@/components/marketing/site-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { brand, brandPaths, formatBrandTitle } from "@/lib/brand";

export const metadata: Metadata = {
  title: formatBrandTitle("Planos"),
  description: `Planos do ${brand.name} para equipes que precisam operar recrutamento e people ops com mais clareza, consistencia e controle.`
};

const plans = [
  {
    name: "Starter",
    price: "R$ 499",
    cadence: "/mes",
    annualPrice: "R$ 4.990/ano",
    description: "Para equipes que precisam sair do improviso e consolidar uma base operacional seria.",
    badge: "Entrada",
    features: [
      "Ate 3 vagas ativas",
      "Ate 250 candidatos",
      "Triagem estruturada e consolidacao de perfil",
      "Pipeline, entrevistas e templates de email",
      "2 membros do time"
    ],
    limitations: ["Sem automacoes avancadas", "Sem onboarding dedicado"]
  },
  {
    name: "Growth",
    price: "R$ 1.290",
    cadence: "/mes",
    annualPrice: "R$ 12.900/ano",
    description: "Para operacoes com mais volume, mais participantes e necessidade de visibilidade constante.",
    badge: "Mais escolhido",
    highlight: true,
    features: [
      "Ate 12 vagas ativas",
      "Ate 2.500 candidatos",
      "Automacoes por vaga e scorecards",
      "Analytics, SLA e produtividade",
      "8 membros do time",
      "SMTP e storage configuraveis"
    ],
    limitations: ["Implantacao leve", "Sem SLA contratual formal"]
  },
  {
    name: "Business",
    price: "Sob consulta",
    cadence: "",
    annualPrice: "Sob consulta anual",
    description: "Para ambientes com mais governanca, onboarding proximo e fluxos mais adaptados por area.",
    badge: "Custom",
    features: [
      "Escala customizada de vagas e candidatos",
      "Membros e workspaces customizados",
      "Auditoria, multi-org e controles avancados",
      "Suporte de implantacao",
      "Playbooks e fluxo comercial guiado"
    ],
    limitations: ["Escopo definido em proposta"]
  }
];

const comparisonRows = [
  {
    label: "Triagem estruturada",
    values: ["Sim", "Sim", "Sim"]
  },
  {
    label: "Pipeline e entrevistas",
    values: ["Sim", "Sim", "Sim"]
  },
  {
    label: "Automacoes por vaga",
    values: ["-", "Sim", "Sim"]
  },
  {
    label: "Analytics operacionais",
    values: ["Basico", "Avancado", "Avancado"]
  },
  {
    label: "Multi-org e auditoria",
    values: ["-", "Parcial", "Sim"]
  },
  {
    label: "Onboarding guiado",
    values: ["-", "Leve", "Sim"]
  }
];

const buyingReasons = [
  "Estrutura comercial direta para avaliar valor sem excesso de complexidade.",
  "Caminho claro de adocao: provar valor, consolidar padrao e expandir com controle.",
  "Recursos desenhados para problemas reais de operacao, nao para checklists de marketing."
];

function getPricingNotice(code?: string) {
  switch (code) {
    case "cancelled":
      return {
        variant: "warning" as const,
        message: "Checkout cancelado. Voce pode retomar quando quiser."
      };
    case "job-limit":
    case "candidate-limit":
      return {
        variant: "warning" as const,
        message: "Seu workspace atingiu um limite do plano atual. Vale considerar upgrade ou trial."
      };
    default:
      return null;
  }
}

export default async function PricingPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const notice = getPricingNotice(typeof resolvedSearchParams?.billing === "string" ? resolvedSearchParams.billing : undefined);

  return (
    <SiteChrome>
      <section className="relative overflow-hidden px-5 py-10 lg:px-8 lg:py-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="hero-orb absolute left-[-3rem] top-[-1rem] h-52 w-52 rounded-full bg-primary/5 blur-3xl" />
          <div className="hero-orb absolute right-[-4rem] top-12 h-64 w-64 rounded-full bg-[hsl(var(--accent-warm)/0.08)] blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl space-y-8">
          <div className="max-w-4xl space-y-4">
            <p className="section-intro">Planos</p>
            <h1 className="font-display text-5xl font-semibold leading-[0.95] lg:text-6xl">
              Um modelo comercial claro para adotar com seguranca e evoluir sem ruido.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
              O desenho comercial do {brand.name} prioriza clareza de entrada, previsibilidade de expansao e alinhamento
              com a maturidade operacional de cada equipe.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {buyingReasons.map((reason) => (
              <div key={reason} className="spotlight-card rounded-[1.5rem] border border-white/70 bg-white/75 px-5 py-4 text-sm shadow-soft">
                {reason}
              </div>
            ))}
          </div>

          {notice ? (
            <div className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-white/70 bg-white/75 px-5 py-4 shadow-soft">
              <div>
                <p className="font-semibold">Atualizacao comercial</p>
                <p className="text-sm text-muted-foreground">{notice.message}</p>
              </div>
              <Badge variant={notice.variant}>{notice.variant === "warning" ? "Atencao" : "Info"}</Badge>
            </div>
          ) : null}
        </div>
      </section>

      <section className="px-5 py-8 lg:px-8 lg:py-10">
        <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`spotlight-card panel-hover ${plan.highlight ? "border-primary/30 shadow-[0_26px_70px_rgba(25,72,51,0.18)]" : ""}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{plan.name}</CardTitle>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                      plan.highlight ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {plan.badge}
                  </span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="font-display text-5xl font-semibold">{plan.price}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.cadence}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.annualPrice}</p>
                </div>

                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="inline-flex w-full items-center gap-3 rounded-[1.1rem] bg-secondary/65 px-4 py-3 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 rounded-[1.2rem] border border-dashed border-border/80 bg-white/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Notas comerciais</p>
                  {plan.limitations.map((item) => (
                    <p key={item} className="text-sm text-muted-foreground">
                      {item}
                    </p>
                  ))}
                </div>

                <Button asChild size="lg" variant={plan.highlight ? "default" : "outline"} className="w-full">
                  <Link href={brandPaths.demo}>
                    Agendar demo ou receber trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-5 py-8 lg:px-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <Card>
            <CardHeader>
              <p className="section-intro">Comparativo</p>
              <CardTitle className="text-3xl">O que muda entre os planos</CardTitle>
              <CardDescription>Uma leitura objetiva para a conversa comercial seguir sem travar em excesso de detalhe.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] border-b border-border/70 pb-4 text-sm font-semibold">
                  <div>Recurso</div>
                  <div>Starter</div>
                  <div>Growth</div>
                  <div>Business</div>
                </div>
                <div className="divide-y divide-border/60">
                  {comparisonRows.map((row) => (
                    <div key={row.label} className="grid grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] gap-4 py-4 text-sm">
                      <div className="font-medium text-foreground">{row.label}</div>
                      {row.values.map((value, index) => (
                        <div key={`${row.label}-${index}`} className="text-muted-foreground">
                          {value}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-5 py-8 pb-10 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <Card className="overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_360px]">
              <div className="bg-[linear-gradient(135deg,rgba(14,35,29,0.98),rgba(20,47,38,0.94),rgba(46,44,36,0.92))] p-8 text-primary-foreground lg:p-10">
                <p className="section-intro text-primary-foreground/72">Confianca de compra</p>
                <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold">
                  Uma plataforma pronta para impressionar na avaliacao e sustentar o uso depois da decisao.
                </h2>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-5">
                    <CircleGauge className="h-5 w-5" />
                    <p className="mt-4 font-semibold">Clareza operacional</p>
                    <p className="mt-2 text-sm text-primary-foreground/72">
                      Interface, fluxo e linguagem pensados para trabalho serio, nao para demonstracao vazia.
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-white/15 bg-white/10 p-5">
                    <ShieldCheck className="h-5 w-5" />
                    <p className="mt-4 font-semibold">Base pronta para producao</p>
                    <p className="mt-2 text-sm text-primary-foreground/72">
                      Prisma, PostgreSQL, auditoria, permissions, SMTP, storage e readiness ja previstos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-4 p-8 lg:p-10">
                <p className="section-intro">Pronto para conversar</p>
                <h3 className="font-display text-3xl font-semibold">Quer validar o plano certo para seu time?</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  A demo ajuda a mapear maturidade do processo, volume de vagas e o ritmo de implantacao mais adequado.
                </p>
                <Button asChild size="lg">
                  <Link href={brandPaths.demo}>
                    Falar com vendas
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </SiteChrome>
  );
}
