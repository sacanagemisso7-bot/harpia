import Link from "next/link";
import { ArrowRight, FileSearch2, UserRoundPlus } from "lucide-react";

import { CandidateForm } from "@/components/candidates/candidate-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/permissions";

import styles from "@/components/operations/ops-workspace.module.css";
import { createCandidate } from "../actions";

export default async function NewCandidatePage() {
  await requirePermission("manage_candidates");

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>Talentos</span>
        <h2 className={styles.title}>Novo candidato</h2>
        <p className={styles.description}>
          Cadastre o perfil uma vez, deixe a base pronta para currículo, análise com IA e aplicação em vaga sem abrir
          uma sequência de telas.
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.statPill}>
          <strong>Entrada manual</strong>
          <span>Base de talentos organizada desde o primeiro contato</span>
        </div>
        <div className={styles.statPill}>
          <strong>Currículo depois</strong>
          <span>O PDF pode entrar assim que o perfil estiver salvo</span>
        </div>
        <div className={styles.statPill}>
          <strong>Aplicação rápida</strong>
          <span>Vincule o perfil direto em qualquer vaga aberta</span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarMeta}>
          <div className={styles.tabs}>
            <Button asChild size="sm">
              <Link href="/candidates">
                Voltar para candidatos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/jobs">Abrir vagas</Link>
            </Button>
          </div>
          <span className={styles.shortcutHint}>Menos cadastro cerimonial e mais perfil pronto para operar.</span>
        </div>
      </div>

      <div className={styles.body}>
        <section className={styles.formPanel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Dados essenciais</h3>
            <p className={styles.panelDescription}>
              Nome, contato, contexto atual e origem já colocam o candidato no fluxo.
            </p>
          </div>

          <CandidateForm action={createCandidate} submitLabel="Criar candidato" />
        </section>

        <aside className={styles.detailColumn}>
          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>O que acontece depois</h3>
              <Badge variant="outline">Fluxo simples</Badge>
            </div>

            <div className={styles.sectionStack}>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>
                  <UserRoundPlus className="mr-2 inline h-4 w-4" />
                  Perfil salvo
                </span>
                <p className={styles.detailText}>O candidato entra imediatamente no workspace de talentos.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>
                  <FileSearch2 className="mr-2 inline h-4 w-4" />
                  Currículo e IA
                </span>
                <p className={styles.detailText}>Depois do upload, a IA pode gerar resumo, skills, gaps e perguntas.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaValue}>Aplicação em vaga</span>
                <p className={styles.detailText}>Assim que fizer sentido, o perfil pode entrar em qualquer vaga aberta.</p>
              </div>
            </div>
          </section>

          <section className={styles.detailPanel}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.panelTitle}>Melhor cadastro</h3>
            </div>

            <div className={styles.sectionStack}>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Vale priorizar</span>
                <p className={styles.detailText}>Headline atual, origem correta, localização e um resumo curto do perfil.</p>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.metaLabel}>Pode deixar para depois</span>
                <p className={styles.detailText}>Detalhes finos podem entrar junto com o currículo e as primeiras notas.</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
