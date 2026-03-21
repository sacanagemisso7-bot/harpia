import { type ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <section className="panel aurora surface-border shadow-aura relative overflow-hidden px-6 py-7 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(120,178,255,0.12),transparent_34%),radial-gradient(circle_at_90%_22%,rgba(255,191,118,0.08),transparent_22%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 grid-fade opacity-26" />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          {eyebrow ? <div className="section-intro text-white/48">{eyebrow}</div> : null}
          <div className="space-y-2">
            <h1 className="font-display text-4xl font-semibold tracking-[-0.04em] text-white lg:text-5xl">{title}</h1>
            <p className="max-w-2xl text-sm leading-7 text-white/68 lg:text-base">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
