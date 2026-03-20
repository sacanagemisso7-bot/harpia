import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FilterOption = {
  label: string;
  value: string;
};

type FilterSelect = {
  name: string;
  label: string;
  placeholder: string;
  value?: string;
  options: FilterOption[];
};

type FilterBarProps = {
  q?: string;
  placeholder?: string;
  selects?: FilterSelect[];
  resetHref: Route;
};

export function FilterBar({
  q,
  placeholder = "Buscar...",
  selects = [],
  resetHref
}: FilterBarProps) {
  return (
    <form method="get" className="panel flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-end">
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor="q">Busca</Label>
        <Input id="q" name="q" defaultValue={q} placeholder={placeholder} />
      </div>
      {selects.map((select) => (
        <div key={select.name} className="space-y-2 lg:min-w-52">
          <Label htmlFor={select.name}>{select.label}</Label>
          <select
            id={select.name}
            name={select.name}
            defaultValue={select.value ?? ""}
            className="flex h-11 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{select.placeholder}</option>
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      <div className="flex gap-3 lg:pb-0.5">
        <Button type="submit">Aplicar filtros</Button>
        <Button type="button" variant="outline" asChild>
          <Link href={resetHref}>Limpar</Link>
        </Button>
      </div>
    </form>
  );
}
