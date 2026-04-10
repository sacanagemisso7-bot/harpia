"use client";

import { QuadraticBezierLine } from "@react-three/drei";
import { useMemo } from "react";
import { Color, Vector3 } from "three";

import type { HarpiaNodeData } from "@/components/graph/harpia-node";

export type HarpiaConnectionData = {
  id: string;
  from: string;
  to: string;
  emphasis: "soft" | "highlighted";
};

type HarpiaConnectionsProps = {
  nodes: HarpiaNodeData[];
  edges: HarpiaConnectionData[];
  activeCluster: string | null;
  activeNodeId: string | null;
  hoveredNodeId: string | null;
};

function hashSeed(value: string) {
  return Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function HarpiaConnections({
  nodes,
  edges,
  activeCluster,
  activeNodeId,
  hoveredNodeId
}: HarpiaConnectionsProps) {
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const warm = useMemo(() => new Color("#D6C6A5"), []);
  const ivory = useMemo(() => new Color("#F4F1EA"), []);

  return (
    <>
      {edges.map((edge) => {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);

        if (!from || !to) {
          return null;
        }

        const sharedCluster = from.cluster === to.cluster;
        const seed = hashSeed(edge.id);
        const curveLift = sharedCluster ? 0.22 + (seed % 5) * 0.04 : 0.42 + (seed % 7) * 0.03;
        const lateralBias = ((seed % 3) - 1) * 0.18;
        const isFocused =
          activeNodeId === from.id ||
          activeNodeId === to.id ||
          hoveredNodeId === from.id ||
          hoveredNodeId === to.id ||
          (activeCluster !== null && from.cluster === activeCluster && to.cluster === activeCluster);
        const isDimmed =
          activeCluster !== null &&
          from.cluster !== activeCluster &&
          to.cluster !== activeCluster &&
          activeNodeId !== from.id &&
          activeNodeId !== to.id;
        const emphasisWeight = edge.emphasis === "highlighted" ? 0.12 : 0;

        const mid = new Vector3(
          (from.x + to.x) / 2 + lateralBias,
          (from.y + to.y) / 2 + curveLift + emphasisWeight,
          (from.z + to.z) / 2 - (sharedCluster ? 0.18 : 0.34)
        );

        return (
          <QuadraticBezierLine
            key={edge.id}
            start={[from.x, from.y, from.z]}
            mid={mid}
            end={[to.x, to.y, to.z]}
            color={edge.emphasis === "highlighted" || isFocused ? warm : ivory}
            transparent
            opacity={isDimmed ? 0.04 : isFocused ? 0.28 : edge.emphasis === "highlighted" ? 0.18 : 0.09}
            lineWidth={edge.emphasis === "highlighted" || isFocused ? 1 : 0.56}
            dashed={false}
          />
        );
      })}
    </>
  );
}
