import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Página não encontrada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O recurso que você tentou acessar não existe ou não está disponível para esta organização.
          </p>
          <Button asChild>
            <Link href="/dashboard">Voltar ao dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
