"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  MUSCLE_GROUPS,
  type MuscleGroup,
  type MuscleState,
  tirednessColor,
} from "@/lib/body/muscle-state";

/**
 * Holographic wireframe body — per-muscle color, contour lines only.
 *
 * Pipeline:
 *   1) Pose the X-Bot skeleton (arms down) + bake the skinned vertices into a
 *      static, non-skinned BufferGeometry.
 *   2) Distort the vertices for a more masculine silhouette — widen shoulders,
 *      narrow the waist a touch.
 *   3) For each FACE-mesh, derive an EdgesGeometry (LineSegments). This keeps
 *      only contour/silhouette lines and drops the dense triangulation, which
 *      is the look in the reference scan.
 *   4) Classify every vertex of the edge lines by muscle group → vertex colors.
 *      A faint fresnel shell underneath fills in the body softly.
 *   5) On muscleStates/hover/select change, repaint vertex colors so the whole
 *      body reads green when rested, regions shift red when freshly trained.
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

function classifyVertex(nx: number, ny: number, nz: number): number {
  if (ny > 0.86) return NEUTRAL; // head + neck
  if (ny < 0.04) return NEUTRAL; // feet
  if (ny < 0.52 && Math.abs(nx) > 0.55) return NEUTRAL; // hands

  const ax = Math.abs(nx);

  if (ax > 0.42) {
    if (ny > 0.78) return GROUP_INDEX.shoulders;
    if (ny > 0.62) return nz >= 0 ? GROUP_INDEX.biceps : GROUP_INDEX.triceps;
    return GROUP_INDEX.forearms;
  }

  if (ny > 0.74) return nz >= 0 ? GROUP_INDEX.chest : GROUP_INDEX.back;
  if (ny > 0.56) return nz >= 0 ? GROUP_INDEX.abs : GROUP_INDEX.back;

  if (ny > 0.48) {
    if (nz < -0.05) return GROUP_INDEX.glutes;
    return NEUTRAL;
  }

  if (ny > 0.22) return nz >= 0 ? GROUP_INDEX.quads : GROUP_INDEX.hamstrings;
  if (ny > 0.04) return GROUP_INDEX.calves;
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

/**
 * Reshape vertices for a more masculine V-taper. Operates AFTER bones are
 * baked — moves torso-only vertices (small |x|) so arms hanging at the sides
 * are left alone.
 */
