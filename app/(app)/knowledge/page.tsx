import { FileStack, LibraryBig, LoaderCircle, ScanSearch } from "lucide-react";

import { publishPolicyDocumentVersionAction, uploadKnowledgeDocument } from "@/app/(app)/knowledge/actions";
import { KnowledgeUploadForm } from "@/components/knowledge/knowledge-upload-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/permissions";
import { getKnowledgeOverview, getPolicyRolloutOverview, listPolicyDocumentsForSelect } from "@/modules/knowledge/queries";

export default async function KnowledgePage() {
  const user = await requirePermission("manage_knowledge");
  const [knowledge, policyDocuments, policyRollouts] = await Promise.all([
    getKnowledgeOverview(user.organizationId),
    listPolicyDocumentsForSelect(user.organizationId),
    getPolicyRolloutOverview(user.organizationId)
  ]);
  const latestRolloutByDocumentId = policyRollouts.reduce<Map<string, (typeof policyRollouts)[number]>>((map, rollout) => {
    if (!map.has(rollout.document.id)) {
      map.set(rollout.document.id, rollout);
    }

    return map;
  }, new Map());

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Knowledge base"
        title="Memoria operacional da organizacao"
        description="Centralize playbooks, politicas, templates e briefings em uma base preparada para retrieval, copiloto e operacao do time."
      />

      <section className="grid gap-5 lg:grid-cols-4">
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Documentos</p>
            <p className="mt-3 text-3xl font-semibold">{knowledge.metrics.totalDocuments}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Prontos</p>
            <p className="mt-3 text-3xl font-semibold">{knowledge.metrics.readyCount}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Processando</p>
            <p className="mt-3 text-3xl font-semibold">{knowledge.metrics.processingCount}</p>
          </CardContent>
        </Card>
        <Card className="panel-hover">
          <CardContent className="p-5">
            <p className="section-intro">Chunks</p>
            <p className="mt-3 text-3xl font-semibold">{knowledge.metrics.chunkCount}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="panel-hover">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                  <LibraryBig className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle>Novo material</CardTitle>
                  <CardDescription>Upload com ingestao automatica e estrutura pronta para busca semantica.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <KnowledgeUploadForm action={uploadKnowledgeDocument} />
            </CardContent>
          </Card>

          <Card className="panel-hover">
            <CardHeader>
              <CardTitle>Publicar versao de policy</CardTitle>
              <CardDescription>Marque uma politica como publicada, registre a versao e conecte a cadeia de supersessao.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={publishPolicyDocumentVersionAction} className="grid gap-4">
                <label className="grid gap-2 text-sm text-muted-foreground">
                  <span>Documento de policy</span>
                  <select name="documentId" required className="h-11 rounded-2xl border border-border bg-white px-4">
                    <option value="">Selecione uma policy pronta</option>
                    {policyDocuments.map((document) => (
                      <option key={document.id} value={document.id}>
                        {document.title}
                        {document.versionLabel ? ` · ${document.versionLabel}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-muted-foreground">
                  <span>Versao</span>
                  <input name="versionLabel" placeholder="Ex.: v2.0" className="h-11 rounded-2xl border border-border bg-white px-4" />
                </label>
                <label className="grid gap-2 text-sm text-muted-foreground">
                  <span>Supersede</span>
                  <select name="supersedesDocumentId" className="h-11 rounded-2xl border border-border bg-white px-4">
                    <option value="">Nao supersede outra versao</option>
                    {policyDocuments.map((document) => (
                      <option key={`supersede-${document.id}`} value={document.id}>
                        {document.title}
                        {document.versionLabel ? ` · ${document.versionLabel}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-[1rem] border border-border/70 bg-white/75 px-4 py-3 text-sm text-muted-foreground">
                  <input type="checkbox" name="requiresAcknowledgement" defaultChecked />
                  Exigir aceite operacional desta versao
                </label>
                <Button type="submit" variant="outline">
                  Publicar policy
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="panel-hover">
          <CardHeader>
            <CardTitle>Base da empresa</CardTitle>
            <CardDescription>Documentos indexados por organizacao, com status de ingestao e resumo operacional.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {knowledge.documents.length ? (
              knowledge.documents.map((document) => {
                const latestRollout = latestRolloutByDocumentId.get(document.id);

                return (
                  <div key={document.id} className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-semibold">{document.title}</p>
                          <Badge variant={document.status === "READY" ? "success" : document.status === "FAILED" ? "destructive" : "warning"}>
                            {document.status}
                          </Badge>
                          <Badge variant="outline">{document.type}</Badge>
                          {document.versionLabel ? <Badge variant="outline">{document.versionLabel}</Badge> : null}
                          {document.publishedAt ? <Badge variant="outline">Published</Badge> : null}
                          {document.requiresAcknowledgement ? <Badge variant="outline">Requires ack</Badge> : null}
                        </div>
                        {document.description ? <p className="text-sm text-muted-foreground">{document.description}</p> : null}
                        <p className="text-sm text-muted-foreground">
                          Criado por {document.createdBy.name} - {document._count.chunks} chunks
                        </p>
                        {document.supersedesDocument ? (
                          <p className="text-sm text-muted-foreground">
                            Supersede {document.supersedesDocument.title}
                            {document.supersedesDocument.versionLabel ? ` · ${document.supersedesDocument.versionLabel}` : ""}
                          </p>
                        ) : null}
                        {document.summary ? <p className="text-sm leading-6 text-muted-foreground">{document.summary}</p> : null}
                        {latestRollout ? (
                          <div className="mt-3 rounded-[1rem] border border-emerald-200/70 bg-emerald-50/70 p-3 text-sm">
                            <p className="font-medium text-foreground">{latestRollout.title}</p>
                            <p className="mt-1 text-muted-foreground">
                              {latestRollout.metrics.acceptanceRate}% de aceite · {latestRollout.metrics.acknowledged}/{latestRollout.metrics.assigned} confirmados
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              {latestRollout.metrics.pending} pendentes
                              {latestRollout.metrics.overdue ? ` · ${latestRollout.metrics.overdue} atrasados` : ""}
                            </p>
                          </div>
                        ) : null}
                        {document.lastError ? <p className="text-sm text-destructive">{document.lastError}</p> : null}
                      </div>
                      <div className="grid gap-3 text-sm text-muted-foreground">
                        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-2">
                          <FileStack className="h-4 w-4" />
                          {document.fileName ?? "Arquivo"}
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-2">
                          {document.status === "PROCESSING" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                          {document.processedAt
                            ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(document.processedAt)
                            : "Ingestao em andamento"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
                Ainda nao ha materiais na knowledge base desta organizacao.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="panel-hover">
        <CardHeader>
          <CardTitle>Policy rollouts</CardTitle>
          <CardDescription>Campanhas de distribuicao e aceite das politicas mais recentes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {policyRollouts.length ? (
            policyRollouts.map((rollout) => (
              <div key={rollout.id} className="rounded-[1.35rem] border border-border/70 bg-white/75 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold">{rollout.title}</p>
                      <Badge variant={rollout.status === "COMPLETED" ? "success" : "outline"}>{rollout.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {rollout.document.title}
                      {rollout.document.versionLabel ? ` · ${rollout.document.versionLabel}` : ""}
                      {rollout.document.supersedesDocumentTitle ? ` · supersede ${rollout.document.supersedesDocumentTitle}` : ""}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {rollout.metrics.acceptanceRate}% de aceite · {rollout.metrics.acknowledged}/{rollout.metrics.assigned} confirmados
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div className="rounded-full border border-border/70 bg-white px-3 py-2">
                      Pendentes: {rollout.metrics.pending}
                      {rollout.metrics.overdue ? ` · Atrasados: ${rollout.metrics.overdue}` : ""}
                    </div>
                    <div className="rounded-full border border-border/70 bg-white px-3 py-2">
                      Prazo:{" "}
                      {rollout.dueAt
                        ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(rollout.dueAt)
                        : "Sem prazo"}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-border bg-white/75 p-5 text-sm text-muted-foreground">
              Nenhum rollout de policy foi iniciado ainda.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
