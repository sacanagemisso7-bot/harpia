import { FileStack, LibraryBig } from "lucide-react";

import { publishPolicyDocumentVersionAction, uploadKnowledgeDocument } from "@/app/(app)/knowledge/actions";
import { KnowledgeUploadForm } from "@/components/knowledge/knowledge-upload-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";
import { getKnowledgeOverview, getPolicyRolloutOverview, listPolicyDocumentsForSelect } from "@/modules/knowledge/queries";

import styles from "@/components/operations/ops-workspace.module.css";

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

  const stats = [
    { label: "Documentos", value: knowledge.metrics.totalDocuments },
    { label: "Prontos", value: knowledge.metrics.readyCount },
    { label: "Processando", value: knowledge.metrics.processingCount },
    { label: "Chunks", value: knowledge.metrics.chunkCount }
  ];

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Knowledge base</span>
        <h2 className={styles.title}>Knowledge</h2>
        <p className={styles.description}>
          A memória operacional da empresa com upload, publicação de policies e leitura clara do que já está pronto para uso.
        </p>
      </div>

      <div className={styles.statRow}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statPill}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.body}>
        <section className={styles.listPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <div>
                <h3 className={styles.panelTitle}>Base da empresa</h3>
                <p className={styles.panelDescription}>O que já está publicado, processado ou aguardando ingestão.</p>
              </div>
            </div>
          </div>

          <div className={styles.list}>
            {knowledge.documents.length ? (
              knowledge.documents.map((document) => {
                const latestRollout = latestRolloutByDocumentId.get(document.id);

                return (
                  <div key={document.id} className={styles.row}>
                    <div className={styles.rowTop}>
                      <div className={styles.rowLead}>
                        <p className={styles.rowTitle}>{document.title}</p>
                        <p className={styles.rowSubtitle}>
                          Criado por {document.createdBy.name} · {document._count.chunks} chunk(s)
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={document.status === "READY" ? "success" : document.status === "FAILED" ? "destructive" : "warning"}>
                          {document.status}
                        </Badge>
                        <Badge variant="outline">{document.type}</Badge>
                        {document.versionLabel ? <Badge variant="outline">{document.versionLabel}</Badge> : null}
                      </div>
                    </div>

                    {document.description ? <p className={styles.detailText}>{document.description}</p> : null}
                    {document.summary ? <p className={styles.detailText}>{document.summary}</p> : null}

                    <div className={styles.detailGrid}>
                      <div className={styles.detailCell}>
                        <span className={styles.metaLabel}>Arquivo</span>
                        <span className={styles.metaValue}>
                          <FileStack className="mr-2 inline h-4 w-4" />
                          {document.fileName ?? "Arquivo"}
                        </span>
                      </div>
                      <div className={styles.detailCell}>
                        <span className={styles.metaLabel}>Último processamento</span>
                        <span className={styles.metaValue}>
                          {document.processedAt
                            ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(document.processedAt)
                            : "Ingestão em andamento"}
                        </span>
                      </div>
                    </div>

                    {latestRollout ? (
                      <div className={styles.detailCell}>
                        <div className={styles.sectionHeader}>
                          <span className={styles.metaValue}>{latestRollout.title}</span>
                          <Badge variant={latestRollout.status === "COMPLETED" ? "success" : "outline"}>
                            {latestRollout.status}
                          </Badge>
                        </div>
                        <p className={styles.detailText}>
                          {latestRollout.metrics.acceptanceRate}% de aceite · {latestRollout.metrics.acknowledged}/
                          {latestRollout.metrics.assigned} confirmados
                        </p>
                        <p className={styles.detailText}>
                          {latestRollout.metrics.pending} pendente(s)
                          {latestRollout.metrics.overdue ? ` · ${latestRollout.metrics.overdue} atrasado(s)` : ""}
                        </p>
                      </div>
                    ) : null}

                    {document.lastError ? <p className={styles.detailText}>{document.lastError}</p> : null}
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyWrap}>
                <p className={styles.emptyState}>Ainda não há materiais na knowledge base desta organização.</p>
              </div>
            )}
          </div>
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Novo material</h3>
              <p className={styles.panelDescription}>Envie playbooks, policies, briefs e PDFs com ingestão automatizada.</p>
            </div>

            <KnowledgeUploadForm action={uploadKnowledgeDocument} />
          </section>

          <section className={styles.formPanel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Publicar policy</h3>
              <p className={styles.panelDescription}>Registre versão, supersessão e exigência de aceite operacional.</p>
            </div>

            <form action={publishPolicyDocumentVersionAction} className="workspace-form">
              <select name="documentId" required className="field-shell flex h-11 w-full rounded-[0.5rem] px-3.5 py-2 text-sm text-foreground">
                <option value="">Selecione uma policy pronta</option>
                {policyDocuments.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.title}
                    {document.versionLabel ? ` · ${document.versionLabel}` : ""}
                  </option>
                ))}
              </select>

              <input
                name="versionLabel"
                placeholder="Ex.: v2.0"
                className="field-shell flex h-11 w-full rounded-[0.5rem] px-3.5 py-2 text-sm text-foreground"
              />

              <select name="supersedesDocumentId" className="field-shell flex h-11 w-full rounded-[0.5rem] px-3.5 py-2 text-sm text-foreground">
                <option value="">Não supersede outra versão</option>
                {policyDocuments.map((document) => (
                  <option key={`supersede-${document.id}`} value={document.id}>
                    {document.title}
                    {document.versionLabel ? ` · ${document.versionLabel}` : ""}
                  </option>
                ))}
              </select>

              <label className={styles.detailCell}>
                <span className={styles.detailText}>
                  <input type="checkbox" name="requiresAcknowledgement" defaultChecked className="mr-3" />
                  Exigir aceite operacional desta versão
                </span>
              </label>

              <div className={styles.formActions}>
                <Button type="submit" variant="outline">
                  Publicar policy
                </Button>
              </div>
            </form>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Rollouts ativos</h3>
            </div>

            {policyRollouts.length ? (
              <div className={styles.sectionStack}>
                {policyRollouts.map((rollout) => (
                  <div key={rollout.id} className={styles.detailCell}>
                    <div className={styles.sectionHeader}>
                      <span className={styles.metaValue}>
                        <LibraryBig className="mr-2 inline h-4 w-4" />
                        {rollout.title}
                      </span>
                      <Badge variant={rollout.status === "COMPLETED" ? "success" : "outline"}>{rollout.status}</Badge>
                    </div>
                    <p className={styles.detailText}>
                      {rollout.document.title}
                      {rollout.document.versionLabel ? ` · ${rollout.document.versionLabel}` : ""}
                    </p>
                    <p className={styles.detailText}>
                      {rollout.metrics.acceptanceRate}% de aceite · {rollout.metrics.acknowledged}/{rollout.metrics.assigned} confirmados
                    </p>
                    <p className={styles.detailText}>
                      {rollout.metrics.pending} pendente(s)
                      {rollout.metrics.overdue ? ` · ${rollout.metrics.overdue} atrasado(s)` : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>Nenhum rollout de policy foi iniciado ainda.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
