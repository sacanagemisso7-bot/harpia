"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookmarkPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SavedViewState = {
  error?: string;
  success?: string;
};

const initialState: SavedViewState = {};

type SavedViewFormProps = {
  query: string;
  type: string;
  action: (state: SavedViewState, formData: FormData) => Promise<SavedViewState>;
};

export function SavedViewForm({ query, type, action }: SavedViewFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <input type="hidden" name="query" value={query} />
      <input type="hidden" name="type" value={type} />
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor={`${type}-view-name`}>Salvar view atual</Label>
        <Input id={`${type}-view-name`} name="name" placeholder="Ex.: Vagas abertas prioritarias" />
      </div>
      <Button type="submit" disabled={pending}>
        <BookmarkPlus className="mr-2 h-4 w-4" />
        {pending ? "Salvando..." : "Salvar view"}
      </Button>
      <FormMessage message={state.error} />
    </form>
  );
}