function masculinize(
  geom: THREE.BufferGeometry,
  yMin: number,
  yMax: number,
  centerX: number,
  halfX: number,
) {
  const pos = geom.getAttribute("position") as THREE.BufferAttribute;
  const ySize = yMax - yMin || 1;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = (y - yMin) / ySize;
    const dx = x - centerX;
    const torsoness = Math.max(0, 1 - Math.abs(dx) / (halfX * 0.45));

    // Shoulder widening (smooth bell at upper torso)
    const shoulderProfile = Math.exp(-Math.pow((ny - 0.82) / 0.06, 2));
    const xWiden = 1 + 0.32 * shoulderProfile * torsoness;

    // Waist narrowing (small dip around the natural waist)
    const waistProfile = Math.exp(-Math.pow((ny - 0.58) / 0.05, 2));
    const xNarrow = 1 - 0.07 * waistProfile * torsoness;

    // Chest depth — push +z slightly forward on the front, -z on the back
    const chestProfile = Math.exp(-Math.pow((ny - 0.76) / 0.08, 2));
    const zScale = 1 + 0.18 * chestProfile * torsoness;

    // Bulk upper-arm region a touch
    const isArm = Math.abs(dx) > halfX * 0.5;
    const upperArm = isArm
      ? Math.exp(-Math.pow((ny - 0.7) / 0.08, 2)) * 0.08
      : 0;
    const armBulk = 1 + upperArm;

    const newX = centerX + dx * xWiden * xNarrow * armBulk;
    const newZ = z * zScale;
    pos.setXYZ(i, newX, y, newZ);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  geom.computeBoundingBox();
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
    vec3 col = vColor * (0.05 + fresnel * 0.6);
    float alpha = clamp(fresnel * 0.35 + 0.05, 0.0, 0.5);
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

  const { group, perMesh, scale, offset } = useMemo(() => {
    if (!gltf?.scene) {
      return {
        group: null as THREE.Group | null,
        perMesh: [] as Array<{
          skinIndices: Int8Array;
          skinColor: THREE.BufferAttribute;
          edgeIndices: Int8Array;
          edgeColor: THREE.BufferAttribute;
        }>,
        scale: 1,
        offset: new THREE.Vector3(),
      };
    }

    gltf.scene.updateMatrixWorld(true);

    // ---- Pose: arms down ----
    let skeleton: THREE.Skeleton | null = null;
    gltf.scene.traverse((obj) => {
      const sm = obj as THREE.SkinnedMesh;
      if (sm.isSkinnedMesh && sm.skeleton && !skeleton) skeleton = sm.skeleton;
    });
    if (skeleton) {
      poseBone(skeleton, "LeftArm", { z: -Math.PI / 2 + 0.16 });
      poseBone(skeleton, "RightArm", { z: Math.PI / 2 - 0.16 });
      poseBone(skeleton, "LeftForeArm", { y: 0.12 });
      poseBone(skeleton, "RightForeArm", { y: -0.12 });
      (skeleton as THREE.Skeleton).bones.forEach((b) => b.updateMatrixWorld(true));
      (skeleton as THREE.Skeleton).update();
    }

    // ---- Bake skinning ----
    const baked: THREE.BufferGeometry[] = [];
    const tempVec = new THREE.Vector3();
    gltf.scene.traverse((obj) => {
      const skinned = obj as THREE.SkinnedMesh;
      const plain = obj as THREE.Mesh;
      const isSkinned = !!skinned.isSkinnedMesh;
      if (!plain.isMesh && !isSkinned) return;
      let g: THREE.BufferGeometry;
      if (isSkinned) {
        skinned.updateMatrixWorld(true);
        const src = skinned.geometry as THREE.BufferGeometry;
        const b = src.clone();
        const posAttr = b.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < posAttr.count; i++) {
          tempVec.fromBufferAttribute(posAttr, i);
          skinned.applyBoneTransform(i, tempVec);
          posAttr.setXYZ(i, tempVec.x, tempVec.y, tempVec.z);
        }
        posAttr.needsUpdate = true;
        b.applyMatrix4(skinned.matrixWorld);
        g = b;
      } else {
        g = (plain.geometry as THREE.BufferGeometry).clone();
        g.applyMatrix4(plain.matrixWorld);
      }
      g.computeBoundingBox();
      baked.push(g);
    });

    // ---- Measure baked body for masculine pass ----
    const measureBox = new THREE.Box3();
    for (const g of baked) if (g.boundingBox) measureBox.union(g.boundingBox);
    const ms = new THREE.Vector3();
    measureBox.getSize(ms);
    const mc = new THREE.Vector3();
    measureBox.getCenter(mc);
    for (const g of baked) {
      masculinize(g, measureBox.min.y, measureBox.max.y, mc.x, ms.x / 2);
    }

    // ---- Re-measure after distortion (shoulders are now wider) ----
    const totalBox = new THREE.Box3();
    for (const g of baked) {
      g.computeBoundingBox();
      if (g.boundingBox) totalBox.union(g.boundingBox);
    }
    const size = new THREE.Vector3();
    totalBox.getSize(size);
    const center = new THREE.Vector3();
    totalBox.getCenter(center);
    const halfX = size.x / 2 || 1;
    const halfZ = size.z / 2 || 1;
    const yMin = totalBox.min.y;
    const ySize = size.y || 1;

    const out = new THREE.Group();
    const perMesh: Array<{
      skinIndices: Int8Array;
      skinColor: THREE.BufferAttribute;
      edgeIndices: Int8Array;
      edgeColor: THREE.BufferAttribute;
    }> = [];
    const cyan = new THREE.Color(baseColor);

    for (const geom of baked) {
      // --- Skin shell color attribute ---
      const posAttr = geom.getAttribute("position") as THREE.BufferAttribute;
      const skinCount = posAttr.count;
      const skinIndices = new Int8Array(skinCount);
      const skinColors = new Float32Array(skinCount * 3);
      for (let i = 0; i < skinCount; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = posAttr.getZ(i);
        const nx = (x - center.x) / halfX;
        const ny = (y - yMin) / ySize;
        const nz = (z - center.z) / halfZ;
        skinIndices[i] = classifyVertex(nx, ny, nz);
        skinColors[i * 3] = cyan.r;
        skinColors[i * 3 + 1] = cyan.g;
        skinColors[i * 3 + 2] = cyan.b;
      }
      const skinColor = new THREE.BufferAttribute(skinColors, 3);
      geom.setAttribute("color", skinColor);

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
      const skinMesh = new THREE.Mesh(geom, skinMat);
      skinMesh.renderOrder = 0;
      skinMesh.frustumCulled = false;
      out.add(skinMesh);

      // --- Edge lines: only contours, not every triangle ---
      const edgesGeom = new THREE.EdgesGeometry(geom, 22); // 22° threshold
      const edgePos = edgesGeom.getAttribute("position") as THREE.BufferAttribute;
      const edgeCount = edgePos.count;
      const edgeIndices = new Int8Array(edgeCount);
      const edgeColors = new Float32Array(edgeCount * 3);
      for (let i = 0; i < edgeCount; i++) {
        const x = edgePos.getX(i);
        const y = edgePos.getY(i);
        const z = edgePos.getZ(i);
        const nx = (x - center.x) / halfX;
        const ny = (y - yMin) / ySize;
        const nz = (z - center.z) / halfZ;
        edgeIndices[i] = classifyVertex(nx, ny, nz);
        edgeColors[i * 3] = cyan.r;
        edgeColors[i * 3 + 1] = cyan.g;
        edgeColors[i * 3 + 2] = cyan.b;
      }
      const edgeColor = new THREE.BufferAttribute(edgeColors, 3);
      edgesGeom.setAttribute("color", edgeColor);

      const lineMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.NormalBlending,
      });
      const lines = new THREE.LineSegments(edgesGeom, lineMat);
      lines.renderOrder = 2;
      lines.frustumCulled = false;
      out.add(lines);

      perMesh.push({ skinIndices, skinColor, edgeIndices, edgeColor });
    }

    const s = targetHeight / ySize;
    return {
      group: out,
      perMesh,
      scale: s,
      offset: new THREE.Vector3(-center.x * s, floorY - yMin * s, -center.z * s),
    };
  }, [gltf, targetHeight, floorY, baseColor]);

  // ---- Repaint vertex colors when state / hover / select changes ----
  useEffect(() => {
    if (!perMesh.length) return;
    const groupColors = MUSCLE_GROUPS.map(
      (g) => new THREE.Color(tirednessColor(muscleStates[g]?.hoursSince ?? null)),
    );
    const neutralColor = new THREE.Color(baseColor);
    const hoverIdx = hoveredGroup ? GROUP_INDEX[hoveredGroup] : -2;
    const selectIdx = selectedGroup ? GROUP_INDEX[selectedGroup] : -2;
    const tmp = new THREE.Color();
    const white = new THREE.Color("#ffffff");

    const apply = (
      indices: Int8Array,
      attr: THREE.BufferAttribute,
    ) => {
      const colors = attr.array as Float32Array;
      for (let i = 0; i < indices.length; i++) {
        const g = indices[i];
        let r: number, gg: number, b: number;
        if (g === NEUTRAL) {
          r = neutralColor.r;
          gg = neutralColor.g;
          b = neutralColor.b;
        } else {
          tmp.copy(groupColors[g]);
          if (g === selectIdx) tmp.lerp(white, 0.45);
          else if (g === hoverIdx) tmp.multiplyScalar(1.55);
          r = tmp.r;
          gg = tmp.g;
          b = tmp.b;
        }
        colors[i * 3] = r;
        colors[i * 3 + 1] = gg;
        colors[i * 3 + 2] = b;
      }
      attr.needsUpdate = true;
    };

    for (const m of perMesh) {
      apply(m.skinIndices, m.skinColor);
      apply(m.edgeIndices, m.edgeColor);
    }
  }, [perMesh, muscleStates, hoveredGroup, selectedGroup, baseColor]);

  if (!group) return null;

  return (
    <group position={offset} scale={scale}>
      <primitive object={group} />
    </group>
  );
}
