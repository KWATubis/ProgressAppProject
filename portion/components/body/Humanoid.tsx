"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MuscleGroup, MuscleState } from "@/lib/body/muscle-state";
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
 * Invisible click + hover hit-spheres for each muscle region.
 * Tuned to the arms-down baked X-Bot body at 1.88m tall.
 */
type Hitbox = {
  group: MuscleGroup;
  position: Vec3;
  radius: number;
};

const HITBOXES: Hitbox[] = [
  { group: "chest", position: [0, 1.45, 0.13], radius: 0.16 },
  { group: "abs", position: [0, 1.22, 0.13], radius: 0.14 },
  { group: "back", position: [0, 1.35, -0.13], radius: 0.18 },
  { group: "glutes", position: [0, 0.92, -0.11], radius: 0.13 },
  { group: "shoulders", position: [-0.21, 1.52, 0], radius: 0.1 },
  { group: "shoulders", position: [0.21, 1.52, 0], radius: 0.1 },
  { group: "biceps", position: [-0.22, 1.32, 0.05], radius: 0.1 },
  { group: "biceps", position: [0.22, 1.32, 0.05], radius: 0.1 },
  { group: "triceps", position: [-0.22, 1.32, -0.05], radius: 0.1 },
  { group: "triceps", position: [0.22, 1.32, -0.05], radius: 0.1 },
  { group: "forearms", position: [-0.22, 1.08, 0.02], radius: 0.11 },
  { group: "forearms", position: [0.22, 1.08, 0.02], radius: 0.11 },
  { group: "quads", position: [-0.11, 0.62, 0.08], radius: 0.14 },
  { group: "quads", position: [0.11, 0.62, 0.08], radius: 0.14 },
  { group: "hamstrings", position: [-0.11, 0.62, -0.08], radius: 0.14 },
  { group: "hamstrings", position: [0.11, 0.62, -0.08], radius: 0.14 },
  { group: "calves", position: [-0.11, 0.28, -0.07], radius: 0.11 },
  { group: "calves", position: [0.11, 0.28, -0.07], radius: 0.11 },
];

const HITBOX_GEOMETRY = new THREE.SphereGeometry(1, 16, 12);

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
    <group ref={ref} position={[-0.04, 1.42, 0.085]}>
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
        <sphereGeometry args={[0.038, 32, 32]} />
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
        <sphereGeometry args={[0.038, 16, 16]} />
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
        <sphereGeometry args={[0.06, 32, 32]} />
        <meshStandardMaterial
          color={BRAIN_COLOR}
          emissive={BRAIN_COLOR}
          emissiveIntensity={isSelected ? 1.4 : hovered ? 1.0 : 0.55}
          roughness={0.45}
          transparent
          opacity={0.55}
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

  const selectedGroup =
    selection?.kind === "muscle" ? selection.group : null;

  useFrame((_, dt) => {
    if (!root.current) return;
    root.current.position.y = Math.sin(performance.now() * 0.0008) * 0.012;
    if (autoRotate) {
      root.current.rotation.y += dt * 0.35;
    }
  });

  return (
    <group ref={root} dispose={null} onPointerMissed={() => onSelect(null)}>
      <BodyMesh
        targetHeight={1.88}
        baseColor={HOLO_CYAN}
        muscleStates={muscleStates}
        hoveredGroup={hoveredGroup}
        selectedGroup={selectedGroup}
      />

      <Heart selection={selection} onSelect={onSelect} />
      <Brain selection={selection} onSelect={onSelect} />

      {HITBOXES.map((h, i) => (
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
