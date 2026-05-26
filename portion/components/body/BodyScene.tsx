"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import type { MuscleGroup, MuscleState } from "@/lib/body/muscle-state";
import { Humanoid, type BodySelection } from "./Humanoid";

type Props = {
  muscleStates: Record<MuscleGroup, MuscleState>;
  selection: BodySelection;
  onSelect: (s: BodySelection) => void;
};

export default function BodyScene({ muscleStates, selection, onSelect }: Props) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 1.2, 2.3], fov: 35 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#0b0f15"]} />
      <fog attach="fog" args={["#0b0f15", 4, 8]} />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[2, 3, 2]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-2, 2, -1]} intensity={0.35} color="#9bb6ff" />

      <Suspense fallback={null}>
        <Humanoid
          muscleStates={muscleStates}
          selection={selection}
          onSelect={onSelect}
        />
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.55}
          scale={2.2}
          blur={2.4}
          far={1.8}
        />
        <Environment preset="city" />
      </Suspense>

      <OrbitControls
        target={[0, 1.05, 0]}
        enablePan={false}
        minDistance={1.4}
        maxDistance={4}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.85}
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
