"use client";

import { Environment, Float, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Color, type Group } from "three";
import { m, useMotionValueEvent, useReducedMotion, useTime, useTransform } from "framer-motion";
import { useTheme } from "next-themes";

import { HarpiaConnections, type HarpiaConnectionData } from "@/components/graph/harpia-connections";
import { HarpiaNode, type HarpiaNodeData } from "@/components/graph/harpia-node";
import { cn } from "@/lib/utils";

import styles from "./harpia-graph-gl.module.css";

export type HarpiaGraphClusterGL = {
  id: string;
  label: string;
  x: number;
  y: number;
  z: number;
  radius: number;
};

type HarpiaGraphGLProps = {
  className?: string;
  variant?: "hero" | "dashboard";
  nodes: HarpiaNodeData[];
  edges: HarpiaConnectionData[];
  clusters?: HarpiaGraphClusterGL[];
  activeCluster?: string | null;
  activeNodeId?: string | null;
  hoveredNodeId?: string | null;
  interactive?: boolean;
  onNodeHover?: (nodeId: string | null) => void;
  onNodeSelect?: (nodeId: string) => void;
  onScanChange?: (progress: number) => void;
};

function smoothProgress(value: number) {
  return value * value * (3 - 2 * value);
}

function GraphParticles({
  variant,
  themeMode,
  pointerRef
}: {
  variant: "hero" | "dashboard";
  themeMode: "light" | "dark";
  pointerRef: MutableRefObject<{ x: number; y: number }>;
}) {
  const pointsRef = useRef<Group>(null);
  const layers = useMemo(
    () => [
      {
        id: "far",
        count: variant === "hero" ? 180 : 140,
        size: variant === "hero" ? 0.024 : 0.02,
        opacity: variant === "hero" ? 0.08 : 0.06,
        depth: -1.8,
        spreadX: 10.4,
        spreadY: 6.2,
        spreadZ: 2.8
      },
      {
        id: "mid",
        count: variant === "hero" ? 140 : 120,
        size: variant === "hero" ? 0.032 : 0.028,
        opacity: variant === "hero" ? 0.12 : 0.09,
        depth: -0.5,
        spreadX: 9.2,
        spreadY: 5.4,
        spreadZ: 2
      },
      {
        id: "near",
        count: variant === "hero" ? 90 : 72,
        size: variant === "hero" ? 0.044 : 0.038,
        opacity: variant === "hero" ? 0.16 : 0.12,
        depth: 1.1,
        spreadX: 8.4,
        spreadY: 4.8,
        spreadZ: 1.2
      }
    ],
    [variant]
  );
  const positionsByLayer = useMemo(
    () =>
      layers.map((layer) => {
        const values = new Float32Array(layer.count * 3);

        for (let index = 0; index < layer.count; index += 1) {
          const stride = index * 3;
          values[stride] = (Math.random() - 0.5) * layer.spreadX;
          values[stride + 1] = (Math.random() - 0.5) * layer.spreadY;
          values[stride + 2] = layer.depth + (Math.random() - 0.5) * layer.spreadZ;
        }

        return values;
      }),
    [layers]
  );

  useFrame((state) => {
    if (!pointsRef.current) {
      return;
    }

    const elapsed = state.clock.getElapsedTime();
    pointsRef.current.children.forEach((child, index) => {
      child.rotation.z = elapsed * (0.01 + index * 0.005) + pointerRef.current.x * (0.05 + index * 0.025);
      child.rotation.x = elapsed * (0.008 + index * 0.004) + pointerRef.current.y * (0.03 + index * 0.016);
      child.position.x = Math.sin(elapsed * (0.08 + index * 0.03)) * (0.08 + index * 0.05);
      child.position.y = Math.cos(elapsed * (0.06 + index * 0.025)) * (0.06 + index * 0.04);
    });
  });

  return (
    <group ref={pointsRef}>
      {layers.map((layer, index) => (
        <points key={layer.id}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positionsByLayer[index], 3]} />
          </bufferGeometry>
          <pointsMaterial
            transparent
            depthWrite={false}
            color={new Color(index === 2 ? (themeMode === "light" ? "#B8A98A" : "#D6C6A5") : themeMode === "light" ? "#6A6156" : "#F4F1EA")}
            opacity={themeMode === "light" ? layer.opacity * 0.7 : layer.opacity}
            size={layer.size}
            sizeAttenuation
          />
        </points>
      ))}
    </group>
  );
}

