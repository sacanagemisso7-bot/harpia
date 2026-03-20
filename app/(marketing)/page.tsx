import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  ChartColumnIncreasing,
  CheckCircle2,
  CircleGauge,
  Layers3,
  MailCheck,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Waypoints
} from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DemoRequestForm } from "@/components/marketing/demo-request-form";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { createDemoRequest } from "./book-demo/actions";

const proofStats = [
  {
    value: "80%",
    label: "menos tempo em triagem inicial",
    detail: "Score explicavel, resumo executivo e ranking tiram o time da leitura manual infinita."
  },
  {
    value: "1 lugar",
    label: "para operar o hiring inteiro",
    detail: "Vagas, curriculos, entrevistas, analytics e comunicacao vivem no mesmo sistema."
  },
  {
    value: "mais rapido",
    label: "para agir sobre bons candidatos",
    detail: "Alertas de SLA, automacoes e copiloto por etapa ajudam o time a nao perder timing."
  }
];

const featureCards = [
  {
    title: "Triagem explicavel",
    description: "Score de aderencia, justificativa, gaps, pontos fortes e perguntas sugeridas para entrevista.",
    icon: CircleGauge
  },
  {
    title: "IA aplicada ao workflow",
    description: "Parsing de curriculo, perfil consolidado, copiloto de decisao por etapa e sinais de risco.",
    icon: Bot
  },
  {
    title: "Pipeline em ordem",
    description: "Etapas claras, automacoes, historico de movimentacao e saved views para cada operacao.",
    icon: Waypoints
  },
  {
    title: "Entrevistas sem gambiarra",
    description: "Agenda, feedback estruturado, scorecard, `.ics` e links para Google e Outlook Calendar.",
    icon: CalendarClock
  },
  {
    title: "Comunicacao pronta",
    description: "Templates, SMTP, convites e atualizacoes de candidato dentro do fluxo de recrutamento.",
    icon: MailCheck
  },
  {
    title: "Base pronta para producao",
    description: "RBAC por feature, auditoria, multi-org, readiness, storage local ou S3 e Prisma + PostgreSQL.",
    icon: ShieldCheck
  }
];

const pains = [
  "RH perde tempo lendo curriculo por curriculo sem criterio consistente.",
  "Hiring manager entra tarde e o pipeline fica confuso, lento e desalinhado.",
  "Comunicacao e entrevistas viram operacao paralela fora do sistema.",
  "Os melhores candidatos esfriam antes do time conseguir agir."
];

const workflowSteps = [
  {
    label: "1. Estruture a vaga",
    description: "Defina criterios obrigatorios e desejaveis, scorecard e regras de automacao por vaga."
  },
  {
    label: "2. Consolide o candidato",
    description: "Suba PDF, extraia texto, use IA para organizar o perfil e aplique na vaga com contexto."
  },
  {
    label: "3. Priorize com criterio",
    description: "Veja ranking, score explicavel, resumo executivo, gaps, sinais fortes e recomendacao por etapa."
  },
  {
    label: "4. Feche o loop",
    description: "Mova no pipeline, agende entrevistas, registre feedback e envie comunicacao sem sair do fluxo."
  }
];

const planPreview = [
  {
    name: "Starter",
    price: "R$ 499",
    cadence: "/mes",
    audience: "Para startups e times pequenos que querem sair do caos manual.",
    features: ["Ate 3 vagas ativas", "Triagem com IA", "Pipeline e entrevistas", "2 membros do time"]
  },
  {
    name: "Growth",
    price: "R$ 1.290",
    cadence: "/mes",
    audience: "Para RHs que ja operam multiplas vagas e precisam padrao real.",
    features: ["Ate 12 vagas ativas", "Automações e analytics", "Templates de email", "8 membros do time"],
    highlight: true
  },
  {
    name: "Business",
    price: "Sob consulta",
    cadence: "",
    audience: "Para operacoes com mais volume, governance e onboarding dedicado.",
    features: ["Vagas e membros customizados", "SLA e auditoria", "Suporte de implantacao", "Custom workflow"]
  }
];

const faqs = [
  {
    question: "A IA so gera texto bonito ou realmente ajuda a priorizar?",
    answer:
      "Ela organiza o curriculo em dados estruturados, calcula score com contexto da vaga, aponta gaps e sugere perguntas para entrevista. O objetivo e acelerar decisao, nao mascarar falta de processo."
  },
  {
    question: "Isso substitui um ATS completo?",
    answer:
      "Para times de 10 a 200 pessoas, sim na maior parte do fluxo do MVP: vagas, candidatos, pipeline, entrevistas, comunicacao e analytics ja estao no produto."
  },
  {
    question: "Consigo mostrar isso em uma demo de venda?",
    answer:
      "Sim. O produto ja tem careers page publica, pipeline real, parsing com IA, entrevistas, automacoes e dashboard operacional para uma apresentacao convincente."
  }
];

