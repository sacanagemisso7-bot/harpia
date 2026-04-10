"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Layers3, Radar, Sparkles, Waypoints } from "lucide-react";
import { LazyMotion, domAnimation, m, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { HarpiaMark } from "@/components/brand/harpia-logo";
import { HarpiaHeroBackground } from "@/components/marketing/harpia-hero-background";
import { Button } from "@/components/ui/button";
import { brandPaths } from "@/lib/brand";

import styles from "./harpia-landing.module.css";

const signalReadout = [
  { value: "14", label: "sinais" },
  { value: "03", label: "grupos" },
  { value: "01", label: "decisao" }
] as const;

const criterionRows = [
  ["triagem", "sem ruido"],
  ["comparacao", "com contexto"],
  ["acao", "sem friccao"]
] as const;

const finaleSignals = [
  { icon: Radar, label: "campo vivo" },
  { icon: Sparkles, label: "criterio ativo" },
  { icon: Waypoints, label: "fluxo unico" },
  { icon: Layers3, label: "camadas reais" }
] as const;

export function HarpiaLanding() {
  const reducedMotion = useReducedMotion();
  const experienceRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: experienceRef,
    offset: ["start start", "end end"]
  });

  const introOpacity = useTransform(scrollYProgress, [0, 0.18, 0.3], [1, 1, 0]);
  const introX = useTransform(scrollYProgress, [0, 0.3], [0, reducedMotion ? 0 : -110]);
  const introY = useTransform(scrollYProgress, [0, 0.3], [0, reducedMotion ? 0 : -36]);

  const ctaOpacity = useTransform(scrollYProgress, [0, 0.08, 0.22, 0.46], [0, 1, 1, 0.22]);
  const ctaX = useTransform(scrollYProgress, [0, 0.48], [0, reducedMotion ? 0 : 72]);
  const ctaY = useTransform(scrollYProgress, [0, 0.48], [0, reducedMotion ? 0 : -34]);

  const dataOpacity = useTransform(scrollYProgress, [0, 0.1, 0.28, 0.46], [0, 1, 1, 0]);
  const dataX = useTransform(scrollYProgress, [0, 0.46], [0, reducedMotion ? 0 : 88]);
  const dataY = useTransform(scrollYProgress, [0, 0.46], [0, reducedMotion ? 0 : -64]);

  const beaconOpacity = useTransform(scrollYProgress, [0, 0.08, 0.62, 0.82], [0, 1, 1, 0.38]);
  const beaconX = useTransform(scrollYProgress, [0, 0.82], [0, reducedMotion ? 0 : 42]);
  const beaconY = useTransform(scrollYProgress, [0, 0.82], [0, reducedMotion ? 0 : -48]);

  const labelOpacity = useTransform(scrollYProgress, [0, 0.08, 0.38], [0, 1, 0]);
  const labelX = useTransform(scrollYProgress, [0, 0.38], [0, reducedMotion ? 0 : -70]);

  const analysisOpacity = useTransform(scrollYProgress, [0.2, 0.3, 0.58, 0.7], [0, 1, 1, 0]);
  const analysisX = useTransform(scrollYProgress, [0.2, 0.58], [reducedMotion ? 0 : 130, 0]);
  const analysisY = useTransform(scrollYProgress, [0.2, 0.58], [reducedMotion ? 0 : 52, reducedMotion ? 0 : -24]);
  const analysisRotate = useTransform(scrollYProgress, [0.2, 0.58], [reducedMotion ? 0 : -10, reducedMotion ? 0 : -4]);

  const radarOpacity = useTransform(scrollYProgress, [0.26, 0.38, 0.62, 0.74], [0, 1, 1, 0]);
  const radarX = useTransform(scrollYProgress, [0.26, 0.74], [reducedMotion ? 0 : -120, reducedMotion ? 0 : 24]);
  const radarY = useTransform(scrollYProgress, [0.26, 0.74], [reducedMotion ? 0 : 76, reducedMotion ? 0 : -28]);

  const massOpacity = useTransform(scrollYProgress, [0.34, 0.54, 1], [0, 0.14, 0.22]);
  const massX = useTransform(scrollYProgress, [0, 1], [reducedMotion ? 0 : 34, reducedMotion ? 0 : -92]);
  const massY = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : 48]);

  const diagonalOpacity = useTransform(scrollYProgress, [0.44, 0.6, 0.9], [0, 1, 0.12]);
  const diagonalX = useTransform(scrollYProgress, [0.44, 0.9], [reducedMotion ? 0 : 80, reducedMotion ? 0 : -44]);
  const diagonalRotate = useTransform(scrollYProgress, [0.44, 0.9], [reducedMotion ? 0 : 12, reducedMotion ? 0 : -8]);

  const finalOpacity = useTransform(scrollYProgress, [0.64, 0.78, 1], [0, 1, 1]);
  const finalX = useTransform(scrollYProgress, [0.64, 1], [reducedMotion ? 0 : -120, 0]);
  const finalY = useTransform(scrollYProgress, [0.64, 1], [reducedMotion ? 0 : 58, 0]);

  return (
    <LazyMotion features={domAnimation}>
      <div ref={experienceRef} className={styles.experience}>
        <div className={styles.canvasStage}>
          <HarpiaHeroBackground />
          <div className={styles.canvasVeil} />

          <m.div className={styles.heroCluster} style={{ opacity: introOpacity, x: introX, y: introY }}>
            <p className={styles.heroEyebrow}>Harpia / Observation field</p>
            <h1 className={styles.heroTitle}>Veja alem do curriculo</h1>
            <p className={styles.heroSubline}>Precisao para decidir melhor</p>
          </m.div>

          <m.div className={styles.ctaDock} style={{ opacity: ctaOpacity, x: ctaX, y: ctaY }}>
            <span className={styles.ctaLabel}>Access layer</span>
            <Button asChild size="lg" className={styles.heroButton}>
              <Link href={brandPaths.demo}>
                Solicitar acesso
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </m.div>

          <m.aside className={styles.dataPanel} style={{ opacity: dataOpacity, x: dataX, y: dataY }}>
            <div className={styles.panelKicker}>
              <span>signal readout</span>
              <HarpiaMark className="w-4" />
            </div>
            <div className={styles.metricGrid}>
              {signalReadout.map((item) => (
                <div key={item.label} className={styles.metricCell}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </m.aside>

          <m.div className={styles.nodeBeacon} style={{ opacity: beaconOpacity, x: beaconX, y: beaconY }}>
            <span className={styles.nodeBeaconStem} />
            <span className={styles.nodeBeaconPulse} />
            <span className={styles.nodeBeaconCore} />
            <div className={styles.nodeBeaconLabel}>
              <span>node 08</span>
              shortlist
            </div>
          </m.div>

          <m.div className={styles.microLabel} style={{ opacity: labelOpacity, x: labelX }}>
            Menos ruido. Mais acerto.
          </m.div>

          <m.aside
            id="system"
            className={styles.analysisPlane}
            style={{ opacity: analysisOpacity, x: analysisX, y: analysisY, rotate: analysisRotate }}
          >
            <p className={styles.planeEyebrow}>analysis drift</p>
            <div className={styles.planeWord}>criterio</div>
            <div className={styles.planeRows}>
              {criterionRows.map(([title, copy]) => (
                <div key={title} className={styles.planeRow}>
                  <span>{title}</span>
                  <strong>{copy}</strong>
                </div>
              ))}
            </div>
          </m.aside>

          <m.aside
            id="control"
            className={styles.radarNote}
            style={{ opacity: radarOpacity, x: radarX, y: radarY }}
          >
            <p className={styles.radarLabel}>highlighted node</p>
            <strong className={styles.radarName}>Ana Costa</strong>
            <p className={styles.radarMeta}>shortlist em evidencia</p>
          </m.aside>

          <m.div className={styles.oversizedWord} style={{ opacity: massOpacity, x: massX, y: massY }}>
            DECIDE
          </m.div>

          <m.div className={styles.diagonalLabel} style={{ opacity: diagonalOpacity, x: diagonalX, rotate: diagonalRotate }}>
            Decision system in motion
          </m.div>

          <m.aside
            id="access"
            className={styles.finalPlane}
            style={{ opacity: finalOpacity, x: finalX, y: finalY }}
          >
            <p className={styles.planeEyebrow}>decision surface</p>
            <h2 className={styles.finalTitle}>Nao mostra dados. Mostra criterio.</h2>
            <div className={styles.finalSignals}>
              {finaleSignals.map((signal) => {
                const Icon = signal.icon;

                return (
                  <span key={signal.label} className={styles.finalSignal}>
                    <Icon className="h-4 w-4" />
                    {signal.label}
                  </span>
                );
              })}
            </div>
          </m.aside>
        </div>

        <div className={styles.scrollTrack}>
          <div id="vision" className={styles.scrollStep} />
          <div className={styles.scrollStep} />
          <div className={styles.scrollStep} />
          <div className={styles.scrollStep} />
        </div>
      </div>
    </LazyMotion>
  );
}
