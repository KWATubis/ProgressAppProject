"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { MuscleGroup, MuscleState } from "@/lib/body/muscle-state";

/**
 * Holographic wireframe body. Muscle definition is painted into the fragment
 * shader as analytical SDF rings (one ellipse per muscle group), evaluated
 * against the baked local position. The lines conform to the body surface
 * because they're computed per-fragment — no floating geometry.
 *
 * The full-skin wireframe + a sharper silhouette/crease pass ride on top to
 * give the dense topology look from the reference scan.
 */

type Props = {
  targetHeight?: number;
  floorY?: number;
  baseColor?: string;
  /** Kept for backwards-compat with the explorer wiring — unused for now. */
  muscleStates?: Record<MuscleGroup, MuscleState>;
  hoveredGroup?: MuscleGroup | null;
  selectedGroup?: MuscleGroup | null;
};

useGLTF.preload("/models/body.glb");

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

/** Pushes torso vertices for a masculine V-taper. Operates AFTER bones are
 *  baked — leaves arms hanging at the sides alone. */
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

    const shoulderProfile = Math.exp(-Math.pow((ny - 0.82) / 0.06, 2));
    const xWiden = 1 + 0.32 * shoulderProfile * torsoness;

    const waistProfile = Math.exp(-Math.pow((ny - 0.58) / 0.05, 2));
    const xNarrow = 1 - 0.07 * waistProfile * torsoness;

    const chestProfile = Math.exp(-Math.pow((ny - 0.76) / 0.08, 2));
    const zScale = 1 + 0.18 * chestProfile * torsoness;

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

// ---------- Shaders ----------

const SKIN_VERT = /* glsl */ `
  varying vec3 vModelPos;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  void main() {
    vModelPos = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec4 viewPos = viewMatrix * worldPos;
    vViewNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-viewPos.xyz);
    gl_Position = projectionMatrix * viewPos;
  }
`;

/**
 * Each muscle is an ellipse in (x, y) plane. We compute distance from the
 * fragment's local position to the ellipse boundary; a thin ring around the
 * boundary lights up. Z-masks gate front vs back muscles.
 *
 * Coordinates are in the BAKED X-Bot local space (post-masculinize):
 *   y ≈ 1.43 → mid-chest, y ≈ 0.62 → mid-thigh, y ≈ 0.27 → calf.
 *   x ≈ ±0.085 → pec center, x ≈ ±0.225 → arm centerline.
 *   z > 0 → front, z < 0 → back.
 */
