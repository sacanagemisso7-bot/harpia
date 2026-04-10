"use client";

import {
  m,
  useMotionTemplate,
  useReducedMotion,
  useSpring,
  useTime,
  useTransform,
  type MotionValue
} from "framer-motion";

import styles from "./harpia-dashboard.module.css";

export type HarpiaGraphClusterId = "candidates" | "analysis" | "decision";

export type HarpiaGraphCluster = {
  id: HarpiaGraphClusterId;
  label: string;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  count: number;
};

export type HarpiaGraphNode = {
  id: string;
  label: string;
  subtitle: string;
  cluster: HarpiaGraphClusterId;
  score: number;
  stageName: string;
  stagnantHours: number;
  href: string;
  x: number;
  y: number;
  size: number;
  emphasis: "neutral" | "highlighted";
};

export type HarpiaGraphEdge = {
  id: string;
  from: string;
  to: string;
  path: string;
  emphasis: "soft" | "highlighted";
};

type HarpiaGraphSystemProps = {
  clusters: HarpiaGraphCluster[];
  nodes: HarpiaGraphNode[];
  edges: HarpiaGraphEdge[];
  activeCluster: HarpiaGraphClusterId | null;
  activeNodeId: string | null;
  hoveredNodeId: string | null;
  onNodeHover: (nodeId: string | null) => void;
  onNodeSelect: (nodeId: string) => void;
  onReset: () => void;
};

function GraphNodeButton({
  node,
  activeCluster,
  activeNodeId,
  hoveredNodeId,
  onNodeHover,
  onNodeSelect,
  scanProgress
}: {
  node: HarpiaGraphNode;
  activeCluster: HarpiaGraphClusterId | null;
  activeNodeId: string | null;
  hoveredNodeId: string | null;
  onNodeHover: (nodeId: string | null) => void;
  onNodeSelect: (nodeId: string) => void;
  scanProgress: MotionValue<number>;
}) {
  const reducedMotion = useReducedMotion();
  const isHovered = hoveredNodeId === node.id;
  const isSelected = activeNodeId === node.id;
  const isDimmed = activeCluster !== null && node.cluster !== activeCluster;
  const normalizedX = node.x / 1120;
  const normalizedY = node.y / 760;

  const scanBoost = useTransform(() => {
    const progress = scanProgress.get();
    const linePosition = normalizedX * 0.64 + normalizedY * 0.36;
    const directDistance = Math.abs(progress - linePosition);
    const wrappedDistance = Math.min(directDistance, 1 - directDistance);

    return Math.max(0, 1 - wrappedDistance * 9);
  });

  const opacity = useSpring(
    useTransform(() => {
      const base = isSelected
        ? 1
        : isHovered
          ? 0.94
          : isDimmed
            ? 0.14
            : node.emphasis === "highlighted"
              ? 0.74
              : 0.42;

      return Math.min(1, base + scanBoost.get() * (isDimmed ? 0.08 : 0.16));
    }),
    { stiffness: 110, damping: 26, mass: 0.72 }
  );

  const scale = useSpring(
    useTransform(() => {
      const base = isSelected ? 1.16 : isHovered ? 1.1 : 1;
      return base + scanBoost.get() * (isDimmed ? 0.02 : 0.05);
    }),
    { stiffness: 110, damping: 24, mass: 0.68 }
  );

  const shadowAlpha = useTransform(() => {
    const base = isSelected ? 0.22 : isHovered ? 0.16 : node.emphasis === "highlighted" ? 0.08 : 0.02;
    return base + scanBoost.get() * (isDimmed ? 0.04 : 0.12);
  });
  const borderAlpha = useTransform(() => {
    const base = isSelected ? 0.28 : isHovered ? 0.2 : 0.08;
    return base + scanBoost.get() * 0.14;
  });
  const boxShadow = useMotionTemplate`
    0 0 0 0.7rem hsl(var(--accent-warm) / ${shadowAlpha}),
    0 0 28px hsl(var(--accent-warm) / ${shadowAlpha})
  `;
  const borderColor = useMotionTemplate`hsl(var(--foreground) / ${borderAlpha})`;

  return (
    <m.button
      type="button"
      className={styles.graphNode}
      data-state={
        isSelected ? "selected" : isDimmed ? "dismissed" : node.emphasis === "highlighted" ? "highlighted" : "neutral"
      }
      style={{
        left: node.x,
        top: node.y,
        width: node.size,
        height: node.size,
        opacity,
        scale,
        boxShadow,
        borderColor
      }}
      onMouseEnter={() => onNodeHover(node.id)}
      onMouseLeave={() => onNodeHover(null)}
      onFocus={() => onNodeHover(node.id)}
      onBlur={() => onNodeHover(null)}
      onClick={(event) => {
        event.stopPropagation();
        onNodeSelect(node.id);
      }}
      animate={
        reducedMotion
          ? undefined
          : {
              y: [0, node.cluster === "analysis" ? -5 : 5, 0]
            }
      }
      transition={{
        duration: 10 + node.size * 0.14,
        repeat: Infinity,
        ease: [0.45, 0, 0.55, 1]
      }}
    />
  );
}

