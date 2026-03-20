import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma/client";
import { getInviteByToken } from "@/lib/team/queries";

import { acceptInvite, acceptInviteWithExistingAccount } from "./actions";

export default async function AcceptInvitePage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInviteByToken(token);
  const session = await auth();

  if (!invite) {
    notFound();
  }

  const isUnavailable = !!invite.revokedAt || !!invite.acceptedAt || invite.expiresAt <= new Date();
  const existingUser = await prisma.user.findUnique({
    where: {
      email: invite.email
    }
  });
  const canAcceptWithCurrentSession =
    !!existingUser && !!session?.user?.email && session.user.email.toLowerCase() === invite.email.toLowerCase();

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Team invite</div>
          <CardTitle>Entrar no workspace {invite.organization.name}</CardTitle>
          <CardDescription>Ative seu acesso com uma senha para participar do time no HireFlow AI.</CardDescription>
        </CardHeader>
        <CardContent>
          {isUnavailable ? (
            <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
              Esse convite expirou, ja foi aceito ou foi revogado. Peca um novo link para o administrador do workspace.
            </div>
          ) : existingUser ? (
            <div className="space-y-4">
              <div className="rounded-[1.25rem] border border-border/70 bg-white/75 p-5 text-sm text-muted-foreground">
                Ja existe uma conta com esse email. Entre com ela para adicionar este workspace ao seu acesso atual.
              </div>
              {canAcceptWithCurrentSession ? (
                <form action={acceptInviteWithExistingAccount.bind(null, token)}>
                  <Button type="submit" className="w-full">
                    Aceitar convite com a conta atual
                  </Button>
                </form>
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
                  Faca login com <span className="font-medium text-foreground">{invite.email}</span> e abra este link novamente.
                </div>
              )}
            </div>
          ) : (
            <AcceptInviteForm
              email={invite.email}
              organizationName={invite.organization.name}
              action={acceptInvite.bind(null, token)}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
