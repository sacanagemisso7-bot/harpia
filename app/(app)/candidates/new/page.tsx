import { CandidateForm } from "@/components/candidates/candidate-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/permissions";

import { createCandidate } from "../actions";

export default async function NewCandidatePage() {
  await requirePermission("manage_candidates");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo candidato</CardTitle>
        <CardDescription>
          Cadastre um perfil manualmente para alimentar a base de talentos e o fluxo de triagem.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CandidateForm action={createCandidate} submitLabel="Criar candidato" />
      </CardContent>
    </Card>
  );
}
