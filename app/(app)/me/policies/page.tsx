import { acknowledgePolicyAction } from "@/app/(app)/people/compliance/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { getSelfServicePolicyWorkspace } from "@/modules/compliance/queries";

export default async function MyPoliciesPage() {
  const user = await requireCurrentUser();
  const workspace = await getSelfServicePolicyWorkspace({
    organizationId: user.organizationId,
    userId: user.id
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My policies"
        title="Aceites e politicas internas"
        description="Resolva rapidamente politicas pendentes, acompanhe o que ja foi confirmado e reduza atrito operacional com o RH."
      />

      {!workspace ? (
        <Card className="panel-hover">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Seu usuario ainda nao esta vinculado a um perfil de colaborador nesta organizacao.
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-3">
            <Card className="panel-hover">
              <CardContent className="p-5">
                <p className="section-intro">Colaborador</p>
                <p className="mt-3 text-lg font-semibold">{workspace.employee.fullName}</p>
                <p className="text-sm text-muted-foreground">
                  {workspace.employee.title} em {workspace.employee.department}
                </p>
              </CardContent>
            </Card>
            <Card className="panel-hover">
              <CardContent className="p-5">
                <p className="section-intro">Pendentes</p>
                <p className="mt-3 text-3xl font-semibold">{workspace.pendingAcknowledgements.length}</p>
              </CardContent>
            </Card>
            <Card className="panel-hover">
              <CardContent className="p-5">
                <p className="section-intro">Requisitos ligados</p>
                <p className="mt-3 text-3xl font-semibold">{workspace.pendingPolicyRequirements.length}</p>
              </CardContent>
            </Card>
          </section>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Pendencias de aceite</CardTitle>
              <CardDescription>Politicas que ainda precisam da sua confirmacao.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspace.pendingAcknowledgements.length ? (
                workspace.pendingAcknowledgements.map((item) => (
                  <div key={item.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-semibold">{item.document?.title ?? item.title}</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {item.document?.versionLabel ? `${item.document.versionLabel} · ` : ""}
                          {item.title}
                          {item.dueAt ? ` · vence em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(item.dueAt)}` : ""}
                        </p>
                        {item.document?.summary ? <p className="mt-2 text-sm text-muted-foreground">{item.document.summary}</p> : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={item.dueAt && item.dueAt.getTime() < Date.now() ? "destructive" : "warning"}>
                          {item.dueAt && item.dueAt.getTime() < Date.now() ? "OVERDUE" : "PENDING"}
                        </Badge>
                        <form action={acknowledgePolicyAction}>
                          <input type="hidden" name="acknowledgementId" value={item.id} />
                          <Button type="submit">Confirmar aceite</Button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
                  Nenhuma politica pendente para voce no momento.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Historico recente</CardTitle>
              <CardDescription>Politicas ja confirmadas e contexto de compliance ligado a elas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspace.acknowledged.length ? (
                workspace.acknowledged.map((item) => (
                  <div key={item.id} className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{item.document?.title ?? item.title}</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {item.document?.versionLabel ? `${item.document.versionLabel} · ` : ""}
                          Confirmado em{" "}
                          {item.acknowledgedAt
                            ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(item.acknowledgedAt)
                            : "data indisponivel"}
                        </p>
                      </div>
                      <Badge variant="success">ACKNOWLEDGED</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
                  Seus aceites aparecem aqui conforme forem sendo registrados.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
