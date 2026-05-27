"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MuscleGroup, MuscleState } from "@/lib/body/muscle-state";
import { recoveryAmount, tirednessColor } from "@/lib/body/muscle-state";
import { BodyMesh } from "./BodyMesh";

export type BodySelection =
  | { kind: "muscle"; group: MuscleGroup }
  | { kind: "heart" }
  | { kind: "brain" }
  | null;

type Props = {
  muscleStates: Record<MuscleGroup, MuscleState>;
  selection: BodySelection;
  onSelect: (s: BodySelection) => void;
  autoRotate: boolean;
};

const HOLO_CYAN = "#5be3ff";
const HEART_COLOR = "#ff3b5c";
const BRAIN_COLOR = "#b78bff";

type Vec3 = [number, number, number];

/**
 * Anatomical positions for muscle hitboxes. Tuned to a Mixamo Xbot in T-pose
 * scaled to 1.88m tall, feet at y=0.
 * - Front muscles (chest, abs, biceps, quads) sit at +z (toward camera).
 * - Back muscles (back, glutes, triceps, hamstrings, calves) sit at -z.
 * - Arms extend horizontally (T-pose), so biceps/triceps/forearms run along x.
 */
type MuscleSpot = {
  group: MuscleGroup;
  position: Vec3;
  radius: number;
};

const SPOTS: MuscleSpot[] = [
  // Chest
  { group: "chest", position: [-0.09, 1.43, 0.13], radius: 0.085 },
  { group: "chest", position: [0.09, 1.43, 0.13], radius: 0.085 },
  // Abs
  { group: "abs", position: [0, 1.22, 0.13], radius: 0.11 },
  // Back
  { group: "back", position: [0, 1.4, -0.13], radius: 0.13 },
  // Glutes
  { group: "glutes", position: [-0.09, 0.85, -0.1], radius: 0.085 },
  { group: "glutes", position: [0.09, 0.85, -0.1], radius: 0.085 },
  // Shoulders — at shoulder joints, T-pose
  { group: "shoulders", position: [-0.25, 1.45, 0], radius: 0.08 },
  { group: "shoulders", position: [0.25, 1.45, 0], radius: 0.08 },
  // Biceps — front of horizontal upper arm
  { group: "biceps", position: [-0.42, 1.45, 0.04], radius: 0.07 },
  { group: "biceps", position: [0.42, 1.45, 0.04], radius: 0.07 },
  // Triceps — back of horizontal upper arm
  { group: "triceps", position: [-0.42, 1.45, -0.04], radius: 0.07 },
  { group: "triceps", position: [0.42, 1.45, -0.04], radius: 0.07 },
  // Forearms — past elbow on horizontal arm
  { group: "forearms", position: [-0.66, 1.45, 0], radius: 0.07 },
  { group: "forearms", position: [0.66, 1.45, 0], radius: 0.07 },
  // Quads — front of upper leg
  { group: "quads", position: [-0.11, 0.6, 0.07], radius: 0.09 },
  { group: "quads", position: [0.11, 0.6, 0.07], radius: 0.09 },
  // Hamstrings — back of upper leg
  { group: "hamstrings", position: [-0.11, 0.6, -0.07], radius: 0.09 },
  { group: "hamstrings", position: [0.11, 0.6, -0.07], radius: 0.09 },
  // Calves — back of lower leg
  { group: "calves", position: [-0.11, 0.25, -0.06], radius: 0.07 },
  { group: "calves", position: [0.11, 0.25, -0.06], radius: 0.07 },
];

/**
 * Soft additive glow at a muscle position. Strength scales with selection / hover / fatigue —
 * a fully-rested muscle shows nothing; recently-trained or selected shows a colored bloom.
 */
