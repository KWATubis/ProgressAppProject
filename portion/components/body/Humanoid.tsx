"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MuscleGroup, MuscleState } from "@/lib/body/muscle-state";
import { recoveryAmount } from "@/lib/body/muscle-state";
import { HoloMaterial } from "./HoloMaterial";

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

const STRUCT_CYAN = "#5be3ff";
const STRUCT_DEEP = "#2879b8";
const HEART_COLOR = "#ff3b5c";
const BRAIN_COLOR = "#b78bff";

type Vec3 = [number, number, number];

type Part = {
  geometry: ReactNode;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3 | number;
};

/* ────────────────────────────── helpers ────────────────────────────── */

/** Single non-muscle part (head, jaw, neck, hands, feet, limb shafts, pelvis). */
function Bone({
  geometry,
  position,
  rotation,
  scale,
  color = STRUCT_CYAN,
  opacity = 0.9,
}: {
  geometry: ReactNode;
  position: Vec3;
  rotation?: Vec3;
  scale?: Vec3 | number;
  color?: string;
  opacity?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      {geometry}
      <HoloMaterial structural color={color} opacity={opacity} />
    </mesh>
  );
}

/**
 * One or more sub-meshes that together form a muscle group's visible volume.
 * All children share fatigue + intensity. Clicking any of them selects the whole group.
 */
function Muscle({
  group,
  states,
  selection,
  onSelect,
  parts,
}: {
  group: MuscleGroup;
  states: Record<MuscleGroup, MuscleState>;
  selection: BodySelection;
  onSelect: (s: BodySelection) => void;
  parts: Part[];
}) {
  const [hovered, setHovered] = useState(false);
  const isSelected =
    selection?.kind === "muscle" && selection.group === group;
  const fatigue = recoveryAmount(states[group]?.hoursSince ?? null);
  const intensity = isSelected ? 2.4 : hovered ? 1.7 : 1.0;

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect({ kind: "muscle", group });
      }}
    >
      {parts.map((p, i) => (
        <mesh
          key={i}
          position={p.position}
          rotation={p.rotation}
          scale={p.scale}
        >
          {p.geometry}
          <HoloMaterial fatigue={fatigue} intensity={intensity} />
        </mesh>
      ))}
    </group>
  );
}

/** Lathe profile → tapered muscle belly (biceps, calves, quads, hamstrings). */
function bellyGeometry({
  length = 0.18,
  thickest = 0.045,
  taperTop = 0.018,
  taperBottom = 0.024,
  peakAt = 0.55,
  segments = 24,
}: {
  length?: number;
  thickest?: number;
  taperTop?: number;
  taperBottom?: number;
  peakAt?: number;
  segments?: number;
}): ReactNode {
  const pts: THREE.Vector2[] = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = -length / 2 + t * length;
    const dist = Math.abs(t - peakAt) / Math.max(peakAt, 1 - peakAt);
    const bell = Math.cos(dist * Math.PI * 0.5);
    const endTaper = t < peakAt ? taperTop : taperBottom;
    const r = endTaper + (thickest - endTaper) * bell;
    pts.push(new THREE.Vector2(Math.max(0.001, r), y));
  }
  return <latheGeometry args={[pts, segments]} />;
}

/** Flat angled wedge — used for lats. */
function latGeometry(): ReactNode {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.15);
  shape.bezierCurveTo(0.05, 0.13, 0.11, 0.05, 0.11, -0.05);
  shape.bezierCurveTo(0.11, -0.13, 0.04, -0.18, 0, -0.2);
  shape.bezierCurveTo(-0.02, -0.18, -0.02, 0.0, 0, 0.15);
  return (
    <extrudeGeometry
      args={[
        shape,
        {
          depth: 0.06,
          bevelEnabled: true,
          bevelThickness: 0.012,
          bevelSize: 0.014,
          bevelSegments: 4,
          curveSegments: 24,
        },
      ]}
    />
  );
}

