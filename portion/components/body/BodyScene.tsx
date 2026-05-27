"use client";

import { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import type { MuscleGroup, MuscleState } from "@/lib/body/muscle-state";
import { Humanoid, type BodySelection } from "./Humanoid";

type Props = {
  muscleStates: Record<MuscleGroup, MuscleState>;
  selection: BodySelection;
  onSelect: (s: BodySelection) => void;
  mode: "idle" | "focused";
};

/** Camera targets per mode. Idle pushes the body to the left of the canvas. */
const TARGETS = {
  idle: {
    pos: new THREE.Vector3(0.95, 1.25, 3.1),
    lookAt: new THREE.Vector3(0.5, 1.05, 0),
  },
  focused: {
    pos: new THREE.Vector3(0, 1.2, 2.0),
    lookAt: new THREE.Vector3(0, 1.05, 0),
  },
} as const;

function CameraRig({ mode }: { mode: "idle" | "focused" }) {
  const { camera } = useThree();
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls> | null>(null);
  const desired = useRef({ pos: TARGETS.idle.pos.clone(), look: TARGETS.idle.lookAt.clone() });

  useEffect(() => {
    const t = TARGETS[mode];
    desired.current.pos = t.pos.clone();
    desired.current.look = t.lookAt.clone();
  }, [mode]);

  useFrame((_, dt) => {
    const k = 1 - Math.pow(0.0001, dt); // ~85% per second
    camera.position.lerp(desired.current.pos, k);
    if (controlsRef.current) {
      const controls = controlsRef.current as unknown as {
        target: THREE.Vector3;
        update: () => void;
        enabled: boolean;
      };
      controls.target.lerp(desired.current.look, k);
      controls.enabled = mode === "focused";
      controls.update();
    } else {
      camera.lookAt(desired.current.look);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      target={TARGETS.idle.lookAt.toArray()}
      enablePan={false}
      minDistance={1.3}
      maxDistance={3.5}
      minPolarAngle={Math.PI * 0.2}
      maxPolarAngle={Math.PI * 0.82}
      dampingFactor={0.08}
      enableDamping
    />
  );
}

function GridFloor() {
  return (
    <group position={[0, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[0.0, 2.2, 64]} />
        <meshBasicMaterial
          color="#0a3f5a"
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <gridHelper
        args={[6, 24, "#1e4a66", "#0e2a3a"]}
        position={[0, 0, 0]}
      />
    </group>
  );
}

export default function BodyScene({
  muscleStates,
  selection,
  onSelect,
  mode,
}: Props) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: TARGETS.idle.pos.toArray(), fov: 32 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#04080d"]} />
      <fog attach="fog" args={["#04080d", 5, 9]} />

      <ambientLight intensity={0.25} />
      <directionalLight
        position={[2, 4, 3]}
        intensity={0.45}
        color="#6cc6ff"
      />
      <pointLight position={[-1.5, 2.5, 1.5]} intensity={1.2} color="#5be3ff" />
      <pointLight position={[1.5, 2, -1.5]} intensity={0.6} color="#3a7dff" />

      <Suspense fallback={null}>
        <Humanoid
          muscleStates={muscleStates}
          selection={selection}
          onSelect={onSelect}
          autoRotate={mode === "idle"}
        />
        <GridFloor />
        <ContactShadows
          position={[0, 0.005, 0]}
          opacity={0.4}
          scale={2.2}
          blur={2.8}
          far={1.8}
          color="#0d2a40"
        />
      </Suspense>

      <CameraRig mode={mode} />
    </Canvas>
  );
}
