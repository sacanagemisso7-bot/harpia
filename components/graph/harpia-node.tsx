"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type MutableRefObject } from "react";
import type { Group } from "three";
import { Color, Vector3 } from "three";

import { HarpiaScanShader } from "@/components/graph/harpia-scan-shader";

export type HarpiaNodeData = {
  id: string;
  label?: string;
  cluster: string;
  x: number;
  y: number;
  z: number;
  coord: [number, number];
  size: number;
  emphasis: "neutral" | "highlighted";
};

type HarpiaNodeProps = {
  node: HarpiaNodeData;
  index: number;
  activeCluster: string | null;
  activeNodeId: string | null;
  hoveredNodeId: string | null;
  pointerRef: MutableRefObject<{ x: number; y: number }>;
  scanRef: MutableRefObject<number>;
  interactive?: boolean;
  onHover?: (nodeId: string | null) => void;
  onSelect?: (nodeId: string) => void;
};

function hashSeed(value: string) {
  return Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function HarpiaNode({
  node,
  index,
  activeCluster,
  activeNodeId,
  hoveredNodeId,
  pointerRef,
  scanRef,
  interactive = false,
  onHover,
  onSelect
}: HarpiaNodeProps) {
  const groupRef = useRef<Group>(null);
  const haloRef = useRef<Group>(null);
  const haloMaterialRef = useRef<any>(null);
  const outerHaloRef = useRef<Group>(null);
  const outerHaloMaterialRef = useRef<any>(null);
  const materialRef = useRef<any>(null);
  const basePosition = useMemo(() => new Vector3(node.x, node.y, node.z), [node.x, node.y, node.z]);
  const seed = useMemo(() => hashSeed(node.id), [node.id]);
  const driftScale = 0.05 + (seed % 5) * 0.012;
  const isHovered = hoveredNodeId === node.id;
  const isSelected = activeNodeId === node.id;
  const isDimmed = activeCluster !== null && node.cluster !== activeCluster;
  const opacity = isDimmed ? 0.14 : isSelected ? 0.92 : isHovered ? 0.84 : node.emphasis === "highlighted" ? 0.68 : 0.42;
  const stateLevel = isDimmed ? -1 : isSelected ? 2 : node.emphasis === "highlighted" ? 1 : 0;
  const intensity = isSelected ? 1 : isHovered ? 0.84 : node.emphasis === "highlighted" ? 0.66 : 0.42;

  useFrame((state) => {
    if (!groupRef.current || !haloRef.current || !outerHaloRef.current) {
      return;
    }

    const elapsed = state.clock.getElapsedTime();
    const pointerWeightX = 0.12 + node.coord[0] * 0.07;
    const pointerWeightY = 0.08 + node.coord[1] * 0.05;
    const pointerX = pointerRef.current.x * pointerWeightX;
    const pointerY = pointerRef.current.y * pointerWeightY;
    const driftX =
      Math.sin(elapsed * (0.16 + (seed % 7) * 0.012) + seed * 0.012 + index * 0.12) * driftScale +
      Math.cos(elapsed * 0.08 + seed * 0.02) * driftScale * 0.42;
    const driftY =
      Math.cos(elapsed * (0.14 + (seed % 5) * 0.01) + seed * 0.014 + index * 0.14) * driftScale * 1.12 +
      Math.sin(elapsed * 0.11 + seed * 0.017) * driftScale * 0.36;
    const scanLinePosition = node.coord[0] * 0.68 + node.coord[1] * 0.32;
    const scanDistance = Math.abs(scanRef.current - scanLinePosition);
    const wrappedDistance = Math.min(scanDistance, 1 - scanDistance);
    const scanBoost = Math.max(0, 1 - wrappedDistance * 9.6);
    const depthZ =
      Math.sin(elapsed * 0.17 + seed * 0.018) * driftScale * 1.4 +
      scanBoost * 0.14 +
      (isHovered ? 0.1 : 0) +
      (isSelected ? 0.16 : 0);

    groupRef.current.position.lerp(
      new Vector3(basePosition.x + driftX + pointerX, basePosition.y + driftY + pointerY, basePosition.z + depthZ),
      0.06
    );

    const targetScale = (isSelected ? 1.22 : isHovered ? 1.14 : 1.04) + scanBoost * 0.08;
    haloRef.current.scale.x += (targetScale - haloRef.current.scale.x) * 0.08;
    haloRef.current.scale.y += (targetScale - haloRef.current.scale.y) * 0.08;
    haloRef.current.scale.z += (targetScale - haloRef.current.scale.z) * 0.08;
    const outerScale = (isSelected ? 1.76 : isHovered ? 1.54 : 1.36) + scanBoost * 0.16;
    outerHaloRef.current.scale.x += (outerScale - outerHaloRef.current.scale.x) * 0.08;
    outerHaloRef.current.scale.y += (outerScale - outerHaloRef.current.scale.y) * 0.08;
    outerHaloRef.current.scale.z += (outerScale - outerHaloRef.current.scale.z) * 0.08;

    const haloTargetOpacity =
      isDimmed
        ? 0.012
        : 0.032 +
          (node.emphasis === "highlighted" ? 0.038 : 0) +
          (isHovered ? 0.07 : 0) +
          (isSelected ? 0.12 : 0) +
          scanBoost * 0.12;
    const outerHaloTargetOpacity = haloTargetOpacity * 0.42;

    if (haloMaterialRef.current) {
      haloMaterialRef.current.opacity += (haloTargetOpacity - haloMaterialRef.current.opacity) * 0.08;
    }

    if (outerHaloMaterialRef.current) {
      outerHaloMaterialRef.current.opacity +=
        (outerHaloTargetOpacity - outerHaloMaterialRef.current.opacity) * 0.08;
    }

    if (materialRef.current) {
      materialRef.current.uScan = scanRef.current;
      materialRef.current.uOpacity +=
        ((opacity + scanBoost * (isDimmed ? 0.02 : 0.08)) - materialRef.current.uOpacity) * 0.08;
      materialRef.current.uIntensity +=
        ((intensity + scanBoost * 0.22 + (isHovered ? 0.08 : 0)) - materialRef.current.uIntensity) * 0.08;
      materialRef.current.uState = stateLevel;
    }
  });

  return (
    <group ref={groupRef} position={basePosition}>
      <Billboard follow>
        <mesh ref={outerHaloRef} scale={1.36}>
          <planeGeometry args={[node.size * 2.8, node.size * 2.8]} />
          <meshBasicMaterial
            ref={outerHaloMaterialRef}
            color={new Color("#D6C6A5")}
            transparent
            opacity={0.02}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={haloRef} scale={1.04}>
          <planeGeometry args={[node.size * 1.9, node.size * 1.9]} />
          <meshBasicMaterial
            ref={haloMaterialRef}
            color={new Color("#D6C6A5")}
            transparent
            opacity={0.04}
            depthWrite={false}
          />
        </mesh>
        <mesh
          onPointerOver={(event) => {
            if (!interactive) {
              return;
            }

            event.stopPropagation();
            onHover?.(node.id);
          }}
          onPointerOut={(event) => {
            if (!interactive) {
              return;
            }

            event.stopPropagation();
            onHover?.(null);
          }}
          onClick={(event) => {
            if (!interactive) {
              return;
            }

            event.stopPropagation();
            onSelect?.(node.id);
          }}
        >
          <planeGeometry args={[node.size, node.size]} />
          <HarpiaScanShader
            ref={materialRef}
            coord={node.coord}
            opacity={opacity}
            intensity={intensity}
            state={stateLevel}
          />
        </mesh>
      </Billboard>
    </group>
  );
}
