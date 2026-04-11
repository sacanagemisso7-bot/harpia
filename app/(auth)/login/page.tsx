import { HarpiaLogo } from "@/components/brand/harpia-logo";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeCallbackPath } from "@/lib/auth/callback-url";
import { brand } from "@/lib/brand";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const callbackValue = resolvedSearchParams.callbackUrl;
  const callbackUrl = normalizeCallbackPath(Array.isArray(callbackValue) ? callbackValue[0] : callbackValue);

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_460px]">
      <section className="hidden bg-[image:var(--tw-gradient-stops)] from-transparent via-transparent to-transparent p-10 lg:flex lg:flex-col lg:justify-between">
        <div>
          <HarpiaLogo showTagline />
        </div>
        <div className="max-w-xl space-y-6">
          <h1 className="font-display text-6xl font-semibold leading-tight">
            Contrate com mais clareza e opere RH com menos ruido.
          </h1>
          <p className="text-lg text-muted-foreground">
            {brand.description}
          </p>
          <div className="rounded-[1.5rem] border border-white/60 bg-white/70 p-6 shadow-[0_20px_60px_rgba(35,54,45,0.08)] backdrop-blur">
            <p className="text-sm font-semibold">Acesso para times operacionais</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Entre com sua conta para acessar pipelines, operações internas e contexto consolidado da organização.
            </p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 lg:px-10">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Acesso seguro
            </div>
            <CardTitle>Entrar no {brand.name}</CardTitle>
            <CardDescription>
              Use suas credenciais para acessar o workspace da sua organização.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm callbackUrl={callbackUrl} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