const SKIN_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vModelPos;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  uniform vec3 uBaseColor;
  uniform float uTime;

  float ringE(vec2 p, vec2 c, vec2 r, float thickness) {
    vec2 d = (p - c) / r;
    float dist = abs(length(d) - 1.0);
    return smoothstep(thickness, 0.0, dist);
  }

  float vLine(vec2 p, float cx, vec2 yRange, float thickness) {
    float inside = step(yRange.x, p.y) * step(p.y, yRange.y);
    return inside * smoothstep(thickness, 0.0, abs(p.x - cx));
  }

  float curve(vec2 p, vec2 a, vec2 b, float thickness) {
    vec2 ab = b - a;
    float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
    vec2 proj = a + ab * t;
    return smoothstep(thickness, 0.0, length(p - proj));
  }

  float muscles(vec3 p) {
    float i = 0.0;
    float front = smoothstep(0.0, 0.04, p.z);
    float back = smoothstep(0.0, 0.04, -p.z);

    // ===== UPPER BODY (FRONT) =====
    // Pectorals
    i = max(i, front * ringE(p.xy, vec2(-0.090, 1.435), vec2(0.085, 0.060), 0.006));
    i = max(i, front * ringE(p.xy, vec2( 0.090, 1.435), vec2(0.085, 0.060), 0.006));
    // Sternum line
    i = max(i, front * vLine(p.xy, 0.0, vec2(1.38, 1.49), 0.0035));

    // Six-pack abs (3 rows × 2 columns)
    for (int r = 0; r < 3; r++) {
      float y = 1.34 - float(r) * 0.065;
      i = max(i, front * ringE(p.xy, vec2(-0.040, y), vec2(0.030, 0.028), 0.0040));
      i = max(i, front * ringE(p.xy, vec2( 0.040, y), vec2(0.030, 0.028), 0.0040));
    }
    // Linea alba
    i = max(i, front * vLine(p.xy, 0.0, vec2(1.15, 1.38), 0.0030));

    // Obliques (V-curve flanking the abs)
    i = max(i, front * curve(p.xy, vec2(-0.085, 1.32), vec2(-0.10, 1.15), 0.0045));
    i = max(i, front * curve(p.xy, vec2( 0.085, 1.32), vec2( 0.10, 1.15), 0.0045));

    // ===== SHOULDERS =====
    // Deltoids — front & back both
    i = max(i, ringE(p.xy, vec2(-0.215, 1.515), vec2(0.072, 0.060), 0.0055));
    i = max(i, ringE(p.xy, vec2( 0.215, 1.515), vec2(0.072, 0.060), 0.0055));

    // ===== ARMS =====
    // Biceps (front)
    i = max(i, front * ringE(p.xy, vec2(-0.225, 1.330), vec2(0.044, 0.080), 0.0045));
    i = max(i, front * ringE(p.xy, vec2( 0.225, 1.330), vec2(0.044, 0.080), 0.0045));
    // Triceps (back)
    i = max(i, back  * ringE(p.xy, vec2(-0.225, 1.330), vec2(0.044, 0.082), 0.0045));
    i = max(i, back  * ringE(p.xy, vec2( 0.225, 1.330), vec2(0.044, 0.082), 0.0045));
    // Forearms (visible from both sides)
    i = max(i, ringE(p.xy, vec2(-0.225, 1.070), vec2(0.042, 0.095), 0.0045));
    i = max(i, ringE(p.xy, vec2( 0.225, 1.070), vec2(0.042, 0.095), 0.0045));

    // ===== BACK =====
    // Lats
    i = max(i, back * ringE(p.xy, vec2(-0.105, 1.340), vec2(0.062, 0.128), 0.0050));
    i = max(i, back * ringE(p.xy, vec2( 0.105, 1.340), vec2(0.062, 0.128), 0.0050));
    // Spine line
    i = max(i, back * vLine(p.xy, 0.0, vec2(1.15, 1.55), 0.0030));
    // Glutes
    i = max(i, back * ringE(p.xy, vec2(-0.090, 0.940), vec2(0.078, 0.075), 0.0050));
    i = max(i, back * ringE(p.xy, vec2( 0.090, 0.940), vec2(0.078, 0.075), 0.0050));

    // ===== LEGS =====
    // Quads
    i = max(i, front * ringE(p.xy, vec2(-0.110, 0.620), vec2(0.056, 0.135), 0.0050));
    i = max(i, front * ringE(p.xy, vec2( 0.110, 0.620), vec2(0.056, 0.135), 0.0050));
    // Inner-knee teardrop (vastus medialis)
    i = max(i, front * ringE(p.xy, vec2(-0.080, 0.500), vec2(0.022, 0.045), 0.0035));
    i = max(i, front * ringE(p.xy, vec2( 0.080, 0.500), vec2(0.022, 0.045), 0.0035));
    // Hamstrings
    i = max(i, back * ringE(p.xy, vec2(-0.110, 0.620), vec2(0.056, 0.135), 0.0050));
    i = max(i, back * ringE(p.xy, vec2( 0.110, 0.620), vec2(0.056, 0.135), 0.0050));
    // Calves
    i = max(i, back * ringE(p.xy, vec2(-0.110, 0.275), vec2(0.040, 0.085), 0.0045));
    i = max(i, back * ringE(p.xy, vec2( 0.110, 0.275), vec2(0.040, 0.085), 0.0045));

    return clamp(i, 0.0, 1.0);
  }

  void main() {
    vec3 N = normalize(vViewNormal);
    vec3 V = normalize(vViewDir);
    float NdotV = clamp(dot(N, V), 0.0, 1.0);
    float fresnel = pow(1.0 - NdotV, 1.7);
    float core = pow(NdotV, 1.4) * 0.18;

    float lineI = muscles(vModelPos);

    // Soft vertical scan pulse to keep the hologram alive.
    float scan = 0.5 + 0.5 * sin(vModelPos.y * 55.0 - uTime * 1.1);
    scan = smoothstep(0.86, 1.0, scan) * 0.05;

    vec3 baseCol = uBaseColor * (0.16 + fresnel * 0.95 + core);
    vec3 lineCol = uBaseColor * 3.2 + vec3(0.35, 0.55, 0.70);
    vec3 col = baseCol + lineI * lineCol + scan * uBaseColor;

    float alpha = clamp(fresnel * 0.62 + 0.20 + lineI * 0.45, 0.0, 0.95);
    gl_FragColor = vec4(col, alpha);
  }
