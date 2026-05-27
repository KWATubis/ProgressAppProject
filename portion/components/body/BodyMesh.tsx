"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Holographic body: translucent fresnel skin (additive) + bright wireframe overlay.
 *
 * Implementation note: the source GLB (Mixamo X-Bot) uses SkinnedMesh, but our
 * custom shaders don't include skinning transforms — so we BAKE the bind-pose
 * geometry into plain non-skinned Meshes. That avoids the collapsed-to-origin
 * vertex problem you get when applying a non-skinning shader to a SkinnedMesh.
 */

type Props = {
  targetHeight?: number;
  floorY?: number;
  color?: string;
};

useGLTF.preload("/models/body.glb");

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
    float fresnel = pow(1.0 - NdotV, 1.6);
    // Drifting horizontal scan band.
    float band = smoothstep(0.06, 0.0, abs(fract(uTime * 0.18) * 2.2 - vWorldPos.y));
    vec3 col = uColor * (0.35 + fresnel * 1.8 + band * 0.7);
    float alpha = clamp(fresnel * 0.7 + 0.18 + band * 0.4, 0.0, 0.92);
    gl_FragColor = vec4(col, alpha);
  }
`;

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

  const gltf = useGLTF("/models/body.glb");

  /**
   * Walk the GLB, pull every SkinnedMesh / Mesh, and rebuild a clean Group
   * containing two plain Mesh instances per source mesh:
   *   1) skin material  (fresnel additive shell)
   *   2) wire material  (cyan wireframe)
   * Both share the SAME geometry, baked into world-space at load time.
   */
  const { group, scale, offset } = useMemo(() => {
    if (!gltf?.scene) {
      return { group: null, scale: 1, offset: new THREE.Vector3() };
    }

    gltf.scene.updateMatrixWorld(true);

    const skinUniforms = skinUniformsRef.current;
    const skinMat = new THREE.ShaderMaterial({
      vertexShader: SKIN_VERT,
      fragmentShader: SKIN_FRAG,
      uniforms: skinUniforms,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const wireMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      wireframe: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const out = new THREE.Group();
    let meshCount = 0;

    gltf.scene.traverse((obj) => {
      const src = obj as THREE.Mesh | THREE.SkinnedMesh;
      if (!(src as THREE.Mesh).isMesh && !(src as THREE.SkinnedMesh).isSkinnedMesh) {
        return;
      }
      const geom = (src.geometry as THREE.BufferGeometry).clone();
      // Bake the source mesh's world transform into the geometry so we don't
      // depend on a bone hierarchy. Result is a static bind-pose mesh.
      const worldMatrix = src.matrixWorld.clone();
      geom.applyMatrix4(worldMatrix);
      geom.computeBoundingBox();
      geom.computeBoundingSphere();

      const skinMesh = new THREE.Mesh(geom, skinMat);
      skinMesh.renderOrder = 0;
      skinMesh.frustumCulled = false;
      out.add(skinMesh);

      const wireMesh = new THREE.Mesh(geom, wireMat);
      wireMesh.renderOrder = 1;
      wireMesh.frustumCulled = false;
      out.add(wireMesh);

      meshCount++;
    });

    // Now measure the rebuilt group and compute scale/offset to hit targetHeight.
    out.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(out);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const s = targetHeight / (size.y || 1);

    console.log("BodyMesh: baked", meshCount, "meshes, height=", size.y, "scale=", s);

    return {
      group: out,
      scale: s,
      offset: new THREE.Vector3(-center.x * s, floorY - box.min.y * s, -center.z * s),
    };
  }, [gltf, targetHeight, floorY, color]);

  useEffect(() => {
    skinUniformsRef.current.uColor.value.set(color);
  }, [color]);

  useFrame((state) => {
    skinUniformsRef.current.uTime.value = state.clock.getElapsedTime();
  });

  if (!group) return null;

  return (
    <group position={offset} scale={scale}>
      <primitive object={group} />
    </group>
  );
}
