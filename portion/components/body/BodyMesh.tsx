"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Holographic body — translucent fresnel shell + cyan wireframe overlay.
 *
 * The source GLB (Mixamo X-Bot) is a SkinnedMesh in T-pose. We:
 *   1) Pose the arm bones DOWN so the figure stands naturally at attention.
 *   2) Skin each vertex of the bind-pose geometry through the posed skeleton.
 *   3) Build a static non-skinned Mesh from those world-space positions.
 *
 * This avoids needing a skinning-aware shader and gives us arms-at-sides.
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

// Much dimmer than before — rim-only, almost invisible head-on.
const SKIN_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3  uColor;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  void main() {
    float NdotV = clamp(dot(normalize(vViewNormal), normalize(vViewDir)), 0.0, 1.0);
    float fresnel = pow(1.0 - NdotV, 2.4);
    float band = smoothstep(0.04, 0.0, abs(fract(uTime * 0.18) * 2.2 - vWorldPos.y));
    vec3 col = uColor * (0.04 + fresnel * 0.55 + band * 0.18);
    float alpha = clamp(fresnel * 0.35 + 0.03 + band * 0.12, 0.0, 0.55);
    gl_FragColor = vec4(col, alpha);
  }
`;

/** Rotate a named bone by Euler angles (radians). No-op if bone missing. */
function poseBone(
  skeleton: THREE.Skeleton,
  needle: string,
  euler: { x?: number; y?: number; z?: number },
) {
  const bone = skeleton.bones.find((b) =>
    b.name.toLowerCase().includes(needle.toLowerCase()),
  );
  if (!bone) {
    console.warn("Bone not found:", needle);
    return;
  }
  if (euler.x != null) bone.rotation.x = euler.x;
  if (euler.y != null) bone.rotation.y = euler.y;
  if (euler.z != null) bone.rotation.z = euler.z;
}

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

  const { group, scale, offset } = useMemo(() => {
    if (!gltf?.scene) {
      return { group: null, scale: 1, offset: new THREE.Vector3() };
    }

    gltf.scene.updateMatrixWorld(true);

    // ---- Pose the skeleton: arms down, slight forward droop ----
    // Mixamo bones go LeftArm → LeftForeArm → LeftHand. In T-pose, LeftArm
    // extends along +X. Rotating it around Z brings the arm down.
    let posedSkeleton: THREE.Skeleton | null = null;
    gltf.scene.traverse((obj) => {
      const sm = obj as THREE.SkinnedMesh;
      if (sm.isSkinnedMesh && sm.skeleton && !posedSkeleton) {
        posedSkeleton = sm.skeleton;
        const names = sm.skeleton.bones.map((b) => b.name);
        console.log("Skeleton bones:", names);
      }
    });

    if (posedSkeleton) {
      // The amount and axis depend on the skeleton's coordinate convention.
      // Mixamo: rotating Z by -PI/2 on LeftArm brings it from T-pose to down.
      poseBone(posedSkeleton, "LeftArm", { z: -Math.PI / 2 + 0.18 });
      poseBone(posedSkeleton, "RightArm", { z: Math.PI / 2 - 0.18 });
      // Small bend at elbow for a relaxed pose.
      poseBone(posedSkeleton, "LeftForeArm", { y: 0.15 });
      poseBone(posedSkeleton, "RightForeArm", { y: -0.15 });
      // Refresh world matrices through the chain.
      (posedSkeleton as THREE.Skeleton).bones.forEach((b) =>
        b.updateMatrixWorld(true),
      );
      (posedSkeleton as THREE.Skeleton).update();
    }

    // ---- Bake each SkinnedMesh into a static skinned-position geometry ----
    const skinMat = new THREE.ShaderMaterial({
      vertexShader: SKIN_VERT,
      fragmentShader: SKIN_FRAG,
      uniforms: skinUniformsRef.current,
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
      opacity: 0.32, // way dimmer than before
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const out = new THREE.Group();
    let meshCount = 0;
    const tempVec = new THREE.Vector3();

    gltf.scene.traverse((obj) => {
      const skinned = obj as THREE.SkinnedMesh;
      const plain = obj as THREE.Mesh;
      const isSkinned = !!skinned.isSkinnedMesh;
      if (!plain.isMesh && !isSkinned) return;

      let geom: THREE.BufferGeometry;
      if (isSkinned) {
        // Bake every vertex through the posed skeleton.
        skinned.updateMatrixWorld(true);
        const src = skinned.geometry as THREE.BufferGeometry;
        const baked = src.clone();
        const positionAttr = baked.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < positionAttr.count; i++) {
          tempVec.fromBufferAttribute(positionAttr, i);
          skinned.applyBoneTransform(i, tempVec);
          // applyBoneTransform returns the result in mesh-local space.
          positionAttr.setXYZ(i, tempVec.x, tempVec.y, tempVec.z);
        }
        positionAttr.needsUpdate = true;
        baked.computeVertexNormals();
        baked.applyMatrix4(skinned.matrixWorld);
        geom = baked;
      } else {
        geom = (plain.geometry as THREE.BufferGeometry).clone();
        geom.applyMatrix4(plain.matrixWorld);
      }
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
