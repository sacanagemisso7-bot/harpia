import { type ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <section className="panel aurora surface-border relative overflow-hidden px-6 py-7 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 grid-fade opacity-40" />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          {eyebrow ? <div className="section-intro">{eyebrow}</div> : null}
          <div className="space-y-2">
            <h1 className="font-display text-4xl font-semibold tracking-tight lg:text-5xl">{title}</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground lg:text-base">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