export default async function MarketingPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <SiteChrome>
      <section className="relative overflow-hidden px-5 py-10 lg:px-8 lg:py-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="hero-orb absolute left-[-4rem] top-[-2rem] h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="hero-orb absolute right-[-4rem] top-10 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl [animation-delay:1.2s]" />
          <div className="hero-orb absolute bottom-[-5rem] left-1/3 h-64 w-64 rounded-full bg-emerald-100/40 blur-3xl [animation-delay:2.1s]" />
          <div className="grid-fade absolute inset-x-0 top-0 h-[620px]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_470px] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground shadow-soft">
              Recruiting OS para startups e SMBs que precisam contratar melhor
            </div>

            <div className="space-y-5">
              <h1 className="max-w-5xl font-display text-5xl font-semibold leading-[0.94] text-foreground lg:text-7xl">
                Contrate com mais criterio, menos caos e muito menos trabalho manual.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-muted-foreground lg:text-xl">
                HireFlow AI transforma vagas, curriculos, entrevistas e pipeline em um fluxo unico para RH operar com
                velocidade, consistencia e decisao explicavel.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <Link href="/book-demo">
                  Agendar demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/pricing">Ver planos</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/careers/hireflow-demo">Explorar careers demo</Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {pains.map((item) => (
                <div
                  key={item}
                  className="spotlight-card inline-flex items-start gap-3 rounded-[1.3rem] border border-white/70 bg-white/75 px-4 py-4 text-sm leading-6 shadow-soft"
                >
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <Card className="aurora border-white/80">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Product cockpit</p>
                  <CardTitle className="mt-2">Visao de produto, nao so uma vitrine bonita</CardTitle>
                </div>
                <div className="rounded-2xl bg-primary p-3 text-primary-foreground shadow-[0_16px_36px_rgba(25,72,51,0.24)]">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>
              <CardDescription>
                Um fluxo completo para sair da triagem manual e operar recrutamento com mais previsibilidade.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.35rem] border border-white/75 bg-white/80 p-5 shadow-soft">
                  <p className="section-intro">Pipeline ativo</p>
                  <p className="mt-3 text-3xl font-semibold text-gradient">42 candidatos</p>
                  <p className="mt-2 text-sm text-muted-foreground">Ranking, score e movimento por etapa sem planilha paralela.</p>
                </div>
                <div className="rounded-[1.35rem] border border-white/75 bg-white/80 p-5 shadow-soft">
                  <p className="section-intro">SLA operacional</p>
                  <p className="mt-3 text-3xl font-semibold text-gradient">6 alertas</p>
                  <p className="mt-2 text-sm text-muted-foreground">O time sabe onde agir antes de perder candidato forte.</p>
                </div>
              </div>

              <div className="grid gap-3">
                {[
                  "Curriculo analisado com IA e perfil estruturado",
                  "Aplicacao com score explicavel, gaps e perguntas sugeridas",
                  "Entrevista com feedback estruturado e scorecard por vaga"
                ].map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-3 rounded-[1.2rem] border border-white/75 bg-white/78 px-4 py-3 text-sm shadow-soft"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="produto" className="px-5 py-8 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="max-w-3xl space-y-3">
            <p className="section-intro">Por que times compram</p>
            <h2 className="font-display text-4xl font-semibold">Um produto para operar recrutamento com padrao e velocidade</h2>
            <p className="text-lg text-muted-foreground">
              O foco nao e so deixar o processo bonito. E deixar a operacao mais previsivel para RH e mais legivel para
              founders, lideres e hiring managers.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {proofStats.map((item) => (
              <Card key={item.label} className="panel-hover spotlight-card">
                <CardContent className="p-6">
                  <p className="font-display text-5xl font-semibold text-gradient">{item.value}</p>
                  <p className="mt-3 text-lg font-semibold">{item.label}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-8 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="max-w-3xl space-y-3">
            <p className="section-intro">O que chama atencao na demo</p>
            <h2 className="font-display text-4xl font-semibold">Tudo o que um time precisa para sair do ATS morno</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((item) => {
              const Icon = item.icon;

              return (
                <Card key={item.title} className="panel-hover spotlight-card">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{item.title}</p>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="px-5 py-8 lg:px-8 lg:py-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="aurora">
            <CardHeader>
              <CardTitle>Como a operacao flui</CardTitle>
              <CardDescription>O produto foi desenhado para reduzir troca de contexto e acelerar decisao.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.35rem] border border-white/70 bg-white/75 p-5 shadow-soft">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-primary p-3 text-primary-foreground">
                    <Layers3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Da vaga ate a decisao final</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Vaga, criterios, scorecard, candidato, aplicacao, entrevista, feedback e comunicacao no mesmo fluxo.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.35rem] border border-white/70 bg-white/75 p-5 shadow-soft">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                    <ChartColumnIncreasing className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Analytics e previsibilidade</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Acompanhamento de score, produtividade, SLA e gargalos para lideranca agir com mais contexto.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            {workflowSteps.map((step) => (
              <Card key={step.label} className="panel-hover spotlight-card">
                <CardContent className="p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">{step.label}</p>
                  <p className="mt-4 text-xl font-semibold leading-8">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-8 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="section-intro">Planos</p>
              <h2 className="font-display text-4xl font-semibold">Estrutura de precificacao que parece produto vendavel</h2>
              <p className="text-lg text-muted-foreground">
                Uma linha simples para o comercial apresentar, com espaco para trial, prova de valor e expansao.
              </p>
            </div>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">Abrir pagina de planos</Link>
            </Button>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            {planPreview.map((plan) => (
              <Card
                key={plan.name}
                className={`panel-hover spotlight-card ${plan.highlight ? "border-primary/25 shadow-[0_26px_70px_rgba(25,72,51,0.16)]" : ""}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.highlight ? (
                      <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground">
                        Mais escolhido
                      </span>
                    ) : null}
                  </div>
                  <CardDescription>{plan.audience}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <p className="font-display text-4xl font-semibold text-foreground">{plan.price}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.cadence}</p>
                  </div>
                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="inline-flex w-full items-center gap-3 rounded-[1.1rem] bg-secondary/65 px-4 py-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-8 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="max-w-3xl space-y-3">
            <p className="section-intro">FAQ rapido</p>
            <h2 className="font-display text-4xl font-semibold">Perguntas que ajudam na conversa comercial</h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {faqs.map((item) => (
              <Card key={item.question} className="panel-hover">
                <CardContent className="p-6">
                  <p className="text-lg font-semibold">{item.question}</p>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{item.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-8 pb-10 lg:px-8 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <Card className="overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_440px]">
              <div className="bg-[linear-gradient(135deg,rgba(21,58,42,0.98),rgba(31,88,61,0.92),rgba(131,151,87,0.82))] p-8 text-primary-foreground lg:p-10">
                <p className="section-intro text-primary-foreground/72">Pronto para demo comercial</p>
                <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold">
                  Mostre um recruiting OS que chama atencao logo na primeira apresentacao.
                </h2>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.35rem] border border-white/15 bg-white/10 p-5">
                    <BriefcaseBusiness className="h-5 w-5" />
                    <p className="mt-4 font-semibold">Vagas estruturadas</p>
                    <p className="mt-2 text-sm text-primary-foreground/72">
                      Criterios, scorecard e automacoes para operar cada vaga com mais consistencia.
                    </p>
                  </div>
                  <div className="rounded-[1.35rem] border border-white/15 bg-white/10 p-5">
                    <UsersRound className="h-5 w-5" />
                    <p className="mt-4 font-semibold">Perfis consolidados</p>
                    <p className="mt-2 text-sm text-primary-foreground/72">
                      Curriculo, parsing com IA, aplicacoes, notas e historico num unico lugar.
                    </p>
                  </div>
                  <div className="rounded-[1.35rem] border border-white/15 bg-white/10 p-5">
                    <CalendarClock className="h-5 w-5" />
                    <p className="mt-4 font-semibold">Entrevistas no fluxo</p>
                    <p className="mt-2 text-sm text-primary-foreground/72">
                      Agenda, scorecard, feedback estruturado e convites de calendario sem gambiarra.
                    </p>
                  </div>
                  <div className="rounded-[1.35rem] border border-white/15 bg-white/10 p-5">
                    <ShieldCheck className="h-5 w-5" />
                    <p className="mt-4 font-semibold">Base pronta para crescer</p>
                    <p className="mt-2 text-sm text-primary-foreground/72">
                      RBAC, multiorg, auditoria, SMTP, storage e readiness para deploy real.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 lg:p-10">
                <p className="section-intro">Quero ver isso no meu time</p>
                <h3 className="mt-3 font-display text-3xl font-semibold">Agende uma demo guiada</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Conte seu contexto e o time comercial consegue mostrar o fluxo mais relevante para o seu processo.
                </p>
                <div className="mt-6">
                  <DemoRequestForm action={createDemoRequest} sourcePage="home-cta" compact />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </SiteChrome>
  );
}
