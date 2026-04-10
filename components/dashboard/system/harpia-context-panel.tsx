import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HarpiaSurface } from "./harpia-surface";
import type { DashboardFocusItem } from "./dashboard-model";
import styles from "./harpia-dashboard-system.module.css";

export function HarpiaContextPanel({
  item,
  topSignals,
  urgentSignals
}: {
  item: DashboardFocusItem | null;
  topSignals: DashboardFocusItem[];
  urgentSignals: DashboardFocusItem[];
}) {
  if (item) {
    return (
      <div className={styles.secondaryStack}>
        <HarpiaSurface as="aside" className={styles.panelSection}>
          <header className={styles.panelHeader}>
            <span className={styles.eyebrow}>{item.source}</span>
            <h2 className={styles.panelTitle}>{item.title}</h2>
            <p className={styles.panelSubtitle}>{item.subtitle}</p>
          </header>

          <div className={styles.metricList}>
            <div className={styles.metricRow}>
              <span>Status</span>
              <strong>{item.value}</strong>
            </div>
            <div className={styles.metricRow}>
              <span>Contexto</span>
              <strong>{item.meta}</strong>
            </div>
          </div>

          <div className={styles.insightList}>
            {item.insights.map((insight) => (
              <p key={insight} className={styles.insightItem}>
                {insight}
              </p>
            ))}
          </div>

          <div className={styles.actionRow}>
            <Link href={item.href} className={styles.primaryAction}>
              Abrir item
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className={styles.secondaryAction}>Painel contextual</span>
          </div>
        </HarpiaSurface>

        <HarpiaSurface as="section" className={styles.panelSection}>
          <header className={styles.panelHeader}>
            <span className={styles.eyebrow}>Relacionados</span>
            <h3 className={styles.panelTitle}>Outros sinais fortes</h3>
            <p className={styles.panelSubtitle}>Itens que normalmente merecem a mesma janela de atencao.</p>
          </header>

          <div className={styles.candidateList}>
            {topSignals.filter((entry) => entry.id !== item.id).slice(0, 4).map((entry) => (
              <Link key={entry.id} href={entry.href} className={styles.candidateItem}>
                <span>{entry.title}</span>
                <strong>{entry.value}</strong>
              </Link>
            ))}
          </div>
        </HarpiaSurface>
      </div>
    );
  }

  return (
    <div className={styles.secondaryStack}>
      <HarpiaSurface as="aside" className={styles.panelSection}>
        <header className={styles.panelHeader}>
          <span className={styles.eyebrow}>Resumo</span>
          <h2 className={styles.panelTitle}>Comece pelo que importa</h2>
          <p className={styles.panelSubtitle}>Selecione um item no centro para abrir detalhes aqui.</p>
        </header>

        <div className={styles.insightList}>
          <p className={styles.insightItem}>A coluna central junta prioridades, hiring e operacao em uma unica leitura.</p>
          <p className={styles.insightItem}>A lateral direita existe para contexto, nao para competir com o restante da tela.</p>
        </div>
      </HarpiaSurface>

      <HarpiaSurface as="section" className={styles.panelSection}>
        <header className={styles.panelHeader}>
          <span className={styles.eyebrow}>Urgente</span>
          <h3 className={styles.panelTitle}>Fila critica</h3>
          <p className={styles.panelSubtitle}>Os pontos que valem revisar primeiro.</p>
        </header>

        <div className={styles.queueList}>
          {urgentSignals.slice(0, 4).map((entry) => (
            <Link key={entry.id} href={entry.href} className={styles.queueItem}>
              <span>{entry.title}</span>
              <strong>{entry.value}</strong>
            </Link>
          ))}
        </div>
      </HarpiaSurface>

      <HarpiaSurface as="section" className={styles.panelSection}>
        <header className={styles.panelHeader}>
          <span className={styles.eyebrow}>Top signals</span>
          <h3 className={styles.panelTitle}>Candidatos fortes</h3>
          <p className={styles.panelSubtitle}>Atalhos para os perfis que merecem decisao agora.</p>
        </header>

        <div className={styles.candidateList}>
          {topSignals.slice(0, 4).map((entry) => (
            <Link key={entry.id} href={entry.href} className={styles.candidateItem}>
              <span>{entry.title}</span>
              <strong>{entry.value}</strong>
            </Link>
          ))}
        </div>
      </HarpiaSurface>
    </div>
  );
}
