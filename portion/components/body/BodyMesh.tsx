"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  MUSCLE_GROUPS,
  type MuscleGroup,
  type MuscleState,
  tirednessColor,
} from "@/lib/body/muscle-state";

/**
 * Holographic wireframe body that's color-coded per muscle region.
 *
 * Pipeline:
 *   1) Pose the X-Bot skeleton (arms down) and bake skinned vertices into a
 *      static, non-skinned BufferGeometry so we can use plain shaders.
 *   2) For every vertex, classify which muscle group it belongs to by its
 *      normalized body coordinates (e.g. y∈[0..1] feet→head).
 *   3) Build a vertex color attribute. When muscleStates change, recolor each
 *      vertex by its group's recovery color (green=rested → red=just trained).
 *   4) Render the geometry twice: once as a thin fresnel skin shell, once as
 *      wireframe — both use the SAME vertex colors so the muscle regions are
 *      visible as colored wireframe zones in the manikin itself (no floating
 *      plates).
 *
 * Hover/select gets passed in and is boosted on top of the base recovery color
 * so the active muscle pops without being a separate floating object.
 */

type Props = {
  targetHeight?: number;
  floorY?: number;
  baseColor?: string;
  muscleStates: Record<MuscleGroup, MuscleState>;
  hoveredGroup?: MuscleGroup | null;
  selectedGroup?: MuscleGroup | null;
};

useGLTF.preload("/models/body.glb");

const NEUTRAL = -1;
const GROUP_INDEX: Record<MuscleGroup, number> = MUSCLE_GROUPS.reduce(
  (acc, g, i) => {
    acc[g] = i;
    return acc;
  },
  {} as Record<MuscleGroup, number>,
);

/**
 * Classify a vertex by its position relative to the body's bounding box.
 * Inputs are NORMALIZED:
 *   nx ∈ [-1, +1]  body half-widths, +x = left side of body
 *   ny ∈ [ 0, +1]  feet → top of head
 *   nz ∈ [-1, +1]  back → front
 * Returns a muscle group index, or NEUTRAL for head/hands/feet (stays cyan).
 */
function classifyVertex(nx: number, ny: number, nz: number): number {
  // Head and upper neck
  if (ny > 0.86) return NEUTRAL;
  // Feet
  if (ny < 0.04) return NEUTRAL;
  // Hands (low + far from body center)
  if (ny < 0.52 && Math.abs(nx) > 0.55) return NEUTRAL;

  const ax = Math.abs(nx);

  // ARMS — at the sides, so any vertex with large |x| in arm range is arm
  if (ax > 0.42) {
    if (ny > 0.78) return GROUP_INDEX.shoulders;
    if (ny > 0.62) return nz >= 0 ? GROUP_INDEX.biceps : GROUP_INDEX.triceps;
    return GROUP_INDEX.forearms;
  }

  // TORSO
  if (ny > 0.74) {
    // Upper chest / upper back
    return nz >= 0 ? GROUP_INDEX.chest : GROUP_INDEX.back;
  }
  if (ny > 0.56) {
    // Abs / mid back
    return nz >= 0 ? GROUP_INDEX.abs : GROUP_INDEX.back;
  }

  // HIPS / GLUTES band
  if (ny > 0.48) {
    if (nz < -0.05) return GROUP_INDEX.glutes;
    return NEUTRAL;
  }

  // LEGS
  if (ny > 0.22) {
    return nz >= 0 ? GROUP_INDEX.quads : GROUP_INDEX.hamstrings;
  }
  if (ny > 0.04) {
    return GROUP_INDEX.calves;
  }

  return NEUTRAL;
}

function poseBone(
  skeleton: THREE.Skeleton,
  needle: string,
  euler: { x?: number; y?: number; z?: number },
) {
  const bone = skeleton.bones.find((b) =>
    b.name.toLowerCase().includes(needle.toLowerCase()),
  );
  if (!bone) return;
  if (euler.x != null) bone.rotation.x = euler.x;
  if (euler.y != null) bone.rotation.y = euler.y;
  if (euler.z != null) bone.rotation.z = euler.z;
}

