"use client";

import { useMemo, useRef, useState } from "react";
import { WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import styles from "@/components/operations/ops-workspace.module.css";

type AssistedCreateBoxProps = {
  mode: "request" | "task" | "candidate" | "note" | "workflow";
  fieldNames: {
    title?: string;
    description?: string;
    category?: string;
    priority?: string;
    sourceType?: string;
  };
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function inferPriority(text: string) {
  const normalized = normalize(text);

  if (normalized.includes("urgente") || normalized.includes("critico") || normalized.includes("hoje")) {
    return "URGENT";
  }

  if (normalized.includes("risco") || normalized.includes("amanha") || normalized.includes("bloque")) {
    return "HIGH";
  }

  if (normalized.includes("baixa") || normalized.includes("quando der")) {
    return "LOW";
  }

  return "MEDIUM";
}

function inferCategory(text: string) {
  const normalized = normalize(text);

  if (normalized.includes("ferias")) {
    return "VACATION";
  }

  if (normalized.includes("benef")) {
    return "BENEFITS";
  }

  if (normalized.includes("document") || normalized.includes("declar")) {
    return "DOCUMENTS";
  }

  if (normalized.includes("politica") || normalized.includes("compliance")) {
    return "POLICY";
  }

  if (normalized.includes("carta")) {
    return "LETTER";
  }

  if (normalized.includes("cadastro")) {
    return "PERSONAL_DATA";
  }

  return "GENERAL_SUPPORT";
}

function setFormField(form: HTMLFormElement, name: string | undefined, value: string) {
  if (!name) {
    return;
  }

  const field = form.elements.namedItem(name);

  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
    return;
  }

  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

export function AssistedCreateBox({ mode, fieldNames }: AssistedCreateBoxProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [prompt, setPrompt] = useState("");
  const parsed = useMemo(() => {
    const cleaned = prompt.trim().replace(/\s+/g, " ");
    const firstSentence = cleaned.split(/[.!?\n]/)[0]?.trim() ?? cleaned;
    return {
      title: firstSentence.slice(0, 92) || "Novo item assistido",
      description: cleaned,
      priority: inferPriority(cleaned),
      category: inferCategory(cleaned),
      sourceType: mode === "task" ? "ai_assisted" : "manual"
    };
  }, [mode, prompt]);

  function applySuggestion() {
    const form = rootRef.current?.closest("form");

    if (!form || !prompt.trim()) {
      return;
    }

    setFormField(form, fieldNames.title, parsed.title);
    setFormField(form, fieldNames.description, parsed.description);
    setFormField(form, fieldNames.priority, parsed.priority);
    setFormField(form, fieldNames.category, parsed.category);
    setFormField(form, fieldNames.sourceType, parsed.sourceType);
  }

  return (
    <div ref={rootRef} className={styles.assistedCreate}>
      <div className={styles.assistedCreateHeader}>
        <span className={styles.metaLabel}>Criação assistida</span>
        <Button type="button" size="sm" variant="outline" onClick={applySuggestion} disabled={!prompt.trim()}>
          <WandSparkles className="mr-2 h-4 w-4" />
          Estruturar
        </Button>
      </div>
      <Textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        className={styles.textareaCompact}
        placeholder="Escreva solto: quem pediu, o que precisa, urgência e prazo. O Harpia estrutura os campos."
      />
      {prompt.trim() ? (
        <div className={styles.assistedPreview}>
          <span>{parsed.title}</span>
          <span>{parsed.priority}</span>
          {mode === "request" ? <span>{parsed.category}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
