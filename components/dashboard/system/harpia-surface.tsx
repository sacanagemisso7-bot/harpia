import type { HTMLAttributes, ReactNode } from "react";

import styles from "./harpia-dashboard-system.module.css";

type HarpiaSurfaceTag = "div" | "aside" | "section" | "header" | "footer";

type HarpiaSurfaceProps = {
  as?: HarpiaSurfaceTag;
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>;

function joinClasses(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function HarpiaSurface({
  as,
  className,
  children,
  ...props
}: HarpiaSurfaceProps) {
  const Comp = (as ?? "div") as HarpiaSurfaceTag;

  return (
    <Comp className={joinClasses(styles.surface, className)} {...props}>
      {children}
    </Comp>
  );
}