function ClusterHalos({ clusters, themeMode }: { clusters: HarpiaGraphClusterGL[]; themeMode: "light" | "dark" }) {
  const accent = useMemo(() => new Color(themeMode === "light" ? "#B8A98A" : "#D6C6A5"), [themeMode]);

  return (
    <>
      {clusters.map((cluster, index) => (
        <Float
          key={cluster.id}
          speed={0.36 + index * 0.06}
          rotationIntensity={0.04}
          floatIntensity={0.08}
        >
          <mesh position={[cluster.x, cluster.y, cluster.z - 0.82]}>
            <ringGeometry args={[cluster.radius * 0.72, cluster.radius, 128]} />
            <meshBasicMaterial color={accent} transparent opacity={0.04} depthWrite={false} />
          </mesh>
        </Float>
      ))}
    </>
  );
}

function GraphScene({
  variant,
  nodes,
  edges,
  clusters,
  themeMode,
  scanRef,
  activeCluster,
  activeNodeId,
  hoveredNodeId,
  interactive,
  onNodeHover,
  onNodeSelect,
  pointerRef
}: HarpiaGraphGLProps & {
  themeMode: "light" | "dark";
  scanRef: MutableRefObject<number>;
  pointerRef: MutableRefObject<{ x: number; y: number }>;
}) {
  const reducedMotion = useReducedMotion();
  const cameraGroupRef = useRef<Group>(null);

  useFrame((state) => {
    if (!cameraGroupRef.current) {
      return;
    }

    const elapsed = state.clock.getElapsedTime();
    const linearScan = ((elapsed * 1000) % 22000) / 22000;
    scanRef.current = reducedMotion ? 0.52 : smoothProgress(linearScan);
    const ambientDriftX = Math.sin(elapsed * 0.14) * 0.06 + Math.cos(elapsed * 0.09) * 0.03;
    const ambientDriftY = Math.cos(elapsed * 0.11) * 0.05;
    const targetX = pointerRef.current.x * 0.28 + ambientDriftX;
    const targetY = pointerRef.current.y * 0.18 + ambientDriftY;

    cameraGroupRef.current.rotation.y += (targetX - cameraGroupRef.current.rotation.y) * 0.032;
    cameraGroupRef.current.rotation.x += (-targetY - cameraGroupRef.current.rotation.x) * 0.032;
    cameraGroupRef.current.position.x += (pointerRef.current.x * 0.24 - cameraGroupRef.current.position.x) * 0.028;
    cameraGroupRef.current.position.z +=
      ((variant === "hero" ? 0 : 0.18) + Math.sin(elapsed * 0.16) * 0.03 - cameraGroupRef.current.position.z) *
      0.045;

    if (!reducedMotion) {
      cameraGroupRef.current.position.y +=
        (Math.cos(elapsed * 0.12) * 0.06 + pointerRef.current.y * 0.12 - cameraGroupRef.current.position.y) * 0.032;
    }
  });

  return (
    <>
      <color attach="background" args={[themeMode === "light" ? "#F5F3EE" : "#0B0B0C"]} />
      <fog attach="fog" args={[themeMode === "light" ? "#F5F3EE" : "#0B0B0C", 7.6, 16]} />
      <ambientLight intensity={themeMode === "light" ? 0.5 : 0.42} color={themeMode === "light" ? "#4A433A" : "#F4F1EA"} />
      <directionalLight intensity={themeMode === "light" ? 0.28 : 0.32} position={[0, 2, 6]} color={themeMode === "light" ? "#6A6156" : "#F4F1EA"} />
      <pointLight intensity={themeMode === "light" ? 0.34 : 0.48} position={[2.8, 1.4, 3.8]} color={themeMode === "light" ? "#B8A98A" : "#D6C6A5"} />
      <pointLight intensity={themeMode === "light" ? 0.08 : 0.14} position={[-3.4, -1.2, 2.4]} color={themeMode === "light" ? "#6A6156" : "#F4F1EA"} />

      <group ref={cameraGroupRef}>
        <GraphParticles variant={variant ?? "dashboard"} themeMode={themeMode} pointerRef={pointerRef} />
        {clusters?.length ? <ClusterHalos clusters={clusters} themeMode={themeMode} /> : null}
        <HarpiaConnections
          nodes={nodes}
          edges={edges}
          themeMode={themeMode}
          activeCluster={activeCluster ?? null}
          activeNodeId={activeNodeId ?? null}
          hoveredNodeId={hoveredNodeId ?? null}
        />
        {nodes.map((node, index) => (
          <HarpiaNode
            key={node.id}
            node={node}
            index={index}
            themeMode={themeMode}
            activeCluster={activeCluster ?? null}
            activeNodeId={activeNodeId ?? null}
            hoveredNodeId={hoveredNodeId ?? null}
            pointerRef={pointerRef}
            scanRef={scanRef}
            interactive={interactive}
            onHover={onNodeHover}
            onSelect={onNodeSelect}
          />
        ))}
      </group>

      <Environment resolution={32}>
        <group>
          <mesh position={[0, 2.5, -4]}>
            <sphereGeometry args={[1.2, 24, 24]} />
            <meshBasicMaterial color={themeMode === "light" ? "#6A6156" : "#F4F1EA"} transparent opacity={themeMode === "light" ? 0.025 : 0.035} />
          </mesh>
          <mesh position={[3.6, -1.8, -3.2]}>
            <sphereGeometry args={[0.9, 24, 24]} />
            <meshBasicMaterial color={themeMode === "light" ? "#B8A98A" : "#D6C6A5"} transparent opacity={themeMode === "light" ? 0.035 : 0.05} />
          </mesh>
        </group>
      </Environment>
    </>
  );
}

