"use client";

import type { Route } from "next";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

import styles from "./harpia-command-palette.module.css";

const COMMAND_RECENT_STORAGE_KEY = "harpia-command-recent";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export type HarpiaCommandItem = {
  id: string;
  label: string;
  description?: string;
  href: Route;
  section?: string;
  keywords?: string[];
};

type HarpiaCommandPaletteProps = {
  items: HarpiaCommandItem[];
  className?: string;
  triggerClassName?: string;
  triggerLabel?: string;
};

function isSameOrNestedPath(pathname: string, href: Route) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HarpiaCommandPalette({
  items,
  className,
  triggerClassName,
  triggerLabel = "Buscar ou navegar..."
}: HarpiaCommandPaletteProps) {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COMMAND_RECENT_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      setRecentIds(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
    } catch {
      setRecentIds([]);
    }
  }, [open]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (!event.metaKey && !event.ctrlKey && event.key === "/" && !open && !isEditableTarget(event.target)) {
        event.preventDefault();
        setOpen(true);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const currentItem = items.find((item) => isSameOrNestedPath(pathname, item.href));

    if (!currentItem) {
      return;
    }

    updateRecentItems(currentItem.id);
  }, [items, pathname]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }

    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const filteredItems = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();

    if (!normalized) {
      return items;
    }

    return items.filter((item) => {
      const haystack = [item.label, item.description ?? "", item.section ?? "", ...(item.keywords ?? [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [deferredQuery, items]);

  const groupedItems = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    const groups = new Map<string, HarpiaCommandItem[]>();
    const seen = new Set<string>();

    if (!normalized && recentIds.length) {
      const recentItems = recentIds
        .map((recentId) => filteredItems.find((item) => item.id === recentId))
        .filter((item): item is HarpiaCommandItem => !!item);

      if (recentItems.length) {
        groups.set("Recentes", recentItems);
        recentItems.forEach((item) => seen.add(item.id));
      }
    }

    for (const item of filteredItems) {
      if (seen.has(item.id)) {
        continue;
      }

      const section = item.section ?? "Workspace";
      const current = groups.get(section) ?? [];
      current.push(item);
      groups.set(section, current);
    }

    return Array.from(groups.entries());
  }, [deferredQuery, filteredItems, recentIds]);

  const flatItems = useMemo(() => groupedItems.flatMap(([, sectionItems]) => sectionItems), [groupedItems]);

  useEffect(() => {
    if (activeIndex > flatItems.length - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, flatItems.length]);

  function updateRecentItems(itemId: string) {
    setRecentIds((current) => {
      const next = [itemId, ...current.filter((existingId) => existingId !== itemId)].slice(0, 6);

      try {
        window.localStorage.setItem(COMMAND_RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage failures and keep the UI working.
      }

      return next;
    });
  }

  function handleSelect(item: HarpiaCommandItem) {
    updateRecentItems(item.id);
    router.push(item.href);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={cn(styles.trigger, triggerClassName)}
        onClick={() => setOpen(true)}
        aria-label="Abrir busca e navegação rápida"
      >
        <span className={styles.triggerLead}>
          <Search className="h-4 w-4" />
          <span>{triggerLabel}</span>
        </span>
        <span className={styles.triggerHint}>Ctrl K</span>
      </button>

      {open ? (
        <>
          <button type="button" className={styles.backdrop} aria-label="Fechar busca rápida" onClick={() => setOpen(false)} />

          <div className={cn(styles.dialog, className)} role="dialog" aria-modal="true" aria-label="Busca rápida">
            <div className={styles.searchWrap}>
              <Search className={styles.searchIcon} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveIndex((current) => (flatItems.length ? (current + 1) % flatItems.length : 0));
                    return;
                  }

                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveIndex((current) => (flatItems.length ? (current - 1 + flatItems.length) % flatItems.length : 0));
                    return;
                  }

                  if (event.key === "Home") {
                    event.preventDefault();
                    setActiveIndex(0);
                    return;
                  }

                  if (event.key === "End") {
                    event.preventDefault();
                    setActiveIndex(flatItems.length ? flatItems.length - 1 : 0);
                    return;
                  }

                  if (event.key === "Enter" && flatItems[activeIndex]) {
                    event.preventDefault();
                    handleSelect(flatItems[activeIndex]);
                  }
                }}
                className={styles.searchInput}
                placeholder="Digite um módulo, página ou ação"
              />
            </div>

            <div className={styles.results}>
              {groupedItems.length ? (
                groupedItems.map(([section, sectionItems]) => (
                  <div key={section} className={styles.group}>
                    <span className={styles.groupLabel}>{section}</span>

                    {sectionItems.map((item) => {
                      const isCurrent = isSameOrNestedPath(pathname, item.href);
                      const isSelected = flatItems[activeIndex]?.id === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={cn(styles.item, isSelected && styles.itemSelected, isCurrent && styles.itemCurrent)}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setActiveIndex(flatItems.findIndex((entry) => entry.id === item.id))}
                        >
                          <span className={styles.itemCopy}>
                            <span className={styles.itemLabel}>{item.label}</span>
                            {item.description ? <span className={styles.itemDescription}>{item.description}</span> : null}
                          </span>

                          <span className={styles.itemMeta}>{isCurrent ? "Atual" : item.section ?? "Abrir"}</span>
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className={styles.empty}>
                  <strong>Nada encontrado</strong>
                  <span>Tente buscar por módulo, tarefa ou área do produto.</span>
                </div>
              )}
            </div>

            <div className={styles.footer}>
              <span>Ctrl K ou / abrem a navegação rápida de qualquer área do produto.</span>
              <span className={styles.itemMeta}>
                <CornerDownLeft className="h-3.5 w-3.5" />
                Setas navegam, Enter abre, Esc fecha
              </span>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
