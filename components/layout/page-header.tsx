import { type ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  ghost?: string;
};

function buildGhostLabel(title: string) {
  return title
    .split(" ")
    .slice(0, 2)
    .join(" ")
    .replace(/[.,]/g, "")
    .toUpperCase();
}

export function PageHeader({ eyebrow, title, description, actions, ghost }: PageHeaderProps) {
  const ghostLabel = ghost ?? buildGhostLabel(title);

  return (
    <section className="relative overflow-hidden rounded-[1.4rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)/0.9),hsl(var(--secondary)/0.72))] px-5 py-5 shadow-[0_20px_40px_rgba(0,0,0,0.16)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(129,155,255,0.28),transparent)]" />
      <div className="pointer-events-none absolute -right-3 top-2 hidden font-display text-[5rem] font-semibold uppercase tracking-[-0.12em] text-foreground/[0.035] lg:block lg:text-[8rem]">
        {ghostLabel}
      </div>
      <div className="pointer-events-none absolute -left-10 top-6 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(129,155,255,0.16),transparent_70%)] blur-3xl" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl space-y-3">
          {eyebrow ? (
            <span className="inline-flex items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-px w-6 bg-[linear-gradient(90deg,rgba(129,155,255,0.5),transparent)]" />
              {eyebrow}
            </span>
          ) : null}

          <div className="space-y-2">
            <h1 className="max-w-[18ch] font-display text-[2.6rem] font-semibold tracking-[-0.1em] text-foreground lg:text-[4rem] lg:leading-[0.88]">
              {title}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground lg:text-[0.95rem]">{description}</p>
          </div>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-3 lg:justify-end">{actions}</div> : null}
      </div>
    </section>
  );
}
