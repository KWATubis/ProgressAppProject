"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
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
};

const NEUTRAL = "#1a2533";        // skin / structural — deep slate
const ACCENT_NEUTRAL = "#2a3645"; // hand/foot
const HEART_COLOR = "#ef4444";
const BRAIN_COLOR = "#a78bfa";

function MusclePart({
  group,
  position,
  rotation,
  geometry,
  states,
  selection,
  onSelect,
}: {
  group: MuscleGroup;
  position: [number, number, number];
  rotation?: [number, number, number];
  geometry: React.ReactNode;
  states: Record<MuscleGroup, MuscleState>;
  selection: BodySelection;
  onSelect: (s: BodySelection) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isSelected =
    selection?.kind === "muscle" && selection.group === group;
  const baseColor = tirednessColor(states[group]?.daysSince ?? null);

  return (
    <mesh
      position={position}
      rotation={rotation}
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
      castShadow
    >
      {geometry}
      <meshStandardMaterial
        color={baseColor}
        emissive={baseColor}
        emissiveIntensity={isSelected ? 0.55 : hovered ? 0.3 : 0.1}
        roughness={0.55}
        metalness={0.05}
      />
    </mesh>
  );
}

function NeutralPart({
  position,
  rotation,
  geometry,
  color = NEUTRAL,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  geometry: React.ReactNode;
  color?: string;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      {geometry}
      <meshStandardMaterial
        color={color}
        roughness={0.7}
        metalness={0.05}
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
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const isSelected = selection?.kind === "heart";

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 2.4) * 0.08;
    ref.current.scale.setScalar(pulse);
  });

  return (
    <mesh
      ref={ref}
      position={[-0.06, 1.38, 0.11]}
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
      <sphereGeometry args={[0.055, 24, 24]} />
      <meshStandardMaterial
        color={HEART_COLOR}
        emissive={HEART_COLOR}
        emissiveIntensity={isSelected ? 1.4 : hovered ? 1.1 : 0.85}
        roughness={0.3}
      />
    </mesh>
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
    <mesh
      position={[0, 1.68, 0]}
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
      <sphereGeometry args={[0.135, 32, 32]} />
      <meshStandardMaterial
        color={BRAIN_COLOR}
        emissive={BRAIN_COLOR}
        emissiveIntensity={isSelected ? 0.55 : hovered ? 0.4 : 0.15}
        roughness={0.4}
        transparent
        opacity={0.92}
      />
    </mesh>
  );
}

