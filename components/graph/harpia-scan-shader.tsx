"use client";

import { shaderMaterial } from "@react-three/drei";
import { extend, type ThreeElement } from "@react-three/fiber";
import { forwardRef, useMemo } from "react";
import { Color, Vector2 } from "three";

const HarpiaScanMaterialImpl = shaderMaterial(
  {
    uScan: 0,
    uOpacity: 0.56,
    uIntensity: 0.5,
    uState: 0,
    uCoord: new Vector2(0.5, 0.5),
    uBaseColor: new Color("#F4F1EA"),
    uAccentColor: new Color("#D6C6A5")
  },
  `
    varying vec2 vUv;
    varying float vScanBoost;

    uniform float uScan;
    uniform vec2 uCoord;

    void main() {
      vUv = uv;

      float linePosition = uCoord.x * 0.68 + uCoord.y * 0.32;
      float directDistance = abs(uScan - linePosition);
      float wrappedDistance = min(directDistance, 1.0 - directDistance);
      vScanBoost = 1.0 - smoothstep(0.0, 0.18, wrappedDistance);

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  `
    varying vec2 vUv;
    varying float vScanBoost;

    uniform vec3 uBaseColor;
    uniform vec3 uAccentColor;
    uniform float uOpacity;
    uniform float uIntensity;
    uniform float uState;

    void main() {
      vec2 centered = vUv - 0.5;
      float dist = length(centered);

      float core = 1.0 - smoothstep(0.0, 0.22, dist);
      float halo = 1.0 - smoothstep(0.08, 0.54, dist);
      float edgeSoftness = 1.0 - smoothstep(0.42, 0.58, dist);

      float selectedMix = smoothstep(1.2, 2.1, uState);
      float highlightedMix = smoothstep(0.15, 1.1, uState) - selectedMix;

      vec3 color = mix(uBaseColor * 0.66, uAccentColor, clamp(vScanBoost * 0.72 + highlightedMix * 0.32 + selectedMix * 0.52, 0.0, 1.0));
      float alpha =
        (core * 0.82 + halo * 0.24) *
        uOpacity *
        edgeSoftness *
        (0.78 + uIntensity * 0.26 + vScanBoost * 0.28 + highlightedMix * 0.18 + selectedMix * 0.26);

      if (alpha < 0.012) discard;

      gl_FragColor = vec4(color, alpha);
    }
  `
);

extend({ HarpiaScanMaterialImpl });

declare module "@react-three/fiber" {
  interface ThreeElements {
    harpiaScanMaterialImpl: ThreeElement<typeof HarpiaScanMaterialImpl>;
  }
}

type HarpiaScanShaderProps = {
  coord: [number, number];
  opacity: number;
  intensity: number;
  state: number;
};

export const HarpiaScanShader = forwardRef<any, HarpiaScanShaderProps>(function HarpiaScanShader(
  { coord, opacity, intensity, state },
  ref
) {
  const coordVector = useMemo(() => new Vector2(coord[0], coord[1]), [coord]);

  return (
    <harpiaScanMaterialImpl
      ref={ref}
      transparent
      depthWrite={false}
      uScan={0.52}
      uCoord={coordVector}
      uOpacity={opacity}
      uIntensity={intensity}
      uState={state}
    />
  );
});
