import type { Metadata } from "next";
import { CalendarClock, CheckCircle2, ClipboardList, MessagesSquare, Sparkles, UsersRound } from "lucide-react";

import { DemoRequestForm } from "@/components/marketing/demo-request-form";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { createDemoRequest } from "./actions";

export const metadata: Metadata = {
  title: "Agendar demo | HireFlow AI",
  description: "Agende uma demo do HireFlow AI e veja como organizar triagem, pipeline, entrevistas e analytics em um unico fluxo."
};

const demoPoints = [
  "Mostramos o fluxo mais relevante para o seu tipo de vaga e time.",
  "Voce sai com uma visao clara do que a IA ajuda de verdade e do que continua sendo decisao humana.",
  "A conversa ja ajuda a entender qual plano faz sentido para seu estagio de operacao."
];

const demoAgenda = [
  {
    title: "Entendimento do processo atual",
    description: "Como o time recebe curriculos, onde perde tempo e o que hoje esta mais quebrado."
  },
  {
    title: "Tour guiado no produto",
    description: "Vagas, triagem, score, pipeline, entrevistas, analytics, automacoes e careers page."
  },
  {
    title: "Plano de implantacao inicial",
    description: "Quais fluxos entram primeiro e como configurar equipe, criterios e templates."
  }
];

const reassurance = [
  {
    icon: Sparkles,
    title: "Nao e demo fake",
    text: "O produto ja opera com persistencia real, parsing com IA, entrevistas, pipeline e analytics."
  },
  {
    icon: UsersRound,
    title: "Feito para RH e lideranca",
    text: "A conversa atende tanto quem opera a vaga no dia a dia quanto quem precisa de previsibilidade."
  },
  {
    icon: CalendarClock,
    title: "Foco em uso real",
    text: "A demo puxa para processo, criterio, tempo ganho e visibilidade, nao so para interface bonita."
  }
];

export default function BookDemoPage() {
  return (
    <SiteChrome>
      <section className="relative overflow-hidden px-5 py-10 lg:px-8 lg:py-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="hero-orb absolute left-[-3rem] top-0 h-52 w-52 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="hero-orb absolute right-[-3rem] top-12 h-64 w-64 rounded-full bg-amber-200/25 blur-3xl [animation-delay:1.3s]" />
          <div className="grid-fade absolute inset-x-0 top-0 h-[560px]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_480px]">
          <div className="space-y-7">
            <div className="space-y-4">
              <p className="section-intro">Book demo</p>
              <h1 className="font-display text-5xl font-semibold leading-[0.96] lg:text-6xl">
                Agende uma demo que ja parece inicio de onboarding.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                Conte seu contexto e a apresentacao do HireFlow AI fica orientada pelo seu processo, nao por um pitch
                generico.
              </p>
            </div>

            <div className="grid gap-3">
              {demoPoints.map((point) => (
                <div key={point} className="inline-flex items-start gap-3 rounded-[1.3rem] border border-white/70 bg-white/75 px-4 py-4 text-sm shadow-soft">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  <span>{point}</span>
                </div>
              ))}
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {reassurance.map((item) => {
                const Icon = item.icon;

                return (
                  <Card key={item.title} className="panel-hover spotlight-card">
                    <CardContent className="p-6">
                      <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground w-fit">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-lg font-semibold">{item.title}</p>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.text}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Card className="aurora border-white/80">
            <CardHeader>
              <CardTitle className="text-3xl">Quero ver o produto em acao</CardTitle>
              <CardDescription>
                Preencha rapido e a captura ja fica registrada para o fluxo comercial trabalhar em cima.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DemoRequestForm action={createDemoRequest} sourcePage="book-demo" />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-5 py-8 lg:px-8 lg:py-10">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="aurora">
            <CardHeader>
              <CardTitle>O que voce pode trazer</CardTitle>
              <CardDescription>Isso ajuda a deixar a conversa mais objetiva e muito mais util.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.25rem] border border-white/70 bg-white/75 p-5 shadow-soft">
                <ClipboardList className="h-5 w-5 text-primary" />
                <p className="mt-4 font-semibold">Volume e maturidade</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Quantas vagas voce abre, quantas pessoas tocam o processo e em que etapa hoje tudo desacelera.
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-white/70 bg-white/75 p-5 shadow-soft">
                <MessagesSquare className="h-5 w-5 text-primary" />
                <p className="mt-4 font-semibold">Problema mais urgente</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Triagem manual, pipeline confuso, atraso para resposta, falta de visibilidade ou despadronizacao.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 md:grid-cols-3">
            {demoAgenda.map((item, index) => (
              <Card key={item.title} className="panel-hover spotlight-card">
                <CardContent className="p-6">
                  <p className="section-intro">{`Etapa 0${index + 1}`}</p>
                  <p className="mt-4 text-xl font-semibold">{item.title}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
