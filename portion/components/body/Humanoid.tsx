"use client";

import { useMemo, useRef, useState } from "react";
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
 * Anatomical muscle plates positioned on the X-Bot body surface.
 * Body is 1.88m tall, feet at y=0, T-pose (arms horizontal along x).
 *
 * Each plate:
 *  - `position`: where to anchor the plate on the body surface
 *  - `scale`:    [width, height, depth] of the ellipsoid (sphere stretched)
 *  - `rotation`: optional tilt so the plate aligns to muscle direction
 *  - `group`:    which muscle group this belongs to (for color + click)
 */
type Plate = {
  group: MuscleGroup;
  position: Vec3;
  scale: Vec3;
  rotation?: Vec3;
};

// All scale values are RADII (so 0.05 = 10cm wide muscle).
const PLATES: Plate[] = [
  // Pecs — two rounded plates on upper chest
  { group: "chest", position: [-0.085, 1.45, 0.12], scale: [0.075, 0.06, 0.04], rotation: [0, 0, -0.15] },
  { group: "chest", position: [0.085, 1.45, 0.12], scale: [0.075, 0.06, 0.04], rotation: [0, 0, 0.15] },

  // Abs — 6-pack: 3 rows of 2 plates each
  { group: "abs", position: [-0.04, 1.32, 0.13], scale: [0.035, 0.03, 0.02] },
  { group: "abs", position: [0.04, 1.32, 0.13], scale: [0.035, 0.03, 0.02] },
  { group: "abs", position: [-0.04, 1.25, 0.13], scale: [0.035, 0.03, 0.02] },
  { group: "abs", position: [0.04, 1.25, 0.13], scale: [0.035, 0.03, 0.02] },
  { group: "abs", position: [-0.04, 1.18, 0.135], scale: [0.035, 0.03, 0.02] },
  { group: "abs", position: [0.04, 1.18, 0.135], scale: [0.035, 0.03, 0.02] },
  // Obliques — flanking the abs
  { group: "abs", position: [-0.115, 1.24, 0.09], scale: [0.025, 0.07, 0.02], rotation: [0, 0, 0.25] },
  { group: "abs", position: [0.115, 1.24, 0.09], scale: [0.025, 0.07, 0.02], rotation: [0, 0, -0.25] },

  // Back — broad lat plates
  { group: "back", position: [-0.09, 1.4, -0.12], scale: [0.07, 0.13, 0.04], rotation: [0, 0, 0.18] },
  { group: "back", position: [0.09, 1.4, -0.12], scale: [0.07, 0.13, 0.04], rotation: [0, 0, -0.18] },
  // Upper traps
  { group: "back", position: [0, 1.55, -0.06], scale: [0.11, 0.04, 0.05] },

  // Glutes
  { group: "glutes", position: [-0.085, 0.92, -0.11], scale: [0.075, 0.085, 0.045] },
  { group: "glutes", position: [0.085, 0.92, -0.11], scale: [0.075, 0.085, 0.045] },

  // Shoulders — deltoid caps
  { group: "shoulders", position: [-0.255, 1.5, 0.02], scale: [0.07, 0.06, 0.07] },
  { group: "shoulders", position: [0.255, 1.5, 0.02], scale: [0.07, 0.06, 0.07] },
  // Rear deltoid hint
  { group: "shoulders", position: [-0.235, 1.5, -0.05], scale: [0.05, 0.05, 0.04] },
  { group: "shoulders", position: [0.235, 1.5, -0.05], scale: [0.05, 0.05, 0.04] },

  // Biceps — front of horizontal upper arm
  { group: "biceps", position: [-0.42, 1.46, 0.045], scale: [0.07, 0.045, 0.04], rotation: [0, 0, 0] },
  { group: "biceps", position: [0.42, 1.46, 0.045], scale: [0.07, 0.045, 0.04], rotation: [0, 0, 0] },

  // Triceps — back of horizontal upper arm
  { group: "triceps", position: [-0.42, 1.46, -0.05], scale: [0.075, 0.045, 0.04] },
  { group: "triceps", position: [0.42, 1.46, -0.05], scale: [0.075, 0.045, 0.04] },

  // Forearms — past elbow
  { group: "forearms", position: [-0.66, 1.46, 0.0], scale: [0.085, 0.04, 0.04] },
  { group: "forearms", position: [0.66, 1.46, 0.0], scale: [0.085, 0.04, 0.04] },

  // Quads — front of upper leg; vastus lateralis + medialis + rectus
  { group: "quads", position: [-0.11, 0.65, 0.075], scale: [0.06, 0.13, 0.045], rotation: [0, 0, 0.04] },
  { group: "quads", position: [0.11, 0.65, 0.075], scale: [0.06, 0.13, 0.045], rotation: [0, 0, -0.04] },
  // Inner quad detail
  { group: "quads", position: [-0.07, 0.55, 0.08], scale: [0.03, 0.06, 0.025] },
  { group: "quads", position: [0.07, 0.55, 0.08], scale: [0.03, 0.06, 0.025] },

  // Hamstrings — back of upper leg
  { group: "hamstrings", position: [-0.11, 0.65, -0.075], scale: [0.06, 0.13, 0.045] },
  { group: "hamstrings", position: [0.11, 0.65, -0.075], scale: [0.06, 0.13, 0.045] },

  // Calves — back of lower leg
  { group: "calves", position: [-0.11, 0.28, -0.07], scale: [0.05, 0.085, 0.04] },
  { group: "calves", position: [0.11, 0.28, -0.07], scale: [0.05, 0.085, 0.04] },
];

