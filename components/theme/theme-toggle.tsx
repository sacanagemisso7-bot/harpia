"use client";

import { MonitorCog, MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted && theme === "light" ? "light" : "dark";

  return (
    <div className={cn("theme-toggle", className)} role="group" aria-label="Selecionar tema">
      <span className="theme-toggle-label">
        <MonitorCog className="h-3.5 w-3.5" />
        Tema
      </span>
      <button
        type="button"
        aria-pressed={activeTheme === "light"}
        className={cn("theme-toggle-button", activeTheme === "light" && "theme-toggle-button-active")}
        onClick={() => setTheme("light")}
      >
        <SunMedium className="h-3.5 w-3.5" />
        Claro
      </button>
      <button
        type="button"
        aria-pressed={activeTheme === "dark"}
        className={cn("theme-toggle-button", activeTheme === "dark" && "theme-toggle-button-active")}
        onClick={() => setTheme("dark")}
      >
        <MoonStar className="h-3.5 w-3.5" />
        Escuro
      </button>
    </div>
  );
}
