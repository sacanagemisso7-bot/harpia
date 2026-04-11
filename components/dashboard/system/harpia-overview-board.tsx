import { AlertTriangle, CalendarClock, UsersRound } from "lucide-react";

import { HarpiaSurface } from "./harpia-surface";
import type { DashboardFocusItem } from "./dashboard-model";
import styles from "./harpia-dashboard-system.module.css";

function joinClasses(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function HarpiaOverviewBoard({
  priorityItems,
  hiringItems,
  operationsItems,
  selectedItemId,
  onSelectItem
}: {
  priorityItems: DashboardFocusItem[];
  hiringItems: DashboardFocusItem[];
  operationsItems: DashboardFocusItem[];
  selectedItemId: string | null;
  onSelectItem: (item: DashboardFocusItem) => void;
}) {
  const groups = [
    {
      key: "priority",
      eyebrow: "Prioridade",
      title: "O que pede aten??o agora",
      hint: "Riscos, SLAs e travas que pedem resposta r?pida.",
      icon: <AlertTriangle className="h-4 w-4" />,
      items: priorityItems
    },
    {
      key: "hiring",
      eyebrow: "Hiring",
      title: "Quem merece decisão",
      hint: "Perfis fortes e movimentos do pipeline.",
      icon: <UsersRound className="h-4 w-4" />,
      items: hiringItems
    },
    {
      key: "operations",
      eyebrow: "Operação",
      title: "O que acontece hoje",
      hint: "Workflows, agenda e janelas operacionais abertas.",
      icon: <CalendarClock className="h-4 w-4" />,
      items: operationsItems
    }
  ];

  return (
    <HarpiaSurface as="section" className={styles.boardPanel}>
      <div className={styles.boardHeader}>
        <div>
          <span className={styles.eyebrow}>Workspace</span>
          <h2 className={styles.boardTitle}>Central de operação</h2>
          <p className={styles.boardSubtitle}>Tudo o que precisa de leitura r?pida sem depender de visualizacao complexa.</p>
        </div>

        <div className={styles.boardLegend}>
          <span className={styles.legendPill}>Clique para focar</span>
          <span className={styles.legendPill}>Painel direito contextual</span>
        </div>
      </div>

      <div className={styles.boardGrid}>
        {groups.map((group) => (
          <div key={group.key} className={styles.boardColumn}>
            <div className={styles.boardColumnHeader}>
              <span className={styles.boardColumnIcon}>{group.icon}</span>
              <div className={styles.boardColumnTitle}>
                <span className={styles.eyebrow}>{group.eyebrow}</span>
                <strong>{group.title}</strong>
                <p>{group.hint}</p>
              </div>
            </div>

            <div className={styles.boardList}>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={joinClasses(
                    styles.boardItem,
                    selectedItemId === item.id && styles.boardItemActive,
                    item.tone === "critical" && styles.boardItemCritical
                  )}
                  onClick={() => onSelectItem(item)}
                >
                  <div className={styles.boardItemTop}>
                    <span className={styles.boardItemTitle}>{item.title}</span>
                    <span className={styles.boardItemValue}>{item.value}</span>
                  </div>
                  <span className={styles.boardItemSubtitle}>{item.subtitle}</span>
                  <span className={styles.boardItemMeta}>{item.meta}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </HarpiaSurface>
  );
}