/* ────────────────────────────── organs ────────────────────────────── */

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
    <group ref={ref} position={[-0.05, 1.4, 0.085]}>
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
        <sphereGeometry args={[0.055, 32, 32]} />
        <meshStandardMaterial
          color={HEART_COLOR}
          emissive={HEART_COLOR}
          emissiveIntensity={isSelected ? 3.5 : hovered ? 2.6 : 1.9}
          roughness={0.25}
          metalness={0.0}
          toneMapped={false}
        />
      </mesh>
      <mesh scale={1.35}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshBasicMaterial
          color={HEART_COLOR}
          transparent
          opacity={0.18}
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
        <sphereGeometry args={[0.105, 32, 32]} />
        <meshStandardMaterial
          color={BRAIN_COLOR}
          emissive={BRAIN_COLOR}
          emissiveIntensity={isSelected ? 1.4 : hovered ? 1.0 : 0.55}
          roughness={0.45}
          transparent
          opacity={0.7}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ────────────────────────────── Humanoid ────────────────────────────── */

export function Humanoid({
  muscleStates,
  selection,
  onSelect,
  autoRotate,
}: Props) {
  const root = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (!root.current) return;
    root.current.position.y = Math.sin(performance.now() * 0.0008) * 0.012;
    if (autoRotate) {
      root.current.rotation.y += dt * 0.35;
    }
  });

  const SH_X = 0.215;
  const EL_X = 0.225;
  const WR_X = 0.205;
  const HIP_X = 0.105;

  const ringPts = useMemo(() => {
    const a: THREE.Vector2[] = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      a.push(new THREE.Vector2(0.62 + 0.02 * Math.sin(t * Math.PI), -0.005 + t * 0.01));
    }
    return a;
  }, []);

  const M = { group: "" as MuscleGroup, states: muscleStates, selection, onSelect };

  return (
    <group ref={root} dispose={null} onPointerMissed={() => onSelect(null)}>
      {/* ─────────────── HEAD ─────────────── */}
      <Bone position={[0, 1.78, 0]} scale={[0.95, 1.05, 1.0]} geometry={<sphereGeometry args={[0.13, 32, 32]} />} />
      <Bone position={[0, 1.66, 0.012]} scale={[0.85, 0.7, 0.95]} geometry={<sphereGeometry args={[0.085, 24, 24]} />} />
      <Brain selection={selection} onSelect={onSelect} />

      {/* ─────────────── NECK ─────────────── */}
      <Bone position={[0, 1.555, 0]} geometry={<cylinderGeometry args={[0.05, 0.072, 0.13, 18]} />} />

      {/* ─────────────── TORSO (ribcage → waist → pelvis V-taper) ─────────────── */}
      <Bone
        position={[0, 1.32, 0]}
        scale={[1.0, 1.0, 0.7]}
        color={STRUCT_DEEP}
        opacity={0.85}
        geometry={<sphereGeometry args={[0.21, 28, 22]} />}
      />
      <Bone
        position={[0, 1.06, 0]}
        scale={[0.78, 0.45, 0.62]}
        color={STRUCT_DEEP}
        opacity={0.85}
        geometry={<sphereGeometry args={[0.2, 24, 20]} />}
      />
      <Bone
        position={[0, 0.89, 0]}
        scale={[0.95, 0.45, 0.7]}
        color={STRUCT_DEEP}
        opacity={0.85}
        geometry={<sphereGeometry args={[0.2, 24, 20]} />}
      />

      {/* ─────────────── CHEST (pecs) ─────────────── */}
      <Muscle
        {...M}
        group="chest"
        parts={[
          {
            position: [-0.078, 1.4, 0.135],
            rotation: [0, -0.18, 0.12],
            scale: [1.15, 0.65, 0.55],
            geometry: <sphereGeometry args={[0.075, 28, 22]} />,
          },
          {
            position: [-0.103, 1.418, 0.14],
            scale: [0.55, 0.55, 0.5],
            geometry: <sphereGeometry args={[0.05, 16, 14]} />,
          },
          {
            position: [0.078, 1.4, 0.135],
            rotation: [0, 0.18, -0.12],
            scale: [1.15, 0.65, 0.55],
            geometry: <sphereGeometry args={[0.075, 28, 22]} />,
          },
          {
            position: [0.103, 1.418, 0.14],
            scale: [0.55, 0.55, 0.5],
            geometry: <sphereGeometry args={[0.05, 16, 14]} />,
          },
        ]}
      />

      {/* ─────────────── ABS (6-pack + obliques) ─────────────── */}
      {/* Linea alba — structural divider */}
      <Bone
        position={[0, 1.16, 0.165]}
        color={STRUCT_DEEP}
        opacity={0.45}
        geometry={<boxGeometry args={[0.012, 0.32, 0.018]} />}
      />
      <Muscle
        {...M}
        group="abs"
        parts={[
          // 3 rows × 2 columns of 6-pack
          ...[0, 1, 2].flatMap((row) =>
            [-1, 1].map((side) => ({
              position: [side * 0.045, 1.27 - row * 0.07, 0.158] as Vec3,
              scale: [1.1, 0.85, 0.7] as Vec3,
              geometry: <sphereGeometry args={[0.035, 18, 14]} />,
            })),
          ),
          // Obliques
          ...[-1, 1].map((side) => ({
            position: [side * 0.135, 1.12, 0.105] as Vec3,
            rotation: [0, 0, side * 0.6] as Vec3,
            geometry: <capsuleGeometry args={[0.025, 0.08, 6, 14]} />,
          })),
        ]}
      />

      {/* ─────────────── BACK (lats + traps + erector spinae) ─────────────── */}
      <Muscle
        {...M}
        group="back"
        parts={[
          // Lats — flared wings
          {
            position: [-0.105, 1.28, -0.14],
            rotation: [0, -0.3, 0.25],
            scale: [-1, 1.0, 0.8],
            geometry: latGeometry(),
          },
          {
            position: [0.105, 1.28, -0.14],
            rotation: [0, 0.3, -0.25],
            scale: [1, 1.0, 0.8],
            geometry: latGeometry(),
          },
          // Traps — yoke
          {
            position: [0, 1.5, -0.05],
            scale: [1.6, 0.7, 1.0],
            geometry: <sphereGeometry args={[0.075, 22, 18]} />,
          },
          // Erector spinae — two columns
          {
            position: [-0.04, 1.05, -0.155],
            geometry: <capsuleGeometry args={[0.022, 0.22, 6, 12]} />,
          },
          {
            position: [0.04, 1.05, -0.155],
            geometry: <capsuleGeometry args={[0.022, 0.22, 6, 12]} />,
          },
        ]}
      />

      {/* ─────────────── GLUTES ─────────────── */}
      <Muscle
        {...M}
        group="glutes"
        parts={[
          {
            position: [-0.085, 0.84, -0.13],
            rotation: [0.15, 0, -0.1],
            scale: [1.0, 0.95, 0.95],
            geometry: <sphereGeometry args={[0.092, 22, 18]} />,
          },
          {
            position: [0.085, 0.84, -0.13],
            rotation: [0.15, 0, 0.1],
            scale: [1.0, 0.95, 0.95],
            geometry: <sphereGeometry args={[0.092, 22, 18]} />,
          },
        ]}
      />

      {/* ─────────────── HEART ─────────────── */}
      <Heart selection={selection} onSelect={onSelect} />

      {/* ─────────────── SHOULDERS (3-head delts) ─────────────── */}
      <Muscle
        {...M}
        group="shoulders"
        parts={[-1, 1].flatMap((side) => [
          // Lateral head
          {
            position: [side * SH_X, 1.475, 0] as Vec3,
            scale: [1.0, 0.9, 1.0] as Vec3,
            geometry: <sphereGeometry args={[0.082, 24, 20]} />,
          },
          // Anterior head
          {
            position: [side * (SH_X - 0.025), 1.46, 0.06] as Vec3,
            scale: [0.7, 0.7, 0.7] as Vec3,
            geometry: <sphereGeometry args={[0.058, 18, 16]} />,
          },
          // Posterior head
          {
            position: [side * (SH_X - 0.018), 1.455, -0.06] as Vec3,
            scale: [0.65, 0.7, 0.7] as Vec3,
            geometry: <sphereGeometry args={[0.055, 18, 16]} />,
          },
        ])}
      />

      {/* ─────────────── UPPER ARM SHAFTS ─────────────── */}
      {[-1, 1].map((side) => (
        <Bone
          key={`upperarm-${side}`}
          position={[(side * (SH_X + EL_X)) / 2, 1.32, 0]}
          rotation={[0, 0, side * -0.04]}
          color={STRUCT_DEEP}
          opacity={0.7}
          geometry={<capsuleGeometry args={[0.045, 0.27, 6, 14]} />}
        />
      ))}

      {/* ─────────────── BICEPS ─────────────── */}
      <Muscle
        {...M}
        group="biceps"
        parts={[-1, 1].flatMap((side) => [
          {
            position: [(side * (SH_X + EL_X)) / 2 + side * 0.018, 1.35, 0.05] as Vec3,
            rotation: [0, 0, side * 0.05] as Vec3,
            geometry: bellyGeometry({ length: 0.2, thickest: 0.046, taperTop: 0.018, taperBottom: 0.026 }),
          },
          {
            position: [(side * (SH_X + EL_X)) / 2 + side * 0.018, 1.37, 0.065] as Vec3,
            scale: [0.85, 0.6, 0.8] as Vec3,
            geometry: <sphereGeometry args={[0.034, 16, 14]} />,
          },
        ])}
      />

      {/* ─────────────── TRICEPS (3-head) ─────────────── */}
      <Muscle
        {...M}
        group="triceps"
        parts={[-1, 1].flatMap((side) => [
          {
            position: [(side * (SH_X + EL_X)) / 2 - side * 0.012, 1.36, -0.045] as Vec3,
            rotation: [0.05, 0, side * 0.04] as Vec3,
            geometry: bellyGeometry({ length: 0.16, thickest: 0.03, taperTop: 0.014, taperBottom: 0.018 }),
          },
          {
            position: [(side * (SH_X + EL_X)) / 2 + side * 0.022, 1.34, -0.05] as Vec3,
            rotation: [0.05, 0, side * 0.04] as Vec3,
            geometry: bellyGeometry({ length: 0.18, thickest: 0.028, taperTop: 0.012, taperBottom: 0.02 }),
          },
          {
            position: [(side * (SH_X + EL_X)) / 2, 1.25, -0.045] as Vec3,
            scale: [1, 0.7, 1] as Vec3,
            geometry: <sphereGeometry args={[0.034, 14, 12]} />,
          },
        ])}
      />

      {/* ─────────────── FOREARMS ─────────────── */}
      <Muscle
        {...M}
        group="forearms"
        parts={[-1, 1].flatMap((side) => [
          {
            position: [(side * (EL_X + WR_X)) / 2, 1.0, 0.005] as Vec3,
            rotation: [0, 0, side * 0.05] as Vec3,
            geometry: bellyGeometry({ length: 0.26, thickest: 0.045, taperTop: 0.032, taperBottom: 0.022 }),
          },
          {
            position: [(side * (EL_X + WR_X)) / 2 + side * 0.022, 1.07, 0.012] as Vec3,
            scale: [0.6, 0.7, 0.65] as Vec3,
            geometry: <sphereGeometry args={[0.038, 16, 14]} />,
          },
        ])}
      />

      {/* ─────────────── HANDS ─────────────── */}
      {[-1, 1].map((side) => (
        <Bone
          key={`hand-${side}`}
          position={[side * WR_X, 0.79, 0]}
          geometry={<boxGeometry args={[0.06, 0.1, 0.045]} />}
        />
      ))}

      {/* ─────────────── UPPER LEG SHAFTS ─────────────── */}
      {[-1, 1].map((side) => (
        <Bone
          key={`upperleg-${side}`}
          position={[side * HIP_X, 0.6, 0]}
          color={STRUCT_DEEP}
          opacity={0.7}
          geometry={<capsuleGeometry args={[0.078, 0.4, 6, 14]} />}
        />
      ))}

      {/* ─────────────── QUADS (3 heads) ─────────────── */}
      <Muscle
        {...M}
        group="quads"
        parts={[-1, 1].flatMap((side) => [
          // Rectus femoris — center
          {
            position: [side * HIP_X, 0.66, 0.07] as Vec3,
            geometry: bellyGeometry({ length: 0.32, thickest: 0.04, taperTop: 0.02, taperBottom: 0.026 }),
          },
          // Vastus lateralis — outer
          {
            position: [side * (HIP_X + 0.045), 0.66, 0.045] as Vec3,
            rotation: [0, 0, side * -0.06] as Vec3,
            geometry: bellyGeometry({ length: 0.3, thickest: 0.034, taperTop: 0.014, taperBottom: 0.022 }),
          },
          // Vastus medialis — inner-lower teardrop
          {
            position: [side * (HIP_X - 0.04), 0.5, 0.062] as Vec3,
            scale: [1.1, 1.0, 0.9] as Vec3,
            geometry: <sphereGeometry args={[0.038, 18, 14]} />,
          },
        ])}
      />

      {/* ─────────────── HAMSTRINGS ─────────────── */}
      <Muscle
        {...M}
        group="hamstrings"
        parts={[-1, 1].flatMap((side) => [
          {
            position: [side * (HIP_X + 0.025), 0.6, -0.075] as Vec3,
            rotation: [0, 0, side * -0.04] as Vec3,
            geometry: bellyGeometry({ length: 0.32, thickest: 0.034, taperTop: 0.022, taperBottom: 0.018 }),
          },
          {
            position: [side * (HIP_X - 0.022), 0.6, -0.075] as Vec3,
            rotation: [0, 0, side * 0.04] as Vec3,
            geometry: bellyGeometry({ length: 0.32, thickest: 0.03, taperTop: 0.018, taperBottom: 0.016 }),
          },
        ])}
      />

      {/* ─────────────── LOWER LEG SHAFTS ─────────────── */}
      {[-1, 1].map((side) => (
        <Bone
          key={`lowerleg-${side}`}
          position={[side * HIP_X, 0.21, 0]}
          color={STRUCT_DEEP}
          opacity={0.7}
          geometry={<capsuleGeometry args={[0.06, 0.34, 6, 14]} />}
        />
      ))}

      {/* ─────────────── CALVES (gastroc heads + soleus) ─────────────── */}
      <Muscle
        {...M}
        group="calves"
        parts={[-1, 1].flatMap((side) => [
          {
            position: [side * (HIP_X - 0.022), 0.32, -0.055] as Vec3,
            geometry: bellyGeometry({ length: 0.18, thickest: 0.035, taperTop: 0.016, taperBottom: 0.012 }),
          },
          {
            position: [side * (HIP_X + 0.022), 0.3, -0.055] as Vec3,
            geometry: bellyGeometry({ length: 0.17, thickest: 0.03, taperTop: 0.014, taperBottom: 0.012 }),
          },
          {
            position: [side * HIP_X, 0.13, -0.05] as Vec3,
            scale: [1.2, 1, 1] as Vec3,
            geometry: <capsuleGeometry args={[0.028, 0.08, 4, 10]} />,
          },
        ])}
      />

      {/* ─────────────── FEET ─────────────── */}
      {[-1, 1].map((side) => (
        <Bone
          key={`foot-${side}`}
          position={[side * HIP_X, 0.025, 0.045]}
          color={STRUCT_DEEP}
          opacity={0.7}
          geometry={<boxGeometry args={[0.08, 0.04, 0.2]} />}
        />
      ))}

      {/* ─────────────── SCAN HALO ─────────────── */}
      <mesh position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62, 0.66, 96]} />
        <meshBasicMaterial
          color={STRUCT_CYAN}
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.78, 0.79, 96]} />
        <meshBasicMaterial
          color={STRUCT_CYAN}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <latheGeometry args={[ringPts, 96]} />
        <meshBasicMaterial color={STRUCT_CYAN} transparent opacity={0.1} toneMapped={false} />
      </mesh>
    </group>
  );
}
