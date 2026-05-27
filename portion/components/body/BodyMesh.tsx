"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

/**
 * Loads /models/body.glb (Mixamo X-Bot in T-pose), fits it to a target height,
 * and renders it as the holographic body-scan look from the reference:
 *   - Faint translucent skin shell (fresnel rim only)
 *   - Bright cyan wireframe overlay (every triangle edge of the mesh)
 *   - Subtle horizontal scan band drifting up the body
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
    float fresnel = pow(1.0 - NdotV, 2.2);

    // Soft body fill — almost invisible head-on, glows at silhouette.
    vec3 col = uColor * (0.08 + fresnel * 1.4);

    // Drifting horizontal scan band.
    float band = smoothstep(0.05, 0.0, abs(fract(uTime * 0.18) * 2.2 - vWorldPos.y));
    col += uColor * band * 0.6;

    float alpha = clamp(fresnel * 0.55 + 0.06 + band * 0.35, 0.0, 0.85);
    gl_FragColor = vec4(col, alpha);
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
    float fresnel = pow(1.0 - NdotV, 1.5);
    float intensity = 0.7 + fresnel * 1.4;
    gl_FragColor = vec4(uColor * intensity, 1.0);
  }
`;

type Props = {
  targetHeight?: number;
  floorY?: number;
  color?: string;
};

useGLTF.preload("/models/body.glb");

export function BodyMesh({
  targetHeight = 1.88,
  floorY = 0,
  color = "#5be3ff",
}: Props) {
  const skinUniformsRef = useRef<{
    uTime: { value: number };
    uColor: { value: THREE.Color };
  }>({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) },
  });
  const wireUniformsRef = useRef<{ uColor: { value: THREE.Color } }>({
    uColor: { value: new THREE.Color(color) },
  });

  const gltf = useGLTF("/models/body.glb");

  const scene = useMemo(() => {
    if (!gltf?.scene) return null;
    try {
      return SkeletonUtils.clone(gltf.scene);
    } catch (e) {
      console.error("BodyMesh skin clone failed:", e);
      return null;
    }
  }, [gltf]);

  const wireScene = useMemo(() => {
    if (!gltf?.scene) return null;
    try {
      return SkeletonUtils.clone(gltf.scene);
    } catch (e) {
      console.error("BodyMesh wire clone failed:", e);
      return null;
    }
  }, [gltf]);

  const { scale, offset } = useMemo(() => {
    if (!gltf?.scene) return { scale: 1, offset: new THREE.Vector3() };
    const box = new THREE.Box3();
    gltf.scene.updateMatrixWorld(true);
    box.setFromObject(gltf.scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const s = targetHeight / (size.y || 1);
    return {
      scale: s,
      offset: new THREE.Vector3(-center.x * s, floorY - box.min.y * s, -center.z * s),
    };
  }, [gltf, targetHeight, floorY]);

  useEffect(() => {
    if (!scene || !wireScene) return;
    const skinUniforms = skinUniformsRef.current;
    const wireUniforms = wireUniformsRef.current;

    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const oldMat = mesh.material;
      mesh.material = new THREE.ShaderMaterial({
        vertexShader: SKIN_VERT,
        fragmentShader: SKIN_FRAG,
        uniforms: skinUniforms,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
      });
      mesh.renderOrder = 0;
      if (Array.isArray(oldMat)) oldMat.forEach((m) => m.dispose());
      else if (oldMat) oldMat.dispose();
    });

    wireScene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const oldMat = mesh.material;
      mesh.material = new THREE.ShaderMaterial({
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
      mesh.renderOrder = 1;
      if (Array.isArray(oldMat)) oldMat.forEach((m) => m.dispose());
      else if (oldMat) oldMat.dispose();
    });
  }, [scene, wireScene]);

  useEffect(() => {
    skinUniformsRef.current.uColor.value.set(color);
    wireUniformsRef.current.uColor.value.set(color);
  }, [color]);

  useFrame((state) => {
    skinUniformsRef.current.uTime.value = state.clock.getElapsedTime();
  });

  if (!scene || !wireScene) return null;

  return (
    <group position={offset} scale={scale}>
      <primitive object={scene} />
      <primitive object={wireScene} />
    </group>
  );
}