/**
 * Larger invisible click target per muscle group (one per side).
 * The visible plates are small/detailed; this hitbox makes them clickable easily.
 */
type Hitbox = {
  group: MuscleGroup;
  position: Vec3;
  radius: number;
};

const HITBOXES: Hitbox[] = [
  { group: "chest", position: [0, 1.45, 0.13], radius: 0.16 },
  { group: "abs", position: [0, 1.25, 0.13], radius: 0.14 },
  { group: "back", position: [0, 1.42, -0.13], radius: 0.18 },
  { group: "glutes", position: [0, 0.92, -0.11], radius: 0.13 },
  { group: "shoulders", position: [-0.25, 1.5, 0], radius: 0.09 },
  { group: "shoulders", position: [0.25, 1.5, 0], radius: 0.09 },
  { group: "biceps", position: [-0.42, 1.46, 0.05], radius: 0.09 },
  { group: "biceps", position: [0.42, 1.46, 0.05], radius: 0.09 },
  { group: "triceps", position: [-0.42, 1.46, -0.05], radius: 0.09 },
  { group: "triceps", position: [0.42, 1.46, -0.05], radius: 0.09 },
  { group: "forearms", position: [-0.66, 1.46, 0], radius: 0.1 },
  { group: "forearms", position: [0.66, 1.46, 0], radius: 0.1 },
  { group: "quads", position: [-0.11, 0.62, 0.08], radius: 0.13 },
  { group: "quads", position: [0.11, 0.62, 0.08], radius: 0.13 },
  { group: "hamstrings", position: [-0.11, 0.62, -0.08], radius: 0.13 },
  { group: "hamstrings", position: [0.11, 0.62, -0.08], radius: 0.13 },
  { group: "calves", position: [-0.11, 0.28, -0.07], radius: 0.1 },
  { group: "calves", position: [0.11, 0.28, -0.07], radius: 0.1 },
];

/** Shared geometries so we don't allocate one per plate. */
const PLATE_GEOMETRY = new THREE.SphereGeometry(1, 32, 24);
const HITBOX_GEOMETRY = new THREE.SphereGeometry(1, 16, 12);

