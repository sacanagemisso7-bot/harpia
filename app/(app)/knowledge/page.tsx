import { FileStack, LibraryBig, LoaderCircle, ScanSearch } from "lucide-react";

import { publishPolicyDocumentVersionAction, uploadKnowledgeDocument } from "@/app/(app)/knowledge/actions";
import { KnowledgeUploadForm } from "@/components/knowledge/knowledge-upload-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { getKnowledgeOverview, getPolicyRolloutOverview, listPolicyDocumentsForSelect } from "@/modules/knowledge/queries";

import styles from "../workspace-expansion.module.css";

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
    <div className={styles.page}>
      <PageHeader
        eyebrow="Knowledge base"
        title="Memoria operacional da organização"
        description="Playbooks, políticas, templates e briefings numa base preparada para retrieval, copiloto e operação."
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Documentos</span>
          <strong className={styles.statValue}>{knowledge.metrics.totalDocuments}</strong>
          <span className={styles.statHint}>Materiais registrados na base da organização.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Prontos</span>
          <strong className={styles.statValue}>{knowledge.metrics.readyCount}</strong>
          <span className={styles.statHint}>Ja processados e prontos para uso.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Processando</span>
          <strong className={styles.statValue}>{knowledge.metrics.processingCount}</strong>
          <span className={styles.statHint}>Arquivos ainda em ingestão ou indexacao.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Chunks</span>
          <strong className={styles.statValue}>{knowledge.metrics.chunkCount}</strong>
          <span className={styles.statHint}>Fragmentos disponíveis para busca semantica.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>New material</span>
              <h2 className={styles.panelTitle}>Upload com ingestão automatica</h2>
              <p className={styles.panelDescription}>Envie playbooks, policies e PDFs com estrutura pronta para retrieval.</p>
            </div>
            <div className={styles.surfaceMuted}>
              <KnowledgeUploadForm action={uploadKnowledgeDocument} />
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Policy publishing</span>
              <h2 className={styles.panelTitle}>Publicar versao de policy</h2>
              <p className={styles.panelDescription}>Registre versao, supersess?o e cadeia de aceite operacional.</p>
            </div>
            <form action={publishPolicyDocumentVersionAction} className={styles.actionCluster}>
              <select name="documentId" required className={styles.select}>
                <option value="">Selecione uma policy pronta</option>
                {policyDocuments.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.title}
                    {document.versionLabel ? ` · ${document.versionLabel}` : ""}
                  </option>
                ))}
              </select>
              <input name="versionLabel" placeholder="Ex.: v2.0" className={styles.field} />
              <select name="supersedesDocumentId" className={styles.select}>
                <option value="">Não supersede outra versao</option>
                {policyDocuments.map((document) => (
                  <option key={`supersede-${document.id}`} value={document.id}>
                    {document.title}
                    {document.versionLabel ? ` · ${document.versionLabel}` : ""}
                  </option>
                ))}
              </select>
              <label className={styles.surfaceMuted}>
                <span className={styles.itemDescription}>
                  <input type="checkbox" name="requiresAcknowledgement" defaultChecked className="mr-3" />
                  Exigir aceite operacional desta versao
                </span>
              </label>
              <Button type="submit" variant="outline">
                Publicar policy
              </Button>
            </form>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Document ledger</span>
              <h2 className={styles.panelTitle}>Base da empresa</h2>
            </div>
            {knowledge.documents.length ? (
              <div className={styles.list}>
                {knowledge.documents.map((document) => {
                  const latestRollout = latestRolloutByDocumentId.get(document.id);

                  return (
                    <div key={document.id} className={styles.listItem}>
                      <div className={styles.itemHeader}>
                        <div className={styles.itemLead}>
                          <strong className={styles.itemTitle}>{document.title}</strong>
                          <span className={styles.itemSubtitle}>
                            Criado por {document.createdBy.name} · {document._count.chunks} chunks
                          </span>
                        </div>
                        <div className={styles.tagWrap}>
                          <Badge variant={document.status === "READY" ? "success" : document.status === "FAILED" ? "destructive" : "warning"}>
                            {document.status}
                          </Badge>
                          <Badge variant="outline">{document.type}</Badge>
                          {document.versionLabel ? <Badge variant="outline">{document.versionLabel}</Badge> : null}
                          {document.publishedAt ? <Badge variant="outline">Published</Badge> : null}
                          {document.requiresAcknowledgement ? <Badge variant="outline">Requires ack</Badge> : null}
                        </div>
                      </div>
                      {document.description ? <span className={styles.itemDescription}>{document.description}</span> : null}
                      {document.summary ? <span className={styles.itemDescription}>{document.summary}</span> : null}
                      {document.supersedesDocument ? (
                        <span className={styles.itemDescription}>
                          Supersede {document.supersedesDocument.title}
                          {document.supersedesDocument.versionLabel ? ` · ${document.supersedesDocument.versionLabel}` : ""}
                        </span>
                      ) : null}
                      <div className={styles.subGrid2}>
                        <div className={styles.surfaceMuted}>
                          <span className={styles.itemDescription}>
                            <FileStack className="mr-2 inline h-4 w-4" />
                            {document.fileName ?? "Arquivo"}
                          </span>
                        </div>
                        <div className={styles.surfaceMuted}>
                          <span className={styles.itemDescription}>
                            {document.status === "PROCESSING" ? <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" /> : <ScanSearch className="mr-2 inline h-4 w-4" />}
                            {document.processedAt
                              ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(document.processedAt)
                              : "Ingestão em andamento"}
                          </span>
                        </div>
                      </div>
                      {latestRollout ? (
                        <div className={styles.surfaceMuted}>
                          <strong className={styles.itemTitle}>{latestRollout.title}</strong>
                          <span className={styles.itemDescription}>
                            {latestRollout.metrics.acceptanceRate}% de aceite · {latestRollout.metrics.acknowledged}/{latestRollout.metrics.assigned} confirmados
                          </span>
                          <span className={styles.itemDescription}>
                            {latestRollout.metrics.pending} pendentes
                            {latestRollout.metrics.overdue ? ` · ${latestRollout.metrics.overdue} atrasados` : ""}
                          </span>
                        </div>
                      ) : null}
                      {document.lastError ? <span className={styles.itemDescription}>{document.lastError}</span> : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>Ainda não ha materiais na knowledge base desta organização.</div>
            )}
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.spotlight}>
            <span className={styles.panelEyebrow}>Knowledge</span>
            <strong className={styles.spotlightValue}>{knowledge.metrics.readyCount}</strong>
            <p className={styles.panelDescription}>Materiais prontos para retrieval e uso operacional.</p>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Policy rollouts</span>
                <h3 className={styles.panelTitle}>Campanhas ativas</h3>
              </div>
              <span className={styles.iconLead}>
                <LibraryBig className="h-4 w-4" />
              </span>
            </div>
            {policyRollouts.length ? (
              <div className={styles.list}>
                {policyRollouts.map((rollout) => (
                  <div key={rollout.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemLead}>
                        <strong className={styles.itemTitle}>{rollout.title}</strong>
                        <span className={styles.itemSubtitle}>
                          {rollout.document.title}
                          {rollout.document.versionLabel ? ` · ${rollout.document.versionLabel}` : ""}
                        </span>
                      </div>
                      <Badge variant={rollout.status === "COMPLETED" ? "success" : "outline"}>{rollout.status}</Badge>
                    </div>
                    <span className={styles.itemDescription}>
                      {rollout.metrics.acceptanceRate}% de aceite · {rollout.metrics.acknowledged}/{rollout.metrics.assigned} confirmados
                    </span>
                    <span className={styles.itemDescription}>
                      Pendentes: {rollout.metrics.pending}
                      {rollout.metrics.overdue ? ` · Atrasados: ${rollout.metrics.overdue}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.surfaceMuted}>Nenhum rollout de policy foi iniciado ainda.</div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
