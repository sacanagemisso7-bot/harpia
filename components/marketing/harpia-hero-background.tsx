"use client";

import dynamic from "next/dynamic";

import type { HarpiaConnectionData } from "@/components/graph/harpia-connections";
import { HarpiaGraphFallback, type HarpiaGraphClusterGL, type HarpiaGraphGL } from "@/components/graph/harpia-graph-gl";
import type { HarpiaNodeData } from "@/components/graph/harpia-node";

import styles from "./harpia-landing.module.css";

const HarpiaGraphGLCanvas = dynamic(
  () => import("@/components/graph/harpia-graph-gl").then((module) => module.HarpiaGraphGL),
  {
    ssr: false,
    loading: () => <HarpiaGraphFallback className={styles.signalField} />
  }
) as typeof HarpiaGraphGL;

const heroNodes: HarpiaNodeData[] = [
  { id: "n1", cluster: "observe", x: -5.1, y: 1.95, z: -1.05, coord: [0.1, 0.2], size: 0.2, emphasis: "neutral" },
  { id: "n2", cluster: "observe", x: -4.2, y: -0.1, z: -0.86, coord: [0.16, 0.44], size: 0.22, emphasis: "neutral" },
  { id: "n3", cluster: "observe", x: -3.5, y: 0.84, z: -0.62, coord: [0.22, 0.32], size: 0.28, emphasis: "highlighted" },
  { id: "n4", cluster: "observe", x: -3.1, y: -1.62, z: -0.48, coord: [0.27, 0.66], size: 0.18, emphasis: "neutral" },
  { id: "n5", cluster: "analysis", x: -1.84, y: 1.2, z: -0.28, coord: [0.38, 0.24], size: 0.32, emphasis: "highlighted" },
  { id: "n6", cluster: "analysis", x: -0.54, y: 0.12, z: -0.04, coord: [0.47, 0.44], size: 0.24, emphasis: "neutral" },
  { id: "n7", cluster: "analysis", x: 0.36, y: 1.7, z: 0.12, coord: [0.53, 0.2], size: 0.26, emphasis: "highlighted" },
  { id: "n8", cluster: "analysis", x: 1.16, y: -1.1, z: 0.26, coord: [0.6, 0.62], size: 0.24, emphasis: "neutral" },
  { id: "n9", cluster: "analysis", x: 1.82, y: 0.52, z: 0.38, coord: [0.65, 0.38], size: 0.28, emphasis: "highlighted" },
  { id: "n10", cluster: "decision", x: 2.74, y: -0.24, z: 0.54, coord: [0.72, 0.46], size: 0.34, emphasis: "highlighted" },
  { id: "n11", cluster: "decision", x: 3.32, y: 1.56, z: 0.82, coord: [0.77, 0.24], size: 0.22, emphasis: "neutral" },
  { id: "n12", cluster: "decision", x: 4.18, y: 0.8, z: 1.04, coord: [0.84, 0.34], size: 0.3, emphasis: "highlighted" },
  { id: "n13", cluster: "decision", x: 4.54, y: -1.34, z: 1.12, coord: [0.88, 0.68], size: 0.2, emphasis: "neutral" },
  { id: "n14", cluster: "decision", x: 3.08, y: -1.98, z: 0.72, coord: [0.75, 0.8], size: 0.18, emphasis: "neutral" }
];

const heroEdges: HarpiaConnectionData[] = [
  { id: "n1-n3", from: "n1", to: "n3", emphasis: "soft" },
  { id: "n2-n3", from: "n2", to: "n3", emphasis: "soft" },
  { id: "n2-n4", from: "n2", to: "n4", emphasis: "soft" },
  { id: "n3-n5", from: "n3", to: "n5", emphasis: "highlighted" },
  { id: "n4-n6", from: "n4", to: "n6", emphasis: "soft" },
  { id: "n5-n6", from: "n5", to: "n6", emphasis: "soft" },
  { id: "n5-n7", from: "n5", to: "n7", emphasis: "highlighted" },
  { id: "n6-n8", from: "n6", to: "n8", emphasis: "soft" },
  { id: "n6-n9", from: "n6", to: "n9", emphasis: "soft" },
  { id: "n7-n9", from: "n7", to: "n9", emphasis: "soft" },
  { id: "n8-n10", from: "n8", to: "n10", emphasis: "highlighted" },
  { id: "n9-n10", from: "n9", to: "n10", emphasis: "highlighted" },
  { id: "n9-n11", from: "n9", to: "n11", emphasis: "soft" },
  { id: "n10-n12", from: "n10", to: "n12", emphasis: "highlighted" },
  { id: "n10-n13", from: "n10", to: "n13", emphasis: "soft" },
  { id: "n10-n14", from: "n10", to: "n14", emphasis: "soft" },
  { id: "n11-n12", from: "n11", to: "n12", emphasis: "soft" },
  { id: "n12-n13", from: "n12", to: "n13", emphasis: "soft" }
];

const heroClusters: HarpiaGraphClusterGL[] = [
  { id: "observe", label: "Observe", x: -3.8, y: 0.28, z: -1.08, radius: 1.68 },
  { id: "analysis", label: "Analysis", x: 0.2, y: 0.26, z: -0.76, radius: 2.06 },
  { id: "decision", label: "Decision", x: 3.54, y: 0.18, z: -0.38, radius: 1.88 }
];

export function HarpiaHeroBackground() {
  return (
    <div className={styles.signalField} aria-hidden="true">
      <HarpiaGraphGLCanvas
        variant="hero"
        className={styles.signalFieldCanvas}
        nodes={heroNodes}
        edges={heroEdges}
        clusters={heroClusters}
      />
    </div>
  );
}