function MuscleGlow({
  spot,
  states,
  selection,
  onSelect,
  onHoverGroup,
  hoveredGroup,
}: {
  spot: MuscleSpot;
  states: Record<MuscleGroup, MuscleState>;
  selection: BodySelection;
  onSelect: (s: BodySelection) => void;
  onHoverGroup: (g: MuscleGroup | null) => void;
  hoveredGroup: MuscleGroup | null;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const isSelected =
    selection?.kind === "muscle" && selection.group === spot.group;
  const isHovered = hoveredGroup === spot.group;

  const hours = states[spot.group]?.hoursSince ?? null;
  // 0..1 where 1 = fully fatigued (just trained), 0 = fully rested.
  const fatigue = 1 - recoveryAmount(hours);
  const color = tirednessColor(hours);

  // Strength: combine fatigue + hover + select. Selected always visible even when rested.
  const baseStrength = fatigue;
  const targetStrength = isSelected ? 1.3 : isHovered ? Math.max(baseStrength, 0.55) : baseStrength;

  useFrame(() => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    u.uStrength.value = THREE.MathUtils.lerp(u.uStrength.value, targetStrength, 0.15);
    (u.uColor.value as THREE.Color).set(color);
  });

  return (
    <group position={spot.position}>
      {/* Invisible click hitbox — slightly larger than the visible glow */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverGroup(spot.group);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHoverGroup(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ kind: "muscle", group: spot.group });
        }}
      >
        <sphereGeometry args={[spot.radius * 1.05, 16, 12]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      {/* Visible glow blob — additive bloom that tints the body underneath */}
      <mesh renderOrder={5}>
        <sphereGeometry args={[spot.radius, 24, 18]} />
        <shaderMaterial
          ref={matRef}
          args={[
            {
              vertexShader: /* glsl */ `
                varying vec3 vNormal;
                varying vec3 vViewDir;
                void main() {
                  vec4 worldPos = modelMatrix * vec4(position, 1.0);
                  vec4 viewPos = viewMatrix * worldPos;
                  vNormal = normalize(normalMatrix * normal);
                  vViewDir = normalize(-viewPos.xyz);
                  gl_Position = projectionMatrix * viewPos;
                }
              `,
              fragmentShader: /* glsl */ `
                precision highp float;
                uniform vec3 uColor;
                uniform float uStrength;
                varying vec3 vNormal;
                varying vec3 vViewDir;
                void main() {
                  float NdotV = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
                  // Soft volumetric blob — bright in the middle, fades at edge.
                  float core = pow(NdotV, 2.0);
                  float rim  = pow(1.0 - NdotV, 1.8);
                  float a = (core * 0.55 + rim * 0.9) * uStrength;
                  vec3 col = uColor * (1.4 * uStrength + 0.2);
                  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
                }
              `,
              uniforms: {
                uColor: { value: new THREE.Color(color) },
                uStrength: { value: 0 },
              },
              transparent: true,
              depthWrite: false,
              depthTest: true,
              toneMapped: false,
              blending: THREE.AdditiveBlending,
            },
          ]}
        />
      </mesh>
    </group>
  );
}

function Heart({
  selection,
  onSelect,
}: {
  selection: BodySelection;
  onSelect: (s: BodySelection) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const isSelected = selection?.kind === "heart";

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    const beat = (Math.sin(t * 4.2) + Math.sin(t * 4.2 + 0.55)) * 0.05 + 1;
    ref.current.scale.setScalar(beat);
  });

  return (
    <group ref={ref} position={[-0.04, 1.42, 0.075]}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ kind: "heart" });
        }}
      >
        <sphereGeometry args={[0.05, 32, 32]} />
        <meshStandardMaterial
          color={HEART_COLOR}
          emissive={HEART_COLOR}
          emissiveIntensity={isSelected ? 3.5 : hovered ? 2.6 : 1.9}
          roughness={0.25}
          metalness={0.0}
          toneMapped={false}
        />
      </mesh>
      <mesh scale={1.4}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial
          color={HEART_COLOR}
          transparent
          opacity={0.2}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Brain({
  selection,
  onSelect,
}: {
  selection: BodySelection;
  onSelect: (s: BodySelection) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isSelected = selection?.kind === "brain";
  return (
    <group position={[0, 1.78, 0]}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ kind: "brain" });
        }}
      >
        <sphereGeometry args={[0.08, 32, 32]} />
        <meshStandardMaterial
          color={BRAIN_COLOR}
          emissive={BRAIN_COLOR}
          emissiveIntensity={isSelected ? 1.4 : hovered ? 1.0 : 0.55}
          roughness={0.45}
          transparent
          opacity={0.65}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function Humanoid({
  muscleStates,
  selection,
  onSelect,
  autoRotate,
}: Props) {
  const root = useRef<THREE.Group>(null);
  const [hoveredGroup, setHoveredGroup] = useState<MuscleGroup | null>(null);

  useFrame((_, dt) => {
    if (!root.current) return;
    root.current.position.y = Math.sin(performance.now() * 0.0008) * 0.012;
    if (autoRotate) {
      root.current.rotation.y += dt * 0.35;
    }
  });

  return (
    <group ref={root} dispose={null} onPointerMissed={() => onSelect(null)}>
      {/* Real human body mesh */}
      <BodyMesh targetHeight={1.88} color={HOLO_CYAN} />

      {/* Heart + brain organs */}
      <Heart selection={selection} onSelect={onSelect} />
      <Brain selection={selection} onSelect={onSelect} />

      {/* Per-muscle clickable glows */}
      {SPOTS.map((spot, i) => (
        <MuscleGlow
          key={`${spot.group}-${i}`}
          spot={spot}
          states={muscleStates}
          selection={selection}
          onSelect={onSelect}
          onHoverGroup={setHoveredGroup}
          hoveredGroup={hoveredGroup}
        />
      ))}

      {/* Scan halo at the feet */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62, 0.66, 96]} />
        <meshBasicMaterial color={HOLO_CYAN} transparent opacity={0.22} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.78, 0.79, 96]} />
        <meshBasicMaterial color={HOLO_CYAN} transparent opacity={0.12} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}