/** Always-visible anatomical muscle plate. Glows by recovery color. */
function MusclePlate({
  plate,
  states,
  selection,
  hoveredGroup,
}: {
  plate: Plate;
  states: Record<MuscleGroup, MuscleState>;
  selection: BodySelection;
  hoveredGroup: MuscleGroup | null;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const isSelected = selection?.kind === "muscle" && selection.group === plate.group;
  const isHovered = hoveredGroup === plate.group;

  const hours = states[plate.group]?.hoursSince ?? null;
  const recovery = recoveryAmount(hours);
  const fatigue = 1 - recovery;
  const color = tirednessColor(hours);

  // Base brightness: visible even when fully rested (so muscle definition shows).
  // Adds extra glow when fatigued / hovered / selected.
  const targetStrength =
    0.5 + fatigue * 0.7 + (isHovered ? 0.55 : 0) + (isSelected ? 0.85 : 0);

  useFrame((state) => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    u.uStrength.value = THREE.MathUtils.lerp(u.uStrength.value, targetStrength, 0.18);
    (u.uColor.value as THREE.Color).set(color);
    u.uTime.value = state.clock.getElapsedTime();
  });

  return (
    <mesh
      position={plate.position}
      scale={plate.scale}
      rotation={plate.rotation ?? [0, 0, 0]}
      renderOrder={3}
      geometry={PLATE_GEOMETRY}
    >
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
              uniform float uTime;
              varying vec3 vNormal;
              varying vec3 vViewDir;
              void main() {
                float NdotV = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
                float core = pow(NdotV, 1.6);
                float rim  = pow(1.0 - NdotV, 2.0);
                float pulse = 0.92 + 0.08 * sin(uTime * 2.0);
                float a = (core * 0.55 + rim * 0.95) * uStrength * pulse;
                vec3 col = uColor * (1.4 * uStrength + 0.35);
                gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
              }
            `,
            uniforms: {
              uColor: { value: new THREE.Color(color) },
              uStrength: { value: 0.5 },
              uTime: { value: 0 },
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
  );
}

/** Invisible click/hover hitbox per muscle region. */
function MuscleHitbox({
  hitbox,
  onSelect,
  onHoverGroup,
}: {
  hitbox: Hitbox;
  onSelect: (s: BodySelection) => void;
  onHoverGroup: (g: MuscleGroup | null) => void;
}) {
  return (
    <mesh
      position={hitbox.position}
      scale={hitbox.radius}
      geometry={HITBOX_GEOMETRY}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHoverGroup(hitbox.group);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHoverGroup(null);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect({ kind: "muscle", group: hitbox.group });
      }}
    >
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
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
        <sphereGeometry args={[0.045, 32, 32]} />
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
        <sphereGeometry args={[0.045, 16, 16]} />
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
        <sphereGeometry args={[0.07, 32, 32]} />
        <meshStandardMaterial
          color={BRAIN_COLOR}
          emissive={BRAIN_COLOR}
          emissiveIntensity={isSelected ? 1.4 : hovered ? 1.0 : 0.55}
          roughness={0.45}
          transparent
          opacity={0.6}
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

  // Mirror plates to render side-symmetric (already explicit in PLATES, kept for clarity)
  const plates = useMemo(() => PLATES, []);
  const hitboxes = useMemo(() => HITBOXES, []);

  useFrame((_, dt) => {
    if (!root.current) return;
    root.current.position.y = Math.sin(performance.now() * 0.0008) * 0.012;
    if (autoRotate) {
      root.current.rotation.y += dt * 0.35;
    }
  });

  return (
    <group ref={root} dispose={null} onPointerMissed={() => onSelect(null)}>
      <BodyMesh targetHeight={1.88} color={HOLO_CYAN} />

      <Heart selection={selection} onSelect={onSelect} />
      <Brain selection={selection} onSelect={onSelect} />

      {/* Detailed always-visible muscle plates */}
      {plates.map((p, i) => (
        <MusclePlate
          key={`plate-${p.group}-${i}`}
          plate={p}
          states={muscleStates}
          selection={selection}
          hoveredGroup={hoveredGroup}
        />
      ))}

      {/* Invisible click targets — one big sphere per muscle region */}
      {hitboxes.map((h, i) => (
        <MuscleHitbox
          key={`hit-${h.group}-${i}`}
          hitbox={h}
          onSelect={onSelect}
          onHoverGroup={setHoveredGroup}
        />
      ))}

      {/* Scan halos at the feet */}
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