export function Humanoid({ muscleStates, selection, onSelect }: Props) {
  const root = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!root.current) return;
    root.current.position.y = Math.sin(performance.now() * 0.0008) * 0.015;
  });

  const capsule = (radius: number, length: number) => (
    <capsuleGeometry args={[radius, length, 6, 16]} />
  );

  return (
    <group ref={root} dispose={null} onPointerMissed={() => onSelect(null)}>
      {/* Neck */}
      <NeutralPart
        position={[0, 1.54, 0]}
        geometry={<cylinderGeometry args={[0.055, 0.07, 0.12, 16]} />}
      />

      {/* Head shell (clickable = brain) */}
      <Brain selection={selection} onSelect={onSelect} />

      {/* Core torso (structural) */}
      <NeutralPart
        position={[0, 1.2, 0]}
        geometry={<boxGeometry args={[0.38, 0.6, 0.2]} />}
      />

      {/* Chest patch */}
      <MusclePart
        group="chest"
        position={[0, 1.4, 0.105]}
        geometry={<boxGeometry args={[0.36, 0.2, 0.05]} />}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />

      {/* Abs patch */}
      <MusclePart
        group="abs"
        position={[0, 1.16, 0.105]}
        geometry={<boxGeometry args={[0.28, 0.24, 0.05]} />}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />

      {/* Back patch */}
      <MusclePart
        group="back"
        position={[0, 1.28, -0.105]}
        geometry={<boxGeometry args={[0.38, 0.46, 0.05]} />}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />

      {/* Glutes — sits at the bottom of the torso */}
      <NeutralPart
        position={[0, 0.88, 0]}
        geometry={<boxGeometry args={[0.36, 0.16, 0.22]} />}
      />
      <MusclePart
        group="glutes"
        position={[0, 0.9, -0.115]}
        geometry={<boxGeometry args={[0.34, 0.14, 0.05]} />}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />

      {/* Heart */}
      <Heart selection={selection} onSelect={onSelect} />

      {/* Shoulders L/R */}
      <MusclePart
        group="shoulders"
        position={[-0.235, 1.475, 0]}
        geometry={<sphereGeometry args={[0.085, 24, 24]} />}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />
      <MusclePart
        group="shoulders"
        position={[0.235, 1.475, 0]}
        geometry={<sphereGeometry args={[0.085, 24, 24]} />}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />

      {/* Upper arms (structural neutral) */}
      <NeutralPart
        position={[-0.28, 1.275, 0]}
        geometry={<capsuleGeometry args={[0.055, 0.28, 6, 16]} />}
      />
      <NeutralPart
        position={[0.28, 1.275, 0]}
        geometry={<capsuleGeometry args={[0.055, 0.28, 6, 16]} />}
      />

      {/* Biceps (front) L/R */}
      <MusclePart
        group="biceps"
        position={[-0.28, 1.32, 0.045]}
        geometry={capsule(0.035, 0.18)}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />
      <MusclePart
        group="biceps"
        position={[0.28, 1.32, 0.045]}
        geometry={capsule(0.035, 0.18)}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />

      {/* Triceps (back) L/R */}
      <MusclePart
        group="triceps"
        position={[-0.28, 1.32, -0.045]}
        geometry={capsule(0.035, 0.18)}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />
      <MusclePart
        group="triceps"
        position={[0.28, 1.32, -0.045]}
        geometry={capsule(0.035, 0.18)}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />

      {/* Forearms L/R */}
      <MusclePart
        group="forearms"
        position={[-0.28, 0.95, 0]}
        geometry={capsule(0.045, 0.26)}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />
      <MusclePart
        group="forearms"
        position={[0.28, 0.95, 0]}
        geometry={capsule(0.045, 0.26)}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />

      {/* Hands */}
      <NeutralPart
        position={[-0.28, 0.77, 0]}
        geometry={<boxGeometry args={[0.07, 0.1, 0.04]} />}
        color={ACCENT_NEUTRAL}
      />
      <NeutralPart
        position={[0.28, 0.77, 0]}
        geometry={<boxGeometry args={[0.07, 0.1, 0.04]} />}
        color={ACCENT_NEUTRAL}
      />

      {/* Upper legs (structural neutral) */}
      <NeutralPart
        position={[-0.11, 0.62, 0]}
        geometry={<capsuleGeometry args={[0.085, 0.36, 6, 16]} />}
      />
      <NeutralPart
        position={[0.11, 0.62, 0]}
        geometry={<capsuleGeometry args={[0.085, 0.36, 6, 16]} />}
      />

      {/* Quads (front) L/R */}
      <MusclePart
        group="quads"
        position={[-0.11, 0.66, 0.072]}
        geometry={capsule(0.05, 0.28)}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />
      <MusclePart
        group="quads"
        position={[0.11, 0.66, 0.072]}
        geometry={capsule(0.05, 0.28)}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />

      {/* Hamstrings (back) L/R */}
      <MusclePart
        group="hamstrings"
        position={[-0.11, 0.66, -0.072]}
        geometry={capsule(0.05, 0.28)}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />
      <MusclePart
        group="hamstrings"
        position={[0.11, 0.66, -0.072]}
        geometry={capsule(0.05, 0.28)}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />

      {/* Lower legs (structural neutral) */}
      <NeutralPart
        position={[-0.11, 0.2, 0]}
        geometry={<capsuleGeometry args={[0.065, 0.32, 6, 16]} />}
      />
      <NeutralPart
        position={[0.11, 0.2, 0]}
        geometry={<capsuleGeometry args={[0.065, 0.32, 6, 16]} />}
      />

      {/* Calves (back of lower leg) L/R */}
      <MusclePart
        group="calves"
        position={[-0.11, 0.23, -0.05]}
        geometry={capsule(0.04, 0.22)}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />
      <MusclePart
        group="calves"
        position={[0.11, 0.23, -0.05]}
        geometry={capsule(0.04, 0.22)}
        states={muscleStates}
        selection={selection}
        onSelect={onSelect}
      />

      {/* Feet */}
      <NeutralPart
        position={[-0.11, 0.02, 0.04]}
        geometry={<boxGeometry args={[0.09, 0.04, 0.18]} />}
        color={ACCENT_NEUTRAL}
      />
      <NeutralPart
        position={[0.11, 0.02, 0.04]}
        geometry={<boxGeometry args={[0.09, 0.04, 0.18]} />}
        color={ACCENT_NEUTRAL}
      />
    </group>
  );
}
