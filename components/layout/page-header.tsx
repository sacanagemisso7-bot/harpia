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
    <section className="border-b border-border/80 pb-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          {eyebrow ? (
            <span className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {eyebrow}
            </span>
          ) : null}

          <div className="space-y-1">
            <h1 className="max-w-[24ch] text-[1.7rem] font-semibold tracking-[-0.04em] text-foreground lg:text-[2.15rem] lg:leading-[1.02]">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-5 text-muted-foreground">{description}</p>
          </div>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div> : null}
      </div>

      <span className="sr-only">{ghostLabel}</span>
    </section>
  );
}
