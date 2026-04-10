"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { m, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { brandPaths } from "@/lib/brand";

import styles from "./harpia-landing.module.css";

export function HarpiaHeroContent() {
  const reducedMotion = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <m.div
      className={styles.heroCopy}
      initial={{
        opacity: 0,
        y: reducedMotion ? 0 : 20,
        filter: reducedMotion ? "none" : "blur(12px)"
      }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: 1.05,
        ease
      }}
    >
      <div>
        <m.h1
          className={styles.heroTitle}
          initial={reducedMotion ? false : { opacity: 0, y: 18, clipPath: "inset(0 0 100% 0)" }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: 1.1, delay: 0.08, ease }}
        >
          Veja alem do curriculo
        </m.h1>
        <m.p
          className={styles.heroLine}
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.24, ease }}
        >
          Precisao para decidir melhor
        </m.p>
      </div>

      <m.div
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.84, delay: 0.34, ease }}
      >
        <Button asChild size="lg" className={styles.heroButton}>
          <Link href={brandPaths.demo}>
            Solicitar acesso
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </m.div>
    </m.div>
  );
}
