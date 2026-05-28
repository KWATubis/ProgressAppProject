"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MuscleGroup, MuscleState } from "@/lib/body/muscle-state";
import { BodyMesh } from "./BodyMesh";

/**
 * Selection shape kept stable so the explorer/detail panel keep compiling.
 * Interaction is paused for the design pass — selection always stays null.
 */
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

export function Humanoid({ autoRotate }: Props) {
  const root = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (!root.current) return;
    root.current.position.y = Math.sin(performance.now() * 0.0008) * 0.012;
    if (autoRotate) {
      root.current.rotation.y += dt * 0.35;
    }
  });

  return (
    <group ref={root} dispose={null}>
      <BodyMesh targetHeight={1.88} baseColor={HOLO_CYAN} />

      {/* Scan halos at the feet */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62, 0.66, 96]} />
        <meshBasicMaterial
          color={HOLO_CYAN}
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.78, 0.79, 96]} />
        <meshBasicMaterial
          color={HOLO_CYAN}
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
