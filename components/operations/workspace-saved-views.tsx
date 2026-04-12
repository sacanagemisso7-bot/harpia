"use client";

import { SavedViewType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BookmarkPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import styles from "./ops-workspace.module.css";

type SavedViewRecord = {
  id: string;
  name: string;
  query: string;
};

type SaveWorkspaceViewResult = {
  error?: string;
  success?: string;
};

type WorkspaceSavedViewsProps = {
  views: SavedViewRecord[];
  currentQuery: string;
  onApply: (query: string) => void;
  type: SavedViewType;
  saveWorkspaceViewAction: (formData: FormData) => Promise<SaveWorkspaceViewResult>;
  deleteSavedViewAction: (formData: FormData) => Promise<void>;
};

export function WorkspaceSavedViews({
  views,
  currentQuery,
  onApply,
  type,
  saveWorkspaceViewAction,
  deleteSavedViewAction
}: WorkspaceSavedViewsProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    const trimmed = name.trim();

    if (!trimmed) {
      return;
    }

    const formData = new FormData();
    formData.set("name", trimmed);
    formData.set("query", currentQuery);
    formData.set("type", type);

    startTransition(async () => {
      const result = await saveWorkspaceViewAction(formData);
      setFeedback(result.error ?? result.success ?? null);

      if (!result.error) {
        setName("");
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    const formData = new FormData();
    formData.set("savedViewId", id);
    formData.set("type", type);

    startTransition(async () => {
      await deleteSavedViewAction(formData);
      router.refresh();
    });
  }

  return (
    <div className={styles.savedViews}>
      <div className={styles.savedViewsForm}>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSave();
            }
          }}
          placeholder="Salvar visão atual"
          className={styles.savedViewsInput}
        />
        <Button type="button" variant="outline" onClick={handleSave} disabled={!name.trim() || pending}>
          <BookmarkPlus className="mr-2 h-4 w-4" />
          {pending ? "Salvando..." : "Salvar vista"}
        </Button>
      </div>

      {feedback ? <p className={styles.savedViewsFeedback}>{feedback}</p> : null}

      {views.length ? (
        <div className={styles.savedViewsList}>
          {views.map((view) => (
            <div key={view.id} className={styles.savedViewItem}>
              <button type="button" className={styles.savedViewButton} onClick={() => onApply(view.query)}>
                {view.name}
              </button>
              <button
                type="button"
                className={styles.savedViewDelete}
                onClick={() => handleDelete(view.id)}
                aria-label={`Remover ${view.name}`}
                disabled={pending}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
