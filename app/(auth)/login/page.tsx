import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { authenticate } from "./actions";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_460px]">
      <section className="hidden bg-[image:var(--tw-gradient-stops)] from-transparent via-transparent to-transparent p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground shadow-sm">
          HireFlow AI
        </div>
        <div className="max-w-xl space-y-6">
          <h1 className="font-display text-6xl font-semibold leading-tight">
            Operacao de recrutamento com cara de produto premium.
          </h1>
          <p className="text-lg text-muted-foreground">
            Estruture vagas, consolide candidatos, mova pipeline e acelere a priorizacao com IA explicavel.
          </p>
          <div className="rounded-[1.5rem] border border-white/60 bg-white/70 p-6 shadow-[0_20px_60px_rgba(35,54,45,0.08)] backdrop-blur">
            <p className="text-sm font-semibold">Credenciais seed</p>
            <p className="mt-2 text-sm text-muted-foreground">Email: `founder@hireflow.ai`</p>
            <p className="text-sm text-muted-foreground">Senha: `ChangeMe123!`</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 lg:px-10">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Acesso seguro
            </div>
            <CardTitle>Entrar no HireFlow AI</CardTitle>
            <CardDescription>
              Use suas credenciais para acessar o workspace da sua organizacao.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm action={authenticate} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