const SKIN_VERT = /* glsl */ `
  varying vec3 vColor;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  void main() {
    vColor = color;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec4 viewPos = viewMatrix * worldPos;
    vViewNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-viewPos.xyz);
    gl_Position = projectionMatrix * viewPos;
  }
`;

const SKIN_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  void main() {
    float NdotV = clamp(dot(normalize(vViewNormal), normalize(vViewDir)), 0.0, 1.0);
    float fresnel = pow(1.0 - NdotV, 2.6);
    vec3 col = vColor * (0.02 + fresnel * 0.35);
    float alpha = clamp(fresnel * 0.25 + 0.02, 0.0, 0.4);
    gl_FragColor = vec4(col, alpha);
  }
`;

export function BodyMesh({
  targetHeight = 1.88,
  floorY = 0,
  baseColor = "#5be3ff",
  muscleStates,
  hoveredGroup = null,
  selectedGroup = null,
}: Props) {
  const gltf = useGLTF("/models/body.glb");

  // ---------- Build static group + classify vertices (runs once per GLB) ----------
  const { group, perMesh, scale, offset } = useMemo(() => {
    if (!gltf?.scene) {
      return {
        group: null as THREE.Group | null,
        perMesh: [] as Array<{
          indices: Int8Array;
          colorAttr: THREE.BufferAttribute;
        }>,
        scale: 1,
        offset: new THREE.Vector3(),
      };
    }

    gltf.scene.updateMatrixWorld(true);

    // Pose bones: arms down
    let posedSkeleton: THREE.Skeleton | null = null;
    gltf.scene.traverse((obj) => {
      const sm = obj as THREE.SkinnedMesh;
      if (sm.isSkinnedMesh && sm.skeleton && !posedSkeleton) {
        posedSkeleton = sm.skeleton;
      }
    });
    if (posedSkeleton) {
      poseBone(posedSkeleton, "LeftArm", { z: -Math.PI / 2 + 0.16 });
      poseBone(posedSkeleton, "RightArm", { z: Math.PI / 2 - 0.16 });
      poseBone(posedSkeleton, "LeftForeArm", { y: 0.12 });
      poseBone(posedSkeleton, "RightForeArm", { y: -0.12 });
      (posedSkeleton as THREE.Skeleton).bones.forEach((b) =>
        b.updateMatrixWorld(true),
      );
      (posedSkeleton as THREE.Skeleton).update();
    }

    // Bake skinned vertices → static geometries
    const out = new THREE.Group();
    const tempVec = new THREE.Vector3();
    const baked: THREE.BufferGeometry[] = [];

    gltf.scene.traverse((obj) => {
      const skinned = obj as THREE.SkinnedMesh;
      const plain = obj as THREE.Mesh;
      const isSkinned = !!skinned.isSkinnedMesh;
      if (!plain.isMesh && !isSkinned) return;

      let geom: THREE.BufferGeometry;
      if (isSkinned) {
        skinned.updateMatrixWorld(true);
        const src = skinned.geometry as THREE.BufferGeometry;
        const g = src.clone();
        const posAttr = g.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < posAttr.count; i++) {
          tempVec.fromBufferAttribute(posAttr, i);
          skinned.applyBoneTransform(i, tempVec);
          posAttr.setXYZ(i, tempVec.x, tempVec.y, tempVec.z);
        }
        posAttr.needsUpdate = true;
        g.computeVertexNormals();
        g.applyMatrix4(skinned.matrixWorld);
        geom = g;
      } else {
        geom = (plain.geometry as THREE.BufferGeometry).clone();
        geom.applyMatrix4(plain.matrixWorld);
      }
      geom.computeBoundingBox();
      baked.push(geom);
    });

    // Single combined bbox in baked space
    const totalBox = new THREE.Box3();
    for (const g of baked) {
      if (g.boundingBox) totalBox.union(g.boundingBox);
    }
    const size = new THREE.Vector3();
    totalBox.getSize(size);
    const center = new THREE.Vector3();
    totalBox.getCenter(center);
    const halfX = (size.x / 2) || 1;
    const halfZ = (size.z / 2) || 1;
    const yMin = totalBox.min.y;
    const ySize = size.y || 1;

    // Build per-mesh: classification indices + initial cyan vertex colors
    const cyan = new THREE.Color(baseColor);
    const perMesh: Array<{
      indices: Int8Array;
      colorAttr: THREE.BufferAttribute;
    }> = [];

    for (const geom of baked) {
      const posAttr = geom.getAttribute("position") as THREE.BufferAttribute;
      const count = posAttr.count;
      const indices = new Int8Array(count);
      const colors = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = posAttr.getZ(i);
        const nx = (x - center.x) / halfX;
        const ny = (y - yMin) / ySize;
        const nz = (z - center.z) / halfZ;
        indices[i] = classifyVertex(nx, ny, nz);
        colors[i * 3 + 0] = cyan.r;
        colors[i * 3 + 1] = cyan.g;
        colors[i * 3 + 2] = cyan.b;
      }

      const colorAttr = new THREE.BufferAttribute(colors, 3);
      geom.setAttribute("color", colorAttr);

      const skinMat = new THREE.ShaderMaterial({
        vertexShader: SKIN_VERT,
        fragmentShader: SKIN_FRAG,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const wireMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.NormalBlending,
        side: THREE.FrontSide,
      });

      const skinMesh = new THREE.Mesh(geom, skinMat);
      skinMesh.renderOrder = 0;
      skinMesh.frustumCulled = false;
      out.add(skinMesh);

      const wireMesh = new THREE.Mesh(geom, wireMat);
      wireMesh.renderOrder = 1;
      wireMesh.frustumCulled = false;
      out.add(wireMesh);

      perMesh.push({ indices, colorAttr });
    }

    const s = targetHeight / ySize;
    return {
      group: out,
      perMesh,
      scale: s,
      offset: new THREE.Vector3(-center.x * s, floorY - yMin * s, -center.z * s),
    };
  }, [gltf, targetHeight, floorY, baseColor]);

  // ---------- Recolor vertices when state / hover / select changes ----------
  useEffect(() => {
    if (!perMesh.length) return;

    const groupColors = MUSCLE_GROUPS.map(
      (g) => new THREE.Color(tirednessColor(muscleStates[g]?.hoursSince ?? null)),
    );
    const neutralColor = new THREE.Color(baseColor);
    const hoverIdx = hoveredGroup ? GROUP_INDEX[hoveredGroup] : -2;
    const selectIdx = selectedGroup ? GROUP_INDEX[selectedGroup] : -2;
    const boost = new THREE.Color();

    for (const { indices, colorAttr } of perMesh) {
      const colors = colorAttr.array as Float32Array;
      for (let i = 0; i < indices.length; i++) {
        const g = indices[i];
        let col: THREE.Color;
        if (g === NEUTRAL) {
          col = neutralColor;
        } else {
          col = groupColors[g];
          if (g === selectIdx) {
            boost.copy(col).lerp(new THREE.Color("#ffffff"), 0.45);
            col = boost;
          } else if (g === hoverIdx) {
            boost.copy(col).multiplyScalar(1.55);
            col = boost;
          }
        }
        colors[i * 3 + 0] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
      }
      colorAttr.needsUpdate = true;
    }
  }, [perMesh, muscleStates, hoveredGroup, selectedGroup, baseColor]);

  // gentle breathing already handled by parent
  useFrame(() => {});

  if (!group) return null;

  return (
    <group position={offset} scale={scale}>
      <primitive object={group} />
    </group>
  );
}
