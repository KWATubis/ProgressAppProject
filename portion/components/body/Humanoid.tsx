"use client";

import { useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { MuscleGroup, MuscleState } from "@/lib/body/muscle-state";
import { tirednessColor } from "@/lib/body/muscle-state";

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
const HOLO_BLUE = "#3aa8ff";
const HOLO_DEEP = "#0a3f5a";
const HEART_COLOR = "#ff3b5c";
const BRAIN_COLOR = "#b78bff";

/** Wireframe-only material with emissive glow. */
function HoloMaterial({
  color,
  intensity = 1,
  opacity = 0.9,
}: {
  color: string;
  intensity?: number;
  opacity?: number;
}) {
  return (
    <meshBasicMaterial
      color={color}
      wireframe
      transparent
      opacity={opacity * intensity}
      depthWrite={false}
      toneMapped={false}
    />
  );
}

/** Solid translucent skin under the wireframe — adds depth + bloom catch. */
function HoloSkin({ color = HOLO_DEEP }: { color?: string }) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={0.18}
      transparent
      opacity={0.12}
      roughness={0.7}
      metalness={0.0}
      depthWrite={false}
    />
  );
}

function Part({
  geometry,
  position,
  rotation,
  color = HOLO_CYAN,
  glow = 1,
  onPointerOver,
  onPointerOut,
  onClick,
  pulse,
}: {
  geometry: React.ReactNode;
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  glow?: number;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  pulse?: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current || !pulse) return;
    const t = state.clock.getElapsedTime();
    ref.current.scale.setScalar(1 + Math.sin(t * 2.6) * 0.04);
  });
  return (
    <group ref={ref} position={position} rotation={rotation}>
      <mesh
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onClick={onClick}
      >
        {geometry}
        <HoloSkin color={color} />
      </mesh>
      <mesh>
        {geometry}
        <HoloMaterial color={color} intensity={glow} />
      </mesh>
    </group>
  );
}

