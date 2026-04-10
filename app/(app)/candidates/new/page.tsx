import { BriefcaseBusiness, FileSearch2, UserRoundPlus } from "lucide-react";

import { CandidateForm } from "@/components/candidates/candidate-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth/permissions";

import styles from "../../workspace-expansion.module.css";
import { createCandidate } from "../actions";

export default async function NewCandidatePage() {
  await requirePermission("manage_candidates");

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Talent intake"
        title="Novo candidato"
        description="Cadastre um perfil manualmente e deixe a base pronta para curriculo, score e aplicacao."
        actions={<Badge variant="outline">Manual import</Badge>}
      />

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Entrada</span>
          <strong className={styles.statValue}>1</strong>
          <span className={styles.statHint}>Perfil novo inserido direto na base de talentos.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Resume</span>
          <strong className={styles.statValue}>PDF</strong>
          <span className={styles.statHint}>Pode ser enviado depois para parsing e IA.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Aplicacao</span>
          <strong className={styles.statValue}>Open</strong>
          <span className={styles.statHint}>O perfil pode ser vinculado a qualquer vaga aberta.</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Coverage</span>
          <strong className={styles.statValue}>360</strong>
          <span className={styles.statHint}>Contato, contexto e origem no mesmo cadastro.</span>
        </div>
      </section>

      <section className={styles.detailLayout}>
        <div className={styles.column}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelEyebrow}>Profile setup</span>
              <h2 className={styles.panelTitle}>Crie o perfil com o minimo necessario para operar rapido.</h2>
              <p className={styles.panelDescription}>
                Nome, contato, contexto atual e origem ja deixam o candidato pronto para os proximos passos.
              </p>
            </div>

            <CandidateForm action={createCandidate} submitLabel="Criar candidato" />
          </div>
        </div>

        <aside className={styles.stickyAside}>
          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Sequence</span>
                <h3 className={styles.panelTitle}>Depois do cadastro</h3>
              </div>
              <span className={styles.iconLead}>
                <UserRoundPlus className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Upload do curriculo</strong>
                <span className={styles.itemDescription}>Armazena o PDF e prepara o perfil para parsing estruturado.</span>
              </div>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Analise com IA</strong>
                <span className={styles.itemDescription}>Gera resumo, skills, gaps e perguntas sugeridas.</span>
              </div>
              <div className={styles.listItem}>
                <strong className={styles.itemTitle}>Aplicacao em vaga</strong>
                <span className={styles.itemDescription}>Entra no pipeline com score inicial e etapa definida.</span>
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Good input</span>
                <h3 className={styles.panelTitle}>O que mais ajuda</h3>
              </div>
              <span className={styles.iconLead}>
                <FileSearch2 className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.metricStack}>
              <div className={styles.metricRow}>
                <span>Headline atual</span>
                <strong>sim</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Origem correta</span>
                <strong>sim</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Localizacao</span>
                <strong>sim</strong>
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.itemHeader}>
              <div className={styles.itemLead}>
                <span className={styles.panelEyebrow}>Next step</span>
                <h3 className={styles.panelTitle}>Melhor workflow</h3>
              </div>
              <span className={styles.iconLead}>
                <BriefcaseBusiness className="h-4 w-4" />
              </span>
            </div>
            <div className={styles.surfaceMuted}>
              Crie primeiro o perfil. Em seguida, suba o curriculo e vincule a uma vaga para o score inicial entrar no fluxo.
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
