import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

import { HarpiaSurface } from "./harpia-surface";
import type { DashboardFocusItem } from "./dashboard-model";
import styles from "./harpia-dashboard-system.module.css";

function chatHref(prompt: string) {
  return `/chat?prompt=${encodeURIComponent(prompt)}`;
}

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
            <span className={styles.eyebrow}>
              {item.source === "hiring" ? "Contratação" : item.source === "operations" ? "Operação" : "Prioridade"}
            </span>
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
            <Link
              href={chatHref(`Analise este item do dashboard e proponha a próxima ação: ${item.title} (${item.subtitle}).`) as Route}
              className={styles.secondaryAction}
            >
              <Sparkles className="h-4 w-4" />
              Pensar com IA
            </Link>
          </div>
        </HarpiaSurface>

        <HarpiaSurface as="section" className={styles.panelSection}>
          <header className={styles.panelHeader}>
            <span className={styles.eyebrow}>Decisão</span>
            <h3 className={styles.panelTitle}>O que a IA pode ajudar</h3>
            <p className={styles.panelSubtitle}>Ação, explicação e aprovação quando houver risco.</p>
          </header>

          <div className={styles.queueList}>
            <Link href={chatHref(`Resolva ou encaminhe com segurança: ${item.title}. Explique o que viu, o que muda e se precisa de aprovação.`) as Route} className={styles.queueItem}>
              <span>
                <Sparkles className="mr-2 inline h-4 w-4" />
                Resolver ou encaminhar
              </span>
              <strong>IA</strong>
            </Link>
            <Link href="/people/agent-approvals" className={styles.queueItem}>
              <span>
                <ShieldCheck className="mr-2 inline h-4 w-4" />
                Aprovações pendentes
              </span>
              <strong>guardrail</strong>
            </Link>
          </div>
        </HarpiaSurface>

        <HarpiaSurface as="section" className={styles.panelSection}>
          <header className={styles.panelHeader}>
            <span className={styles.eyebrow}>Relacionados</span>
            <h3 className={styles.panelTitle}>Outros sinais fortes</h3>
            <p className={styles.panelSubtitle}>Itens que normalmente merecem a mesma janela de atenção.</p>
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
          <p className={styles.insightItem}>A coluna central junta prioridades, contratação e operação em uma única leitura.</p>
          <p className={styles.insightItem}>A lateral direita existe para contexto, não para competir com o restante da tela.</p>
        </div>
      </HarpiaSurface>

      <HarpiaSurface as="section" className={styles.panelSection}>
        <header className={styles.panelHeader}>
          <span className={styles.eyebrow}>Cockpit</span>
          <h3 className={styles.panelTitle}>Centro de decisão</h3>
          <p className={styles.panelSubtitle}>O dashboard prioriza atenção, bloqueio, aprovação e ação assistida.</p>
        </header>

        <div className={styles.queueList}>
          <Link href={chatHref("O que a IA consegue resolver hoje no workspace? Liste ações seguras, riscos e aprovações necessárias.") as Route} className={styles.queueItem}>
            <span>IA consegue resolver</span>
            <strong>agora</strong>
          </Link>
          <Link href="/people/agent-approvals" className={styles.queueItem}>
            <span>Esperando aprovação</span>
            <strong>revisar</strong>
          </Link>
          <Link href="/requests?view=risk" className={styles.queueItem}>
            <span>Em risco hoje</span>
            <strong>{urgentSignals.length}</strong>
          </Link>
        </div>
      </HarpiaSurface>

      <HarpiaSurface as="section" className={styles.panelSection}>
        <header className={styles.panelHeader}>
          <span className={styles.eyebrow}>Urgente</span>
          <h3 className={styles.panelTitle}>Fila crítica</h3>
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
          <span className={styles.eyebrow}>Sinais fortes</span>
          <h3 className={styles.panelTitle}>Candidatos fortes</h3>
          <p className={styles.panelSubtitle}>Atalhos para os perfis que merecem decisão agora.</p>
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
