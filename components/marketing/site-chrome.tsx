import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HarpiaLogo } from "@/components/brand/harpia-logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { brand, brandPaths } from "@/lib/brand";

type SiteChromeProps = {
  children: React.ReactNode;
};

export function SiteChrome({ children }: SiteChromeProps) {
  return (
    <main className="min-h-screen pb-8 pt-0 lg:pb-10">
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <div className="relative h-0">
          <div className="pointer-events-auto absolute left-4 top-4 lg:left-6">
            <Link
              href="/"
              className="glass-strip flex items-center gap-3 rounded-[1.2rem] border border-border/70 px-4 py-3 shadow-[0_20px_44px_rgba(0,0,0,0.18)] backdrop-blur-xl"
            >
              <HarpiaLogo variant="compact" />
            </Link>
          </div>

          <div className="pointer-events-auto absolute right-4 top-4 flex items-start gap-3 lg:right-6">
            <nav className="glass-strip hidden items-center gap-6 rounded-[1.2rem] border border-border/70 px-4 py-3 text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground shadow-[0_20px_44px_rgba(0,0,0,0.18)] backdrop-blur-xl xl:flex">
              <Link href="/#vision" className="site-nav-link">
                Visão
              </Link>
              <Link href="/#system" className="site-nav-link">
                Sistema
              </Link>
              <Link href="/#control" className="site-nav-link">
                Controle
              </Link>
              <Link href={brandPaths.pricing} className="site-nav-link">
                Pricing
              </Link>
            </nav>

            <div className="glass-strip flex items-center gap-3 rounded-[1.2rem] border border-border/70 px-3 py-3 shadow-[0_20px_44px_rgba(0,0,0,0.18)] backdrop-blur-xl">
              <ThemeToggle className="hidden lg:inline-flex" />
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href={brandPaths.executiveDeck}>PDF</Link>
              </Button>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href={{ pathname: brandPaths.login, query: { callbackUrl: "/dashboard" } }}>Entrar</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div>{children}</div>

      <footer className="relative z-10 px-4 pb-3 pt-8 lg:px-6">
        <div className="ml-auto flex max-w-[74rem] flex-col gap-6 rounded-[1.6rem] border border-border/70 bg-card/32 px-4 py-6 backdrop-blur-xl lg:flex-row lg:items-end lg:justify-between lg:px-6">
          <div className="space-y-3">
            <HarpiaLogo />
            <p className="max-w-lg text-sm leading-7 text-muted-foreground">
              {brand.marketingEyebrow}. Sistema de decisão para recrutamento e people ops.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
            <Link href={brandPaths.pricing} className="hover:text-foreground">
              Pricing
            </Link>
            <Link href={brandPaths.demo} className="hover:text-foreground">
              Agendar demo
            </Link>
            <Link href={brandPaths.careersDemo} className="hover:text-foreground">
              Careers demo
            </Link>
            <Link href={brandPaths.executiveDeck} className="hover:text-foreground">
              PDF executivo
            </Link>
            <Button asChild size="sm">
              <Link href={brandPaths.demo}>
                Ver Harpia
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </footer>
    </main>
  );
}
