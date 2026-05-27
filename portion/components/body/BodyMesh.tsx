"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

/**
 * Loads /models/body.glb (a Mixamo X-Bot character in T-pose), fits it to a
 * target height, and renders it as a translucent inner shell + bright cyan
 * wireframe overlay — the holographic body scan aesthetic.
 *
 * Per-muscle fatigue tinting is layered separately as additive blobs (see
 * MuscleHighlights in Humanoid.tsx). This mesh stays a uniform color.
 */

const SKIN_VERT = /* glsl */ `
  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vec4 viewPos = viewMatrix * worldPos;
    vViewNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-viewPos.xyz);
    gl_Position = projectionMatrix * viewPos;
  }
`;

const SKIN_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3  uColor;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    float NdotV = clamp(dot(normalize(vViewNormal), normalize(vViewDir)), 0.0, 1.0);
    float fresnel = pow(1.0 - NdotV, 2.0);

    // Downward-drifting scanline.
    float scan = sin((vWorldPos.y - uTime * 0.18) * 80.0) * 0.5 + 0.5;
    scan = pow(scan, 8.0);

    // Sweeping diagnostic line every ~3s
    float sweep = smoothstep(0.04, 0.0, abs(fract(uTime * 0.35) * 2.0 - 0.4 - vWorldPos.y));

    vec3 col = uColor * (0.18 + fresnel * 1.8);
    col += uColor * scan * 0.16;
    col += uColor * sweep * 0.9;

    float alpha = clamp(fresnel * 0.85 + scan * 0.10 + sweep * 0.7 + 0.10, 0.0, 1.0);
    gl_FragColor = vec4(col, alpha * 0.85);
  }
`;

const WIRE_VERT = /* glsl */ `
  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec4 viewPos = viewMatrix * worldPos;
    vViewNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-viewPos.xyz);
    gl_Position = projectionMatrix * viewPos;
  }
`;

const WIRE_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  void main() {
    float NdotV = clamp(dot(normalize(vViewNormal), normalize(vViewDir)), 0.0, 1.0);
    float fresnel = pow(1.0 - NdotV, 1.4);
    float intensity = 0.55 + fresnel * 1.2;
    gl_FragColor = vec4(uColor * intensity, 1.0);
  }
`;

type Props = {
  /** Desired body height in world units. Mesh is uniformly scaled to match. */
  targetHeight?: number;
  /** Y position offset (default 0 = feet on floor). */
  floorY?: number;
  color?: string;
};

useGLTF.preload("/models/body.glb");

export function BodyMesh({
  targetHeight = 1.88,
  floorY = 0,
  color = "#5be3ff",
}: Props) {
  const skinUniformsRef = useRef<{ uTime: { value: number }; uColor: { value: THREE.Color } }>({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) },
  });
  const wireUniformsRef = useRef<{ uColor: { value: THREE.Color } }>({
    uColor: { value: new THREE.Color(color) },
  });

  const gltf = useGLTF("/models/body.glb");

  // Clone the scene so we can mutate materials without affecting the cached source.
  // SkeletonUtils handles cloning SkinnedMesh correctly (preserving bone references).
  const scene = useMemo(() => {
    try {
      return SkeletonUtils.clone(gltf.scene);
    } catch (e) {
      console.error("Failed to clone GLB scene:", e);
      return null;
    }
  }, [gltf]);

  // Build a duplicate scene with wireframe materials, layered on top.
  const wireScene = useMemo(() => {
    try {
      return SkeletonUtils.clone(gltf.scene);
    } catch (e) {
      console.error("Failed to clone wireframe scene:", e);
      return null;
    }
  }, [gltf]);

  // Compute the bounding box of the original scene so we can scale + center.
  const { scale, offset } = useMemo(() => {
    try {
      const box = new THREE.Box3();
      gltf.scene.updateMatrixWorld(true);
      box.setFromObject(gltf.scene);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const height = size.y || 1;
      const s = targetHeight / height;
      const offsetY = floorY - box.min.y * s;
      const offsetX = -center.x * s;
      const offsetZ = -center.z * s;
      console.log("Body mesh scaling:", { height, scale: s, size: size.toArray() });
      return {
        scale: s,
        offset: new THREE.Vector3(offsetX, offsetY, offsetZ),
      };
    } catch (e) {
      console.error("Failed to compute bounding box:", e);
      return { scale: 1, offset: new THREE.Vector3(0, 0, 0) };
    }
  }, [gltf, targetHeight, floorY]);

  // Swap materials on every mesh — skin pass for the main scene, wireframe pass for the overlay.
  useEffect(() => {
    if (!scene || !wireScene) return;
    try {
      const skinUniforms = skinUniformsRef.current;
      const wireUniforms = wireUniformsRef.current;

      let meshCount = 0;
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        meshCount++;
        const oldMat = mesh.material;
        const skinMat = new THREE.ShaderMaterial({
          vertexShader: SKIN_VERT,
          fragmentShader: SKIN_FRAG,
          uniforms: skinUniforms,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
          blending: THREE.NormalBlending,
          side: THREE.FrontSide,
        });
        mesh.material = skinMat;
        mesh.renderOrder = 1;
        if (Array.isArray(oldMat)) oldMat.forEach((m) => m.dispose());
        else if (oldMat) oldMat.dispose();
      });
      console.log("Skin materials applied to", meshCount, "meshes");

      wireScene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const oldMat = mesh.material;
        const wireMat = new THREE.ShaderMaterial({
          vertexShader: WIRE_VERT,
          fragmentShader: WIRE_FRAG,
          uniforms: wireUniforms,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
          blending: THREE.AdditiveBlending,
          wireframe: true,
          side: THREE.FrontSide,
        });
        mesh.material = wireMat;
        mesh.renderOrder = 2;
        if (Array.isArray(oldMat)) oldMat.forEach((m) => m.dispose());
        else if (oldMat) oldMat.dispose();
      });
      console.log("Wireframe materials applied");
    } catch (e) {
      console.error("Failed to apply materials:", e);
    }
  }, [scene, wireScene]);

  useEffect(() => {
    skinUniformsRef.current.uColor.value.set(color);
    wireUniformsRef.current.uColor.value.set(color);
  }, [color]);

  useFrame((state) => {
    skinUniformsRef.current.uTime.value = state.clock.getElapsedTime();
  });

  if (!scene || !wireScene) {
    console.warn("Body mesh scenes not loaded yet");
    return null;
  }

  return (
    <group position={offset} scale={scale}>
      <primitive object={scene} />
      <primitive object={wireScene} />
    </group>
  );
}
