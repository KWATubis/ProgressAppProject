"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Holographic scan shader.
 *
 * `fatigue` (0..1) drives a red → yellow → green gradient. 0 = freshly trained, 1 = fully rested.
 * `structural` mode disables the fatigue gradient and uses the passed `color` instead — for bones,
 * skeleton, head, hands, feet (parts that don't recover).
 *
 * The look:
 *  - Translucent inner body, bright Fresnel rim (silhouette glow).
 *  - Animated horizontal scanlines drifting down.
 *  - Subtle 3D noise as a "data" overlay so it doesn't feel flat.
 *  - When `intensity` > 1, the rim and emission punch harder (used on hover/select).
 */

const vertexShader = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vViewNormal;
  varying vec3 vLocalPos;
  varying vec3 vViewDir;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vLocalPos = position;

    vec4 viewPos = viewMatrix * worldPos;
    vViewNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-viewPos.xyz);

    gl_Position = projectionMatrix * viewPos;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uFatigue;     // 0..1 — used when uStructural == 0.0
  uniform float uIntensity;   // 1 = default; >1 brightens (hover/select)
  uniform float uStructural;  // 1 = use uStructuralColor; 0 = use fatigue gradient
  uniform vec3 uStructuralColor;
  uniform float uOpacity;

  varying vec3 vWorldPos;
  varying vec3 vViewNormal;
  varying vec3 vLocalPos;
  varying vec3 vViewDir;

  // Cheap 3D hash → value noise. Good enough for atmosphere.
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }

  // Smooth red → yellow → green gradient on a 0..1 axis.
  vec3 fatigueGradient(float r) {
    // Three anchor colors tuned to feel like medical thermal-imaging.
    vec3 red    = vec3(1.00, 0.20, 0.25);
    vec3 yellow = vec3(1.00, 0.85, 0.30);
    vec3 green  = vec3(0.20, 0.95, 0.55);
    vec3 c = mix(red, yellow, smoothstep(0.0, 0.5, r));
    c = mix(c, green, smoothstep(0.5, 1.0, r));
    return c;
  }

  void main() {
    vec3 baseColor = uStructural > 0.5
      ? uStructuralColor
      : fatigueGradient(clamp(uFatigue, 0.0, 1.0));

    // Fresnel — bright at silhouette edges.
    float NdotV = clamp(dot(normalize(vViewNormal), normalize(vViewDir)), 0.0, 1.0);
    float fresnel = pow(1.0 - NdotV, 2.2);

    // Vertical scanline pattern in world space. Slow downward drift.
    float scanline = sin((vWorldPos.y - uTime * 0.18) * 90.0) * 0.5 + 0.5;
    scanline = pow(scanline, 6.0); // thin bright lines

    // Subtle volumetric data noise.
    float n = noise(vLocalPos * 14.0 + vec3(0.0, uTime * 0.3, 0.0));
    float dataNoise = smoothstep(0.55, 1.0, n);

    // Sweeping diagnostic line moving up the body every ~2.5s.
    float sweep = smoothstep(0.05, 0.0, abs(fract(uTime * 0.4) * 3.6 - 1.8 - vWorldPos.y));
    sweep *= 0.6;

    // Base body — translucent, very dim core, bright rim.
    vec3 col = baseColor * (0.08 + fresnel * 1.6);
    // Scanlines add a slight tint on top of the body.
    col += baseColor * scanline * 0.18;
    // Data noise dots.
    col += baseColor * dataNoise * 0.25;
    // Sweep pulse — pure rim color.
    col += baseColor * sweep;

    // Intensity multiplier — hover/select states punch.
    col *= uIntensity;

    // Alpha: rim drives most of the visibility, scanlines + noise + sweep add the inner data ticks.
    float alpha = clamp(
      fresnel * 0.95
      + scanline * 0.12
      + dataNoise * 0.18
      + sweep * 0.8
      + 0.06, // tiny always-on so inner volume reads, not vanishes
      0.0, 1.0
    );
    alpha *= uOpacity;

    gl_FragColor = vec4(col, alpha);
  }
`;

export type HoloMaterialProps = {
  /** 0 = just trained, 1 = fully rested. Ignored when structural=true. */
  fatigue?: number;
  /** Multiplier for emission/rim. 1 = normal, 1.5 = hover, 2.2 = selected. */
  intensity?: number;
  /** When true, use `color` instead of the fatigue gradient. For non-muscle parts. */
  structural?: boolean;
  color?: string;
  opacity?: number;
};

export function HoloMaterial({
  fatigue = 1,
  intensity = 1,
  structural = false,
  color = "#5be3ff",
  opacity = 1,
}: HoloMaterialProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFatigue: { value: fatigue },
      uIntensity: { value: intensity },
      uStructural: { value: structural ? 1 : 0 },
      uStructuralColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    }),
    // Intentional: build uniforms object once. We update individual values in useFrame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state) => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    u.uTime.value = state.clock.getElapsedTime();
    // Lerp toward props so changes ease in (avoids hard pops when hovering).
    u.uFatigue.value = THREE.MathUtils.lerp(u.uFatigue.value, fatigue, 0.12);
    u.uIntensity.value = THREE.MathUtils.lerp(u.uIntensity.value, intensity, 0.18);
    u.uStructural.value = structural ? 1 : 0;
    (u.uStructuralColor.value as THREE.Color).set(color);
    u.uOpacity.value = opacity;
  });

  return (
    <shaderMaterial
      ref={matRef}
      args={[
        {
          vertexShader,
          fragmentShader,
          uniforms,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
          blending: THREE.NormalBlending,
          side: THREE.DoubleSide,
        },
      ]}
    />
  );
}
