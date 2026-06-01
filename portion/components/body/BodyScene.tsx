"use client";

import { Suspense, useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { MUSCLE_GROUPS, type MuscleGroup, type MuscleState } from "@/lib/body/muscle-state";
import type { BodySelection } from "./Humanoid";
import HoloBody, { type GroupCentroid } from "./HoloBody";

type Mode = "preview" | "idle" | "focused";

type Props = {
  muscleStates: Record<MuscleGroup, MuscleState>;
  selection: BodySelection;
  onSelect: (s: BodySelection) => void;
  mode: Mode;
};

const TARGETS = {
  preview: {
    pos: new THREE.Vector3(1.1, 1.25, 4.8),
    lookAt: new THREE.Vector3(0.75, 1.05, 0),
  },
  idle: {
    pos: new THREE.Vector3(0, 1.3, 2.5),
    lookAt: new THREE.Vector3(0, 1.05, 0),
  },
  focused: {
    pos: new THREE.Vector3(0.95, 1.2, 2.0),
    lookAt: new THREE.Vector3(0.5, 1.05, 0),
  },
} as const;

// Scratch vector reused for the per-frame pan-clamp correction (no allocation).
const PAN_FIX = new THREE.Vector3();

// Camera pose for a focused muscle at fitted-world height `y`. The body rotates
// to present the muscle to +z, so we only need to track its height: drop/raise
// the camera to the muscle and zoom in, with a slight 3/4 angle for depth.
function focusedPose(y: number) {
  const cy = THREE.MathUtils.clamp(y, 0.32, 1.78);
  return {
    pos: new THREE.Vector3(0.55, cy + 0.18, 1.85),
    lookAt: new THREE.Vector3(0.12, cy, 0),
  };
}

function CameraRig({ mode, focus }: { mode: Mode; focus: GroupCentroid }) {
  const { camera } = useThree();
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls> | null>(null);
  const desired = useRef({
    pos: TARGETS[mode].pos.clone(),
    look: TARGETS[mode].lookAt.clone(),
  });
  // True while we're animating the camera to a new target. While animating we
  // OWN the camera and OrbitControls is disabled — otherwise its residual
  // damping/zoom state (left over from the user orbiting in `focused`) fights
  // the lerp and the camera never pulls back out on deselect.
  const animating = useRef(true);

  useEffect(() => {
    const t = mode === "focused" && focus ? focusedPose(focus.y) : TARGETS[mode];
    desired.current.pos.copy(t.pos);
    desired.current.look.copy(t.lookAt);
    animating.current = true;
  }, [mode, focus]);

  useFrame((_, dt) => {
    const controls = controlsRef.current as unknown as {
      target: THREE.Vector3;
      update: () => void;
      enabled: boolean;
    } | null;

    if (animating.current) {
      const k = 1 - Math.pow(0.0001, dt);
      camera.position.lerp(desired.current.pos, k);
      if (controls) {
        // Hold input off and drive the look-at ourselves — do NOT call
        // controls.update() mid-flight, so there's zero tug-of-war.
        controls.enabled = false;
        controls.target.lerp(desired.current.look, k);
        camera.lookAt(controls.target);
      } else {
        camera.lookAt(desired.current.look);
      }
      if (camera.position.distanceTo(desired.current.pos) < 0.02) {
        animating.current = false;
        if (controls) controls.target.copy(desired.current.look);
      }
      return;
    }

    // Settled: hand the camera back to OrbitControls. Skip preview entirely —
    // it's a fixed auto-rotating card, and update()'s distance clamp would dolly
    // it in from its wide framing.
    if (controls) {
      if (mode === "preview") {
        controls.enabled = false;
        return;
      }
      controls.enabled = true;
      controls.update();
      // Keep the user from panning the figure out of frame: clamp the orbit
      // target to a box around the body and carry the camera with the clamp.
      const t = controls.target;
      const cx = THREE.MathUtils.clamp(t.x, -0.7, 0.7);
      const cy = THREE.MathUtils.clamp(t.y, 0.3, 1.9);
      const cz = THREE.MathUtils.clamp(t.z, -0.7, 0.7);
      camera.position.add(PAN_FIX.set(cx - t.x, cy - t.y, cz - t.z));
      t.set(cx, cy, cz);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      target={TARGETS.preview.lookAt.toArray()}
      enablePan
      screenSpacePanning
      panSpeed={0.8}
      minDistance={1.0}
      maxDistance={3.8}
      minPolarAngle={Math.PI * 0.15}
      maxPolarAngle={Math.PI * 0.88}
      dampingFactor={0.06}
      enableDamping
    />
  );
}

/** Deterministic pseudo-random (mulberry32) so particle positions are stable across renders. */
function seededRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ATMOS_VERT = /* glsl */ `
  attribute float size;
  attribute float phase;
  uniform float uTime;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.y += sin(uTime * 0.5 + phase) * 0.04;
    p.x += sin(uTime * 0.4 + phase * 1.7) * 0.02;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = size * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
    vAlpha = 0.4 + 0.5 * sin(uTime * 0.8 + phase * 2.3);
  }
`;
const ATMOS_FRAG = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(0.36, 0.89, 1.0, a * 0.7);
  }
`;

/** Floating data particles surrounding the body — gentle drift. */
function AtmosphereParticles({ count = 220 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, sizes, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const rng = seededRand(count * 1009 + 17);
    for (let i = 0; i < count; i++) {
      const r = 0.55 + rng() * 1.0;
      const theta = rng() * Math.PI * 2;
      positions[i * 3 + 0] = Math.cos(theta) * r;
      positions[i * 3 + 1] = rng() * 2.0;
      positions[i * 3 + 2] = Math.sin(theta) * r;
      sizes[i] = 0.012 + rng() * 0.022;
      phases[i] = rng() * Math.PI * 2;
    }
    return { positions, sizes, phases };
  }, [count]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0008;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-phase" args={[phases, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        args={[
          {
            uniforms,
            vertexShader: ATMOS_VERT,
            fragmentShader: ATMOS_FRAG,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          },
        ]}
      />
    </points>
  );
}

/** Sweeping diagnostic plane that travels up the body every ~6s. */
function ScanSweep() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    const y = (((t * 0.32) % 1) * 2.0); // 0 → 2.0
    ref.current.position.y = y;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    // fade out at top & bottom edges
    const edge = Math.min(y / 0.2, (2.0 - y) / 0.2, 1);
    mat.opacity = 0.18 * Math.max(0, edge);
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <ringGeometry args={[0.0, 0.55, 64]} />
      <meshBasicMaterial color="#5be3ff" transparent opacity={0} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
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
      <gridHelper args={[6, 24, "#1e4a66", "#0e2a3a"]} position={[0, 0, 0]} />
    </group>
  );
}

export default function BodyScene({ muscleStates, selection, onSelect, mode }: Props) {
  const [focusData, setFocusData] = useState<GroupCentroid[] | null>(null);
  const focus =
    mode === "focused" && selection?.kind === "muscle" && focusData
      ? focusData[MUSCLE_GROUPS.indexOf(selection.group)] ?? null
      : null;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: TARGETS.preview.pos.toArray(), fov: 32, near: 0.3, far: 40 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      style={{ width: "100%", height: "100%" }}
    >
      {mode !== "preview" ? <color attach="background" args={["#04080d"]} /> : null}
      {mode !== "preview" ? <fog attach="fog" args={["#04080d", 6, 11]} /> : null}

      <ambientLight intensity={0.18} color="#6cc6ff" />
      <directionalLight position={[2, 4, 3]} intensity={0.25} color="#9bd7ff" />
      <pointLight position={[-1.5, 2.5, 1.5]} intensity={0.35} color="#5be3ff" />
      <pointLight position={[1.5, 2, -1.5]} intensity={0.2} color="#3a7dff" />

      <Suspense fallback={null}>
        <HoloBody
          muscleStates={muscleStates}
          selection={selection}
          onSelect={onSelect}
          autoRotate={mode !== "focused"}
          interactive={mode !== "preview"}
          onFocusData={setFocusData}
        />
        {mode !== "preview" ? <GridFloor /> : null}
        {mode !== "preview" ? <AtmosphereParticles count={mode === "focused" ? 180 : 260} /> : null}
        {mode !== "preview" ? <ScanSweep /> : null}
        {mode !== "preview" ? (
          <ContactShadows
            position={[0, 0.005, 0]}
            opacity={0.4}
            scale={2.2}
            blur={2.8}
            far={1.8}
            color="#0d2a40"
          />
        ) : null}
      </Suspense>

      <CameraRig mode={mode} focus={focus} />

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          intensity={mode === "preview" ? 0.12 : 0.18}
          luminanceThreshold={0.82}
          luminanceSmoothing={0.35}
          mipmapBlur
          radius={0.32}
        />
        <Vignette
          offset={0.25}
          darkness={mode === "preview" ? 0.5 : 0.65}
          blendFunction={BlendFunction.NORMAL}
        />
      </EffectComposer>
    </Canvas>
  );
}