export function HarpiaGraphGL({
  className,
  variant = "dashboard",
  nodes,
  edges,
  clusters = [],
  activeCluster = null,
  activeNodeId = null,
  hoveredNodeId = null,
  interactive = false,
  onNodeHover,
  onNodeSelect,
  onScanChange
}: HarpiaGraphGLProps) {
  const reducedMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const scanRef = useRef(0.52);
  const lastScanBucketRef = useRef<number | null>(null);
  const time = useTime();
  const scanProgress = useTransform(time, (value) => {
    if (reducedMotion) {
      return 0.52;
    }

    const linear = (value % 22000) / 22000;
    return smoothProgress(linear);
  });
  const scanOverlayX = useTransform(scanProgress, [0, 1], ["-18%", "118%"]);
  const themeMode = mounted && resolvedTheme === "light" ? "light" : "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  useMotionValueEvent(scanProgress, "change", (latest) => {
    const bucket = Math.round(latest * 48);

    if (bucket === lastScanBucketRef.current) {
      return;
    }

    lastScanBucketRef.current = bucket;
    onScanChange?.(latest);
  });

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerRef.current.x = (event.clientX - bounds.left) / bounds.width - 0.5;
    pointerRef.current.y = (event.clientY - bounds.top) / bounds.height - 0.5;
  }

  function handlePointerLeave() {
    pointerRef.current.x = 0;
    pointerRef.current.y = 0;
    onNodeHover?.(null);
  }

  return (
    <div
      className={cn(styles.root, className)}
      data-variant={variant}
      data-theme={themeMode}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas
        className={styles.canvas}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <PerspectiveCamera
          makeDefault
          position={variant === "hero" ? [0, 0.15, 7.5] : [0, 0, 7.2]}
          fov={variant === "hero" ? 34 : 38}
        />
        <GraphScene
          variant={variant}
          nodes={nodes}
          edges={edges}
          clusters={clusters}
          themeMode={themeMode}
          activeCluster={activeCluster}
          activeNodeId={activeNodeId}
          hoveredNodeId={hoveredNodeId}
          interactive={interactive}
          onNodeHover={onNodeHover}
          onNodeSelect={onNodeSelect}
          scanRef={scanRef}
          pointerRef={pointerRef}
        />
      </Canvas>
      <div className={styles.glow} />
      <div className={styles.grid} />
      <m.div className={styles.scanOverlay} style={{ x: scanOverlayX }} />
      <div className={styles.vignette} />
      <div className={styles.grain} />
    </div>
  );
}

export function HarpiaGraphFallback({ className }: { className?: string }) {
  return <div className={cn(styles.fallback, className)} />;
}
