"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logError } from "@/lib/observability/logger";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError("Global app error boundary triggered", error, { digest: error.digest }, "ui");
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Algo saiu do esperado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Houve um problema ao carregar a aplicação. Tente novamente ou revise a configuração do ambiente.
          </p>
          <Button onClick={reset}>Tentar de novo</Button>
        </CardContent>
      </Card>
    </div>
  );
}
