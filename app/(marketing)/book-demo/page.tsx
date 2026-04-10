import type { Metadata } from "next";
import { CalendarClock, CheckCircle2, ClipboardList, MessagesSquare, ShieldCheck, UsersRound } from "lucide-react";

import { DemoRequestForm } from "@/components/marketing/demo-request-form";
import { SiteChrome } from "@/components/marketing/site-chrome";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { brand, formatBrandTitle } from "@/lib/brand";

import { createDemoRequest } from "./actions";

export const metadata: Metadata = {
  title: formatBrandTitle("Agendar demo"),
  description: `Agende uma demo do ${brand.name} e veja como estruturar recrutamento e people ops com mais clareza e controle.`
};

const demoPoints = [
  "A conversa parte do seu processo atual, nao de um roteiro generico.",
  "Mostramos onde a plataforma reduz ruido operacional sem tirar o julgamento do time.",
  "Voce sai com uma leitura clara do melhor ponto de entrada para adocao."
];

const demoAgenda = [
  {
    title: "Entendimento do momento atual",
    description: "Volume de vagas, atores envolvidos, gargalos e onde a operacao perde consistencia hoje."
  },
  {
    title: "Tour guiado no produto",
    description: "Requisicoes, triagem, pipeline, entrevistas, people ops, operacao interna e trilha de decisao."
  },
  {
    title: "Plano de entrada",
    description: "Definimos por onde comecar, o que padronizar primeiro e como levar a equipe junto."
  }
];

const reassurance = [
  {
    icon: ShieldCheck,
    title: "Produto de uso real",
    text: "A apresentacao acontece sobre uma base funcional, com operacao, persistencia e fluxos prontos para evoluir."
  },
  {
    icon: UsersRound,
    title: "Pensado para RH e lideranca",
    text: "A conversa cobre tanto quem opera no dia a dia quanto quem precisa de visibilidade e previsibilidade."
  },
  {
    icon: CalendarClock,
    title: "Foco em decisao",
    text: "Nao mostramos apenas interface. Mostramos como o time ganha criterio, ritmo e memoria operacional."
  }
];

export default function BookDemoPage() {
  return (
    <SiteChrome>
      <section className="relative overflow-hidden px-5 py-10 lg:px-8 lg:py-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="hero-orb absolute left-[-3rem] top-0 h-52 w-52 rounded-full bg-primary/5 blur-3xl" />
          <div className="hero-orb absolute right-[-3rem] top-12 h-64 w-64 rounded-full bg-[hsl(var(--accent-warm)/0.08)] blur-3xl" />
          <div className="grid-fade absolute inset-x-0 top-0 h-[560px]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_480px]">
          <div className="space-y-7">
            <div className="space-y-4">
              <p className="section-intro">Agendar demo</p>
              <h1 className="font-display text-5xl font-semibold leading-[0.96] lg:text-6xl">
                Uma conversa guiada para entender onde o Harpia realmente encaixa.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                Conte seu contexto e adaptamos a demonstracao ao seu processo, aos seus gargalos e ao ritmo de decisao
                do seu time.
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
                      <div className="w-fit rounded-2xl bg-secondary p-3 text-secondary-foreground">
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
              <CardTitle className="text-3xl">Quero avaliar no meu contexto</CardTitle>
              <CardDescription>
                Preencha em poucos minutos e registramos sua demanda para seguir a conversa com precisao.
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
              <CardTitle>O que ajuda trazer para a conversa</CardTitle>
              <CardDescription>Com isso, a demo fica mais objetiva e mais proxima do uso real.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.25rem] border border-white/70 bg-white/75 p-5 shadow-soft">
                <ClipboardList className="h-5 w-5 text-primary" />
                <p className="mt-4 font-semibold">Volume e maturidade</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Quantas vagas o time abre, quantas pessoas participam e em que ponto o processo desacelera.
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-white/70 bg-white/75 p-5 shadow-soft">
                <MessagesSquare className="h-5 w-5 text-primary" />
                <p className="mt-4 font-semibold">Problema prioritario</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Triagem manual, visibilidade baixa, demora para responder, falta de padrao ou handoffs fracos.
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