export function HarpiaGraphSystem({
  clusters,
  nodes,
  edges,
  activeCluster,
  activeNodeId,
  hoveredNodeId,
  onNodeHover,
  onNodeSelect,
  onReset
}: HarpiaGraphSystemProps) {
  const reducedMotion = useReducedMotion();
  const time = useTime();
  const scanProgress = useTransform(time, (value) => (reducedMotion ? 0.52 : (value % 20000) / 20000));
  const scanTravel = useTransform(scanProgress, [0, 1], ["-24%", "124%"]);

  return (
    <div className={styles.graphViewport} onClick={onReset}>
      <m.div
        className={styles.graphCanvas}
        drag
        dragElastic={0.04}
        dragMomentum={false}
        dragConstraints={{ left: -140, right: 140, top: -110, bottom: 110 }}
      >
        <div className={styles.graphBackdrop} />
        <m.div className={styles.graphScanLine} style={{ x: scanTravel }} />

        {clusters.map((cluster, index) => {
          const isDimmed = activeCluster !== null && activeCluster !== cluster.id;

          return (
            <m.div
              key={cluster.id}
              className={styles.graphCluster}
              data-dimmed={isDimmed}
              style={{
                left: cluster.x,
                top: cluster.y,
                width: cluster.radiusX * 2,
                height: cluster.radiusY * 2
              }}
              animate={
                reducedMotion
                  ? undefined
                  : {
                      scale: [1, 1.02, 1]
                    }
              }
              transition={{
                duration: 14 + index * 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <span className={styles.graphClusterLabel}>{cluster.label}</span>
              <span className={styles.graphClusterCount}>{cluster.count}</span>
            </m.div>
          );
        })}

        <svg viewBox="0 0 1120 760" className={styles.graphSvg}>
          <defs>
            <linearGradient id="harpia-dashboard-edge" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--foreground) / 0.04)" />
              <stop offset="52%" stopColor="hsl(var(--foreground) / 0.1)" />
              <stop offset="100%" stopColor="hsl(var(--accent-warm) / 0.12)" />
            </linearGradient>
          </defs>
          {edges.map((edge, index) => {
            const fromNode = nodes.find((node) => node.id === edge.from);
            const toNode = nodes.find((node) => node.id === edge.to);
            const belongsToCluster =
              activeCluster === null ||
              fromNode?.cluster === activeCluster ||
              toNode?.cluster === activeCluster;

            return (
              <m.path
                key={edge.id}
                d={edge.path}
                fill="none"
                stroke="url(#harpia-dashboard-edge)"
                strokeWidth={edge.emphasis === "highlighted" ? "0.82" : "0.58"}
                strokeLinecap="round"
                initial={{ opacity: edge.emphasis === "highlighted" ? 0.18 : 0.1 }}
                animate={
                  reducedMotion
                    ? { opacity: belongsToCluster ? (edge.emphasis === "highlighted" ? 0.2 : 0.12) : 0.04 }
                    : {
                        opacity: belongsToCluster
                          ? edge.emphasis === "highlighted"
                            ? [0.12, 0.22, 0.14]
                            : [0.08, 0.14, 0.1]
                          : [0.03, 0.05, 0.04]
                      }
                }
                transition={{
                  duration: 8 + index * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.16
                }}
              />
            );
          })}
        </svg>

        {nodes.map((node) => (
          <GraphNodeButton
            key={node.id}
            node={node}
            activeCluster={activeCluster}
            activeNodeId={activeNodeId}
            hoveredNodeId={hoveredNodeId}
            onNodeHover={onNodeHover}
            onNodeSelect={onNodeSelect}
            scanProgress={scanProgress}
          />
        ))}
      </m.div>
    </div>
  );
}
