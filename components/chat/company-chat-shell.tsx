"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";

type CompanyChatShellProps = {
  rail: ReactNode;
  header: ReactNode;
  body: ReactNode;
  composer: ReactNode;
  hasActiveThread: boolean;
  className?: string;
  railClassName?: string;
  mainClassName?: string;
  overlayClassName?: string;
  railPanelClassName?: string;
  topbarClassName?: string;
  railToggleClassName?: string;
  bodyClassName?: string;
  composerClassName?: string;
};

export function CompanyChatShell({
  rail,
  header,
  body,
  composer,
  hasActiveThread,
  className,
  railClassName,
  mainClassName,
  overlayClassName,
  railPanelClassName,
  topbarClassName,
  railToggleClassName,
  bodyClassName,
  composerClassName
}: CompanyChatShellProps) {
  const [railOpen, setRailOpen] = useState(!hasActiveThread);

  useEffect(() => {
    setRailOpen(!hasActiveThread);
  }, [hasActiveThread]);

  return (
    <div className={cn(className)} data-rail-open={railOpen ? "true" : "false"}>
      <button
        type="button"
        aria-label="Fechar conversas"
        className={cn(overlayClassName)}
        onClick={() => setRailOpen(false)}
      />

      <aside className={cn(railPanelClassName)} aria-label="Conversas salvas">
        <div className={cn(railClassName)}>{rail}</div>
      </aside>

      <section className={cn(mainClassName)}>
        <div className={cn(topbarClassName)}>
          <button
            type="button"
            className={cn(railToggleClassName)}
            aria-label={railOpen ? "Ocultar conversas" : "Mostrar conversas"}
            onClick={() => setRailOpen((current) => !current)}
          >
            {railOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            <span>{railOpen ? "Ocultar conversas" : "Conversas"}</span>
          </button>

          {header}
        </div>

        <div className={cn(bodyClassName)}>{body}</div>
        <div className={cn(composerClassName)}>{composer}</div>
      </section>
    </div>
  );
}
