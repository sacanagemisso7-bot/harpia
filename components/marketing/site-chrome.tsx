import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type SiteChromeProps = {
  children: React.ReactNode;
};

export function SiteChrome({ children }: SiteChromeProps) {
  return (
    <main className="min-h-screen px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-[1580px] rounded-[2rem] border border-white/70 bg-white/70 shadow-glow backdrop-blur-xl">
        <div className="glass-strip border-b border-white/60 px-5 py-3 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
            <p className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Triagem com IA, pipeline, entrevistas e analytics em um unico fluxo
            </p>
            <Link href="/pricing" className="font-semibold text-foreground hover:text-primary">
              Ver planos
            </Link>
          </div>
        </div>

        <header className="sticky top-0 z-20 border-b border-white/70 bg-white/70 px-5 py-4 backdrop-blur-xl lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary p-2.5 text-primary-foreground shadow-[0_16px_36px_rgba(25,72,51,0.24)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-xl font-semibold">HireFlow AI</p>
                <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">Recruiting OS</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
              <Link href="/#produto" className="hover:text-foreground">
                Produto
              </Link>
              <Link href="/#como-funciona" className="hover:text-foreground">
                Como funciona
              </Link>
              <Link href="/pricing" className="hover:text-foreground">
                Planos
              </Link>
              <Link href="/book-demo" className="hover:text-foreground">
                Agendar demo
              </Link>
              <Link href="/careers/hireflow-demo" className="hover:text-foreground">
                Careers demo
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <Button asChild variant="outline" className="hidden sm:inline-flex">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild>
                <Link href="/book-demo">
                  Agendar demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {children}

        <footer className="border-t border-white/70 px-5 py-8 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-display text-xl font-semibold">HireFlow AI</p>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Plataforma de triagem inteligente para RH com score explicavel, pipeline organizado e operacao mais previsivel.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Feito para startups e SMBs que querem contratar com mais criterio.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/pricing" className="hover:text-foreground">
                  Planos
                </Link>
                <Link href="/book-demo" className="hover:text-foreground">
                  Agendar demo
                </Link>
                <Link href="/careers/hireflow-demo" className="hover:text-foreground">
                  Careers demo
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