`;

export function BodyMesh({
  targetHeight = 1.88,
  floorY = 0,
  baseColor = "#5be3ff",
}: Props) {
  const gltf = useGLTF("/models/body.glb");

  const { group, scale, offset, materials } = useMemo(() => {
    if (!gltf?.scene) {
      return {
        group: null as THREE.Group | null,
        scale: 1,
        offset: new THREE.Vector3(),
        materials: [] as THREE.ShaderMaterial[],
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
      (skeleton as THREE.Skeleton).bones.forEach((b) =>
        b.updateMatrixWorld(true),
      );
      (skeleton as THREE.Skeleton).update();
    }

    // ---- Bake skinning into static geometry ----
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

    // ---- Masculine V-taper distortion ----
    const measureBox = new THREE.Box3();
    for (const g of baked) if (g.boundingBox) measureBox.union(g.boundingBox);
    const ms = new THREE.Vector3();
    measureBox.getSize(ms);
    const mc = new THREE.Vector3();
    measureBox.getCenter(mc);
    for (const g of baked) {
      masculinize(g, measureBox.min.y, measureBox.max.y, mc.x, ms.x / 2);
    }

    // ---- Final bounds for the outer group transform ----
    const totalBox = new THREE.Box3();
    for (const g of baked) {
      g.computeBoundingBox();
      if (g.boundingBox) totalBox.union(g.boundingBox);
    }
    const size = new THREE.Vector3();
    totalBox.getSize(size);
    const center = new THREE.Vector3();
    totalBox.getCenter(center);
    const ySize = size.y || 1;

    const out = new THREE.Group();
    const materials: THREE.ShaderMaterial[] = [];
    const cyan = new THREE.Color(baseColor);

    for (const geom of baked) {
      // --- Skin shell: holographic fill + analytical muscle lines ---
      const skinMat = new THREE.ShaderMaterial({
        uniforms: {
          uBaseColor: { value: cyan.clone() },
          uTime: { value: 0 },
        },
        vertexShader: SKIN_VERT,
        fragmentShader: SKIN_FRAG,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.NormalBlending,
        side: THREE.DoubleSide,
      });
      materials.push(skinMat);
      const skinMesh = new THREE.Mesh(geom, skinMat);
      skinMesh.renderOrder = 0;
      skinMesh.frustumCulled = false;
      out.add(skinMesh);

      // --- Layer A: full triangulated wireframe (very subtle texture) ---
      const wireGeom = new THREE.WireframeGeometry(geom);
      const wireMat = new THREE.LineBasicMaterial({
        color: cyan,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
      });
      const wireLines = new THREE.LineSegments(wireGeom, wireMat);
      wireLines.renderOrder = 1;
      wireLines.frustumCulled = false;
      out.add(wireLines);

      // --- Layer B: silhouette + sharp creases (bright accent) ---
      const edgesGeom = new THREE.EdgesGeometry(geom, 24);
      const lineMat = new THREE.LineBasicMaterial({
        color: cyan,
        transparent: true,
        opacity: 0.70,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
      });
      const lines = new THREE.LineSegments(edgesGeom, lineMat);
      lines.renderOrder = 2;
      lines.frustumCulled = false;
      out.add(lines);
    }

    const s = targetHeight / ySize;
    return {
      group: out,
      scale: s,
      offset: new THREE.Vector3(
        -center.x * s,
        floorY - totalBox.min.y * s,
        -center.z * s,
      ),
      materials,
    };
  }, [gltf, targetHeight, floorY, baseColor]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    for (const m of materials) {
      // eslint-disable-next-line react-hooks/immutability
      m.uniforms.uTime.value = t;
    }
  });

  if (!group) return null;

  return (
    <group position={offset} scale={scale}>
      <primitive object={group} />
    </group>
  );
}
