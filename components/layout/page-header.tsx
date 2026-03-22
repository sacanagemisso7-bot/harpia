import { type ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <section className="panel surface-border shadow-aura relative overflow-hidden px-6 py-7 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-70 [background:linear-gradient(180deg,rgba(255,255,255,0.025),transparent)]" />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3.5">
          {eyebrow ? <div className="section-intro text-white/48">{eyebrow}</div> : null}
          <div className="space-y-2.5">
            <h1 className="font-display text-[2.2rem] font-semibold tracking-[-0.045em] text-white lg:text-[3rem]">{title}</h1>
            <p className="max-w-2xl text-sm leading-7 text-white/60 lg:text-[0.98rem]">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