function MusclePart({
  group,
  states,
  selection,
  position,
  rotation,
  geometry,
  onSelect,
}: {
  group: MuscleGroup;
  states: Record<MuscleGroup, MuscleState>;
  selection: BodySelection;
  position: [number, number, number];
  rotation?: [number, number, number];
  geometry: React.ReactNode;
  onSelect: (s: BodySelection) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isSelected =
    selection?.kind === "muscle" && selection.group === group;
  const color = tirednessColor(states[group]?.daysSince ?? null);
  const intensity = isSelected ? 1.8 : hovered ? 1.4 : 1.0;

  return (
    <Part
      geometry={geometry}
      position={position}
      rotation={rotation}
      color={color}
      glow={intensity}
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
        onSelect({ kind: "muscle", group });
      }}
    />
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
    // Two-beat pulse: lub-dub
    const beat = (Math.sin(t * 4.0) + Math.sin(t * 4.0 + 0.5)) * 0.04 + 1;
    ref.current.scale.setScalar(beat);
  });

  return (
    <group ref={ref} position={[-0.05, 1.4, 0.115]}>
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
          emissiveIntensity={isSelected ? 2.2 : hovered ? 1.8 : 1.4}
          roughness={0.25}
          metalness={0.0}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial
          color={HEART_COLOR}
          transparent
          opacity={0.25}
          wireframe
          toneMapped={false}
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
    <group position={[0, 1.74, 0]}>
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
        <sphereGeometry args={[0.115, 32, 32]} />
        <meshStandardMaterial
          color={BRAIN_COLOR}
          emissive={BRAIN_COLOR}
          emissiveIntensity={isSelected ? 0.9 : hovered ? 0.65 : 0.35}
          roughness={0.4}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.135, 16, 16]} />
        <meshBasicMaterial
          color={BRAIN_COLOR}
          transparent
          opacity={0.35}
          wireframe
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

  useFrame((_, dt) => {
    if (!root.current) return;
    // Subtle breathing always
    root.current.position.y = Math.sin(performance.now() * 0.0008) * 0.012;
    // Auto Y rotation in idle mode
    if (autoRotate) {
      root.current.rotation.y += dt * 0.35;
    }
  });

  // Body proportions (1u ≈ 1m). Anatomical V-taper, arms close to body.
  const SH_X = 0.205; // shoulder joint x
  const EL_X = 0.213; // elbow x (slight outward)
  const WR_X = 0.198; // wrist x (slight inward bend)
  const HIP_X = 0.105; // hip joint x

  return (
    <group ref={root} dispose={null} onPointerMissed={() => onSelect(null)}>
      {/* ---------- HEAD ---------- */}
      <Part
        geometry={<sphereGeometry args={[0.135, 32, 32]} />}
        position={[0, 1.75, 0]}
        color={HOLO_CYAN}
      />
      {/* Jaw shape */}
      <Part
        geometry={<sphereGeometry args={[0.085, 24, 24]} />}
        position={[0, 1.64, 0.015]}
        color={HOLO_CYAN}
      />
      {/* Brain (inside head, clickable) */}
      <Brain selection={selection} onSelect={onSelect} />

      {/* ---------- NECK ---------- */}
      <Part
        geometry={<cylinderGeometry args={[0.052, 0.07, 0.13, 16]} />}
        position={[0, 1.53, 0]}
        color={HOLO_CYAN}
      />

      {/* ---------- TORSO BASE (V-taper using two trapezoidal cylinders) ---------- */}
      {/* Upper torso (rib cage): broader at top → narrower at waist */}
      <Part
        geometry={<cylinderGeometry args={[0.205, 0.155, 0.34, 24, 1, false]} />}
        position={[0, 1.3, 0]}
        color={HOLO_CYAN}
      />
      {/* Lower torso (waist → hips): narrow → flare */}
      <Part
        geometry={<cylinderGeometry args={[0.155, 0.175, 0.18, 24, 1, false]} />}
        position={[0, 1.04, 0]}
        color={HOLO_CYAN}
      />
      {/* Hips / pelvis block */}
      <Part
        geometry={<cylinderGeometry args={[0.175, 0.16, 0.16, 24, 1, false]} />}
        position={[0, 0.87, 0]}
        color={HOLO_CYAN}
      />

      {/* ---------- CHEST (PECS — left + right) ---------- */}
      <MusclePart
        group="chest"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[-0.085, 1.42, 0.135]}
        geometry={<sphereGeometry args={[0.085, 24, 24]} />}
      />
      <MusclePart
        group="chest"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[0.085, 1.42, 0.135]}
        geometry={<sphereGeometry args={[0.085, 24, 24]} />}
      />

      {/* ---------- ABS (6-pack — 3 rows of 2) ---------- */}
      {[0, 1, 2].map((row) =>
        [-1, 1].map((side) => (
          <MusclePart
            key={`abs-${row}-${side}`}
            group="abs"
            states={muscleStates}
            selection={selection}
            onSelect={onSelect}
            position={[side * 0.04, 1.25 - row * 0.07, 0.158]}
            geometry={<sphereGeometry args={[0.038, 20, 20]} />}
          />
        )),
      )}

      {/* ---------- BACK (lats — flares from spine outward) ---------- */}
      <MusclePart
        group="back"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[-0.11, 1.28, -0.14]}
        rotation={[0, 0, -0.15]}
        geometry={<capsuleGeometry args={[0.055, 0.24, 8, 16]} />}
      />
      <MusclePart
        group="back"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[0.11, 1.28, -0.14]}
        rotation={[0, 0, 0.15]}
        geometry={<capsuleGeometry args={[0.055, 0.24, 8, 16]} />}
      />
      {/* Upper traps */}
      <MusclePart
        group="back"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[0, 1.5, -0.06]}
        geometry={<sphereGeometry args={[0.075, 20, 20]} />}
      />

      {/* ---------- GLUTES ---------- */}
      <MusclePart
        group="glutes"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[-0.075, 0.83, -0.13]}
        geometry={<sphereGeometry args={[0.085, 20, 20]} />}
      />
      <MusclePart
        group="glutes"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[0.075, 0.83, -0.13]}
        geometry={<sphereGeometry args={[0.085, 20, 20]} />}
      />

      {/* ---------- HEART ---------- */}
      <Heart selection={selection} onSelect={onSelect} />

      {/* ---------- SHOULDERS (delts) ---------- */}
      <MusclePart
        group="shoulders"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[-SH_X, 1.48, 0]}
        geometry={<sphereGeometry args={[0.085, 24, 24]} />}
      />
      <MusclePart
        group="shoulders"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[SH_X, 1.48, 0]}
        geometry={<sphereGeometry args={[0.085, 24, 24]} />}
      />

      {/* ---------- UPPER ARMS (base structural — close to body, slight outward tilt) ---------- */}
      <Part
        geometry={<capsuleGeometry args={[0.055, 0.26, 8, 16]} />}
        position={[-(SH_X + EL_X) / 2, 1.32, 0]}
        rotation={[0, 0, -0.04]}
        color={HOLO_CYAN}
      />
      <Part
        geometry={<capsuleGeometry args={[0.055, 0.26, 8, 16]} />}
        position={[(SH_X + EL_X) / 2, 1.32, 0]}
        rotation={[0, 0, 0.04]}
        color={HOLO_CYAN}
      />

      {/* ---------- BICEPS (front of upper arm) ---------- */}
      <MusclePart
        group="biceps"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[-(SH_X + EL_X) / 2, 1.35, 0.05]}
        geometry={<capsuleGeometry args={[0.038, 0.16, 6, 14]} />}
      />
      <MusclePart
        group="biceps"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[(SH_X + EL_X) / 2, 1.35, 0.05]}
        geometry={<capsuleGeometry args={[0.038, 0.16, 6, 14]} />}
      />

      {/* ---------- TRICEPS (back of upper arm) ---------- */}
      <MusclePart
        group="triceps"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[-(SH_X + EL_X) / 2, 1.32, -0.05]}
        geometry={<capsuleGeometry args={[0.038, 0.18, 6, 14]} />}
      />
      <MusclePart
        group="triceps"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[(SH_X + EL_X) / 2, 1.32, -0.05]}
        geometry={<capsuleGeometry args={[0.038, 0.18, 6, 14]} />}
      />

      {/* ---------- FOREARMS ---------- */}
      <MusclePart
        group="forearms"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[-(EL_X + WR_X) / 2, 1.0, 0.005]}
        rotation={[0, 0, 0.05]}
        geometry={<capsuleGeometry args={[0.045, 0.24, 8, 16]} />}
      />
      <MusclePart
        group="forearms"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[(EL_X + WR_X) / 2, 1.0, 0.005]}
        rotation={[0, 0, -0.05]}
        geometry={<capsuleGeometry args={[0.045, 0.24, 8, 16]} />}
      />

      {/* ---------- HANDS ---------- */}
      <Part
        geometry={<boxGeometry args={[0.07, 0.12, 0.045]} />}
        position={[-WR_X, 0.79, 0]}
        color={HOLO_CYAN}
      />
      <Part
        geometry={<boxGeometry args={[0.07, 0.12, 0.045]} />}
        position={[WR_X, 0.79, 0]}
        color={HOLO_CYAN}
      />

      {/* ---------- UPPER LEGS (base — slight outward at hip, vertical) ---------- */}
      <Part
        geometry={<capsuleGeometry args={[0.085, 0.38, 8, 16]} />}
        position={[-HIP_X, 0.6, 0]}
        color={HOLO_CYAN}
      />
      <Part
        geometry={<capsuleGeometry args={[0.085, 0.38, 8, 16]} />}
        position={[HIP_X, 0.6, 0]}
        color={HOLO_CYAN}
      />

      {/* ---------- QUADS (front of upper leg) ---------- */}
      <MusclePart
        group="quads"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[-HIP_X, 0.65, 0.075]}
        geometry={<capsuleGeometry args={[0.052, 0.3, 6, 14]} />}
      />
      <MusclePart
        group="quads"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[HIP_X, 0.65, 0.075]}
        geometry={<capsuleGeometry args={[0.052, 0.3, 6, 14]} />}
      />

      {/* ---------- HAMSTRINGS (back of upper leg) ---------- */}
      <MusclePart
        group="hamstrings"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[-HIP_X, 0.6, -0.075]}
        geometry={<capsuleGeometry args={[0.052, 0.3, 6, 14]} />}
      />
      <MusclePart
        group="hamstrings"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[HIP_X, 0.6, -0.075]}
        geometry={<capsuleGeometry args={[0.052, 0.3, 6, 14]} />}
      />

      {/* ---------- LOWER LEGS (base) ---------- */}
      <Part
        geometry={<capsuleGeometry args={[0.065, 0.34, 8, 16]} />}
        position={[-HIP_X, 0.21, 0]}
        color={HOLO_CYAN}
      />
      <Part
        geometry={<capsuleGeometry args={[0.065, 0.34, 8, 16]} />}
        position={[HIP_X, 0.21, 0]}
        color={HOLO_CYAN}
      />

      {/* ---------- CALVES (back of lower leg) ---------- */}
      <MusclePart
        group="calves"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[-HIP_X, 0.27, -0.055]}
        geometry={<capsuleGeometry args={[0.04, 0.2, 6, 14]} />}
      />
      <MusclePart
        group="calves"
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
        position={[HIP_X, 0.27, -0.055]}
        geometry={<capsuleGeometry args={[0.04, 0.2, 6, 14]} />}
      />

      {/* ---------- FEET ---------- */}
      <Part
        geometry={<boxGeometry args={[0.095, 0.04, 0.2]} />}
        position={[-HIP_X, 0.02, 0.04]}
        color={HOLO_BLUE}
      />
      <Part
        geometry={<boxGeometry args={[0.095, 0.04, 0.2]} />}
        position={[HIP_X, 0.02, 0.04]}
        color={HOLO_BLUE}
      />

      {/* ---------- DECORATIVE: scan rings around body (atmosphere) ---------- */}
      <mesh position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.6, 64]} />
        <meshBasicMaterial
          color={HOLO_CYAN}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.74, 64]} />
        <meshBasicMaterial
          color={HOLO_CYAN}
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
