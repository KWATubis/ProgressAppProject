"use client";

// Holographic anatomical body, ported from the holobody side project into
// Portion's health tab. On top of the original holo render (depth pre-pass
// occlusion + wireframe overlay + baked muscle definition) this adds Portion's
// muscle-state layer: every body vertex is classified into a MuscleGroup, then
// tinted by that muscle's recovery colour and made clickable so the existing
// BodyDetailPanel can open on a click.

import { useEffect, useMemo, useRef } from "react";
import { useLoader, useFrame, type ThreeEvent } from "@react-three/fiber";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
import * as THREE from "three";
import { HolographicMaterial } from "./HolographicMaterial";
import {
  MUSCLE_GROUPS,
  tirednessColor,
  type MuscleGroup,
  type MuscleState,
} from "@/lib/body/muscle-state";
import type { BodySelection } from "./Humanoid";

const HIDE_PATTERNS = /teeth|gums|tongue|innereye/i;

// ---- Arm posing (T-pose → settled A-pose). See the side project for the
// full reasoning; constants are kept identical so the figure reads the same.
const SHOULDER_DROP = 0.58;
const ELBOW_BEND = 0.0;
const ELBOW_FRAC = 0.5;
const ELBOW_BLEND = 0.16;
const ARM_FORWARD = 0.1;
const ARM_SLIM = 0.86;
const SHOULDER_FRAC = 0.11;
const ARM_BLEND_FRAC = 0.06;

// ---- Leg definition (carve valleys, shave a hair) + calf slim (lower leg
// reads a touch smaller, matching the holobody side project tweak).
const LEG_DEFINE = 0.026;
const LEG_SLIM = 0.006;
const CALF_SLIM = 0.011;

// ---- Wireframe-overlay height fade.
const WIRE_FOOT_LO = 0.0;
const WIRE_FOOT_HI = 0.13;
const WIRE_HEAD_LO = 1.64;
const WIRE_HEAD_HI = 1.82;
const WIRE_HEAD_GLOW = 0.28;

const TARGET_HEIGHT = 2.0;

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------
// Muscle classification. Returns an index into MUSCLE_GROUPS (0..10) or -1 for
// untracked regions (head, neck, hands, feet). Inputs are in fitted world
// space: feet at y≈0, head ≈TARGET_HEIGHT, centred on x=0/z=0, front = +z.
//   yN  = y / TARGET_HEIGHT                (0 feet → 1 head)
//   xN  = |x| / fittedHalfWidth            (0 centreline → 1 arm tip)
//   zRel= z                                (>0 front, <0 back)
// Thresholds are tuned to human proportion (hip ≈0.48·h, shoulder ≈0.80·h) and
// are intentionally approximate — this is a colour overlay, not anatomy.
// ---------------------------------------------------------------------------
const GI = {
  chest: 0,
  shoulders: 1,
  biceps: 2,
  triceps: 3,
  forearms: 4,
  abs: 5,
  back: 6,
  glutes: 7,
  quads: 8,
  hamstrings: 9,
  calves: 10,
} as const satisfies Record<MuscleGroup, number>;

function classifyMuscle(yN: number, xN: number, zRel: number): number {
  // Arms sit well outside the torso once abducted.
  if (xN > 0.52) {
    if (yN >= 0.58) return zRel >= 0 ? GI.biceps : GI.triceps; // upper arm
    if (yN >= 0.46) return GI.forearms;
    return -1; // hand
  }
  // Central column (torso + legs).
  if (yN > 0.8) return -1; // head / neck
  if (yN > 0.62) {
    if (xN > 0.36) return GI.shoulders; // deltoid caps
    return zRel >= 0 ? GI.chest : GI.back;
  }
  if (yN > 0.5) return zRel >= 0 ? GI.abs : GI.back;
  if (yN > 0.45) return zRel >= 0 ? GI.abs : GI.glutes; // hips / glutes
  if (yN > 0.25) return zRel >= 0 ? GI.quads : GI.hamstrings; // thigh
  if (yN > 0.08) return GI.calves; // lower leg
  return -1; // feet
}

// ---------------------------------------------------------------------------
// poseArms — settle the T-pose arms to the sides (verbatim from the side
// project; trimmed comments).
// ---------------------------------------------------------------------------
function poseArms(meshes: THREE.Mesh[]) {
  if (meshes.length === 0) return;
  const box = new THREE.Box3();
  for (const m of meshes) box.expandByObject(m);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const shoulderY = box.min.y + size.y * 0.82;
  const shoulderEdge = size.x * SHOULDER_FRAC;
  const blendBand = size.x * ARM_BLEND_FRAC;
  const reach = Math.max(size.x * 0.5 - shoulderEdge, 1e-4);

  const armBandLo = box.min.y + size.y * 0.44;
  const armBandHi = box.min.y + size.y * 0.57;

  const v = new THREE.Vector3();
  const elbow = new THREE.Vector3();
  const qDrop = new THREE.Quaternion();
  const qFwd = new THREE.Quaternion();
  const qShould = new THREE.Quaternion();
  const qElbow = new THREE.Quaternion();
  const X_AXIS = new THREE.Vector3(1, 0, 0);
  const Y_AXIS = new THREE.Vector3(0, 1, 0);
  const Z_AXIS = new THREE.Vector3(0, 0, 1);

  for (const mesh of meshes) {
    const geo = mesh.geometry;
    if (geo.userData.armsDeformed) continue;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const offX = Math.abs(x - center.x);
      const wY = smoothstep(armBandLo, armBandHi, y);
      const w = smoothstep(shoulderEdge, shoulderEdge + blendBand, offX) * wY;
      if (w <= 0) continue;
      const dir = x > center.x ? 1 : -1;

      const slim = 1 - (1 - ARM_SLIM) * w;
      v.set(x, shoulderY + (y - shoulderY) * slim, center.z + (z - center.z) * slim);

      const pivotX = center.x + dir * shoulderEdge;
      qDrop.setFromAxisAngle(Z_AXIS, -dir * SHOULDER_DROP * w);
      qFwd.setFromAxisAngle(Y_AXIS, -dir * ARM_FORWARD * w);
      qShould.multiplyQuaternions(qFwd, qDrop);

      v.set(v.x - pivotX, v.y - shoulderY, v.z - center.z).applyQuaternion(qShould);
      v.set(v.x + pivotX, v.y + shoulderY, v.z + center.z);

      const t = (offX - shoulderEdge) / reach;
      const flex = smoothstep(ELBOW_FRAC, ELBOW_FRAC + ELBOW_BLEND, t) * ELBOW_BEND * w;
      if (flex > 1e-5) {
        elbow.set(dir * ELBOW_FRAC * reach, 0, 0).applyQuaternion(qShould);
        elbow.set(elbow.x + pivotX, elbow.y + shoulderY, elbow.z + center.z);
        qElbow.setFromAxisAngle(X_AXIS, -flex);
        v.sub(elbow).applyQuaternion(qElbow).add(elbow);
      }

      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.userData.armsDeformed = true;
  }
}

// ---------------------------------------------------------------------------
// trimInteriorHeadCavities — delete the interior mouth/throat shell so it stops
// glowing through the translucent face (verbatim from the side project).
// ---------------------------------------------------------------------------
function trimInteriorHeadCavities(
  geo: THREE.BufferGeometry,
  { headLo = 0.78, interiorFrac = 0.6, azBins = 16, polBins = 8 } = {},
) {
  if (geo.userData.mouthTrimmed) return;
  const pos = geo.attributes.position;
  const N = pos.count;
  if (!N) return;

  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const minY = bb.min.y;
  const height = bb.max.y - bb.min.y || 1;
  const yCut = minY + headLo * height;

  let sx = 0,
    sy = 0,
    sz = 0,
    hc = 0;
  for (let i = 0; i < N; i++) {
    if (pos.getY(i) < yCut) continue;
    sx += pos.getX(i);
    sy += pos.getY(i);
    sz += pos.getZ(i);
    hc++;
  }
  if (hc < 200) return;
  const cx = sx / hc,
    cy = sy / hc,
    cz = sz / hc;

  const nb = azBins * polBins;
  const binMaxR = new Float32Array(nb);
  const binOf = (dx: number, dy: number, dz: number, r: number) => {
    const az = (Math.atan2(dz, dx) + Math.PI) / (2 * Math.PI);
    const pol = Math.acos(Math.min(1, Math.max(-1, dy / (r || 1)))) / Math.PI;
    const ai = Math.min(azBins - 1, Math.max(0, Math.floor(az * azBins)));
    const pi = Math.min(polBins - 1, Math.max(0, Math.floor(pol * polBins)));
    return ai * polBins + pi;
  };
  const vr = new Float32Array(N);
  const vbin = new Int32Array(N).fill(-1);
  for (let i = 0; i < N; i++) {
    if (pos.getY(i) < yCut) continue;
    const dx = pos.getX(i) - cx,
      dy = pos.getY(i) - cy,
      dz = pos.getZ(i) - cz;
    const r = Math.hypot(dx, dy, dz);
    const b = binOf(dx, dy, dz, r);
    vr[i] = r;
    vbin[i] = b;
    if (r > binMaxR[b]) binMaxR[b] = r;
  }

  const interior = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const b = vbin[i];
    if (b >= 0 && vr[i] < interiorFrac * binMaxR[b]) interior[i] = 1;
  }

  const index = geo.index;
  const triCount = Math.floor((index ? index.count : N) / 3);
  if (index) {
    const newIdx: number[] = [];
    for (let t = 0; t < triCount; t++) {
      const a = index.getX(t * 3),
        b = index.getX(t * 3 + 1),
        c = index.getX(t * 3 + 2);
      if (interior[a] && interior[b] && interior[c]) continue;
      newIdx.push(a, b, c);
    }
    geo.setIndex(newIdx);
  } else {
    const names = Object.keys(geo.attributes);
    const out: Record<string, number[]> = {};
    for (const n of names) out[n] = [];
    for (let t = 0; t < triCount; t++) {
      const a = t * 3,
        b = t * 3 + 1,
        c = t * 3 + 2;
      if (interior[a] && interior[b] && interior[c]) continue;
      for (const vi of [a, b, c]) {
        for (const n of names) {
          const at = geo.attributes[n];
          for (let k = 0; k < at.itemSize; k++) out[n].push(at.getComponent(vi, k));
        }
      }
    }
    for (const n of names) {
      const at = geo.attributes[n];
      geo.setAttribute(n, new THREE.BufferAttribute(new Float32Array(out[n]), at.itemSize));
    }
  }
  geo.computeVertexNormals();
  geo.userData.mouthTrimmed = true;
}

// ---------------------------------------------------------------------------
// enhanceMuscles — inflate bellies + bake the aCrease/aForm cavity maps + slim
// the thighs and calves (verbatim from the side project, plus the calf band).
// ---------------------------------------------------------------------------
function enhanceMuscles(geo: THREE.BufferGeometry, inflate = 0.011) {
  if (geo.userData.musclesProcessed) return;
  const posAttr = geo.attributes.position;
  const N = posAttr.count;
  if (!N) return;

  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const bbSize = new THREE.Vector3();
  bb.getSize(bbSize);
  const height = bbSize.y || 1;
  const diag = bb.min.distanceTo(bb.max) || 1;
  const inv = 1 / (diag * 1e-5);

  const keyToId = new Map<string, number>();
  const orig2canon = new Int32Array(N);
  const cx: number[] = [],
    cy: number[] = [],
    cz: number[] = [];
  let M = 0;
  for (let i = 0; i < N; i++) {
    const x = posAttr.getX(i),
      y = posAttr.getY(i),
      z = posAttr.getZ(i);
    const k = `${Math.round(x * inv)}|${Math.round(y * inv)}|${Math.round(z * inv)}`;
    let id = keyToId.get(k);
    if (id === undefined) {
      id = M++;
      keyToId.set(k, id);
      cx.push(x);
      cy.push(y);
      cz.push(z);
    }
    orig2canon[i] = id;
  }

  const index = geo.index;
  const triCount = Math.floor((index ? index.count : N) / 3);
  const tris = new Int32Array(triCount * 3);
  const adj: Set<number>[] = Array.from({ length: M }, () => new Set<number>());
  const vAt = (t: number, c: number) => (index ? index.getX(t * 3 + c) : t * 3 + c);
  for (let t = 0; t < triCount; t++) {
    const a = orig2canon[vAt(t, 0)],
      b = orig2canon[vAt(t, 1)],
      c = orig2canon[vAt(t, 2)];
    tris[t * 3] = a;
    tris[t * 3 + 1] = b;
    tris[t * 3 + 2] = c;
    adj[a].add(b);
    adj[a].add(c);
    adj[b].add(a);
    adj[b].add(c);
    adj[c].add(a);
    adj[c].add(b);
  }

  const computeNormals = (px: number[], py: number[], pz: number[]) => {
    const nx = new Float32Array(M),
      ny = new Float32Array(M),
      nz = new Float32Array(M);
    for (let t = 0; t < triCount; t++) {
      const a = tris[t * 3],
        b = tris[t * 3 + 1],
        c = tris[t * 3 + 2];
      const ux = px[b] - px[a],
        uy = py[b] - py[a],
        uz = pz[b] - pz[a];
      const vx = px[c] - px[a],
        vy = py[c] - py[a],
        vz = pz[c] - pz[a];
      const fx = uy * vz - uz * vy,
        fy = uz * vx - ux * vz,
        fz = ux * vy - uy * vx;
      nx[a] += fx;
      ny[a] += fy;
      nz[a] += fz;
      nx[b] += fx;
      ny[b] += fy;
      nz[b] += fz;
      nx[c] += fx;
      ny[c] += fy;
      nz[c] += fz;
    }
    for (let i = 0; i < M; i++) {
      const l = Math.hypot(nx[i], ny[i], nz[i]) || 1;
      nx[i] /= l;
      ny[i] /= l;
      nz[i] /= l;
    }
    return { nx, ny, nz };
  };

  const concavity = (
    px: number[],
    py: number[],
    pz: number[],
    nx: Float32Array,
    ny: Float32Array,
    nz: Float32Array,
  ) => {
    const conc = new Float32Array(M);
    for (let i = 0; i < M; i++) {
      const ns = adj[i];
      if (ns.size === 0) continue;
      let s = 0;
      for (const j of ns) {
        const dx = px[j] - px[i],
          dy = py[j] - py[i],
          dz = pz[j] - pz[i];
        const l = Math.hypot(dx, dy, dz) || 1;
        s += (dx / l) * nx[i] + (dy / l) * ny[i] + (dz / l) * nz[i];
      }
      conc[i] = s / ns.size;
    }
    const sm = new Float32Array(M);
    for (let i = 0; i < M; i++) {
      let s = conc[i],
        n = 1;
      for (const j of adj[i]) {
        s += conc[j];
        n++;
      }
      sm[i] = s / n;
    }
    return sm;
  };

  const el = new Float32Array(M);
  for (let i = 0; i < M; i++) {
    const ns = adj[i];
    if (ns.size === 0) {
      el[i] = 0;
      continue;
    }
    let s = 0;
    for (const j of ns) s += Math.hypot(cx[j] - cx[i], cy[j] - cy[i], cz[j] - cz[i]);
    el[i] = s / ns.size;
  }
  const elSorted = Float32Array.from(el).sort();
  const elLo = elSorted[Math.min(M - 1, Math.floor(M * 0.4))] || 0;
  const elHi = elSorted[Math.min(M - 1, Math.floor(M * 0.8))] || 1;
  const elRange = Math.max(elHi - elLo, 1e-6);
  const formMask = new Float32Array(M);
  for (let i = 0; i < M; i++) {
    const t = Math.min(1, Math.max(0, (el[i] - elLo) / elRange));
    formMask[i] = t * t * (3 - 2 * t);
  }

  let nrm = computeNormals(cx, cy, cz);
  let sm = concavity(cx, cy, cz, nrm.nx, nrm.ny, nrm.nz);

  if (inflate > 0) {
    const mags = Float32Array.from(sm, (v) => Math.abs(v)).sort();
    const scale = mags[Math.min(M - 1, Math.floor(M * 0.98))] || 1;
    const minY = bb.min.y;
    const disp = new Float32Array(M);
    for (let i = 0; i < M; i++) {
      const yN = (cy[i] - minY) / height;
      const headMask = 1 - THREE.MathUtils.smoothstep(yN, 0.8, 0.92);
      const footMask = THREE.MathUtils.smoothstep(yN, 0.02, 0.1);
      const convexN = Math.min(1, Math.max(0, -sm[i] / scale));
      const concaveN = Math.min(1, Math.max(0, sm[i] / scale));
      let d = inflate * height * headMask * footMask * convexN * formMask[i];
      const thighK =
        THREE.MathUtils.smoothstep(yN, 0.25, 0.31) *
        (1 - THREE.MathUtils.smoothstep(yN, 0.46, 0.52));
      d -= LEG_DEFINE * height * footMask * formMask[i] * concaveN * thighK;
      d -= LEG_SLIM * height * footMask * thighK;
      // Calf band (above the ankle ~0.10·h, below the knee ~0.27·h): shave the
      // lower leg inward so the calves read a bit smaller.
      const calfK =
        THREE.MathUtils.smoothstep(yN, 0.1, 0.15) *
        (1 - THREE.MathUtils.smoothstep(yN, 0.24, 0.29));
      d -= CALF_SLIM * height * footMask * calfK;
      disp[i] = d;
    }
    for (let pass = 0; pass < 4; pass++) {
      const tmp = new Float32Array(M);
      for (let i = 0; i < M; i++) {
        let s = disp[i],
          n = 1;
        for (const j of adj[i]) {
          s += disp[j];
          n++;
        }
        tmp[i] = s / n;
      }
      disp.set(tmp);
    }
    for (let i = 0; i < M; i++) {
      cx[i] += nrm.nx[i] * disp[i];
      cy[i] += nrm.ny[i] * disp[i];
      cz[i] += nrm.nz[i] * disp[i];
    }
    for (let i = 0; i < N; i++) {
      const c = orig2canon[i];
      posAttr.setXYZ(i, cx[c], cy[c], cz[c]);
    }
    posAttr.needsUpdate = true;
    nrm = computeNormals(cx, cy, cz);
    sm = concavity(cx, cy, cz, nrm.nx, nrm.ny, nrm.nz);
  }

  const sorted = Float32Array.from(sm).sort();
  const lo = sorted[Math.max(0, Math.floor(M * 0.02))];
  const hi = sorted[Math.min(M - 1, Math.floor(M * 0.98))];
  const range = hi - lo || 1;
  const crease = new Float32Array(N);
  for (let i = 0; i < N; i++)
    crease[i] = Math.min(1, Math.max(0, (sm[orig2canon[i]] - lo) / range));
  geo.setAttribute("aCrease", new THREE.BufferAttribute(crease, 1));

  const form = new Float32Array(N);
  for (let i = 0; i < N; i++) form[i] = formMask[orig2canon[i]];
  geo.setAttribute("aForm", new THREE.BufferAttribute(form, 1));

  geo.computeVertexNormals();
  geo.userData.musclesProcessed = true;
}

type Props = {
  muscleStates: Record<MuscleGroup, MuscleState>;
  selection: BodySelection;
  onSelect: (s: BodySelection) => void;
  autoRotate: boolean;
  interactive: boolean;
  url?: string;
};

export function HoloBody({
  muscleStates,
  selection,
  onSelect,
  autoRotate,
  interactive,
  url = "/models/standard-male-figure.dae",
}: Props) {
  const collada = useLoader(ColladaLoader, url) as unknown as { scene: THREE.Scene };
  const spinRef = useRef<THREE.Group>(null);

  const { scene, coloredMeshes, wireOverlays, depthOverlays, depthMaterial, holoMaterial, wireMaterial, fitTransform } =
    useMemo(() => {
      const root = collada.scene;
      root.updateMatrixWorld(true);

      const meshes: THREE.Mesh[] = [];
      root.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (!m.isMesh || !m.geometry) return;
        if (HIDE_PATTERNS.test(m.name) || HIDE_PATTERNS.test(m.parent?.name ?? "")) {
          m.visible = false;
          return;
        }
        meshes.push(m);
      });

      poseArms(meshes);
      let bodyMesh = meshes[0];
      for (const m of meshes) {
        if (
          m.geometry.attributes.position.count >
          (bodyMesh?.geometry.attributes.position.count ?? 0)
        )
          bodyMesh = m;
      }
      if (bodyMesh) trimInteriorHeadCavities(bodyMesh.geometry);
      for (const m of meshes) enhanceMuscles(m.geometry);

      const holoMaterial = new HolographicMaterial({
        hologramColor: "#5be3ff",
        fresnelAmount: 0.4,
        fresnelOpacity: 0.7,
        scanlineSize: 10.0,
        hologramBrightness: 0.24,
        signalSpeed: 0.5,
        hologramOpacity: 0.6,
        enableBlinking: false,
        blendMode: THREE.NormalBlending,
        side: THREE.FrontSide,
        muscleEmphasis: 0.92,
        lightDirection: [0.25, 1.0, 0.4],
        surfaceBrightness: 0.46,
        rimStrength: 1.0,
        creaseStrength: 0.85,
        creaseThreshold: 0.4,
        creaseWidth: 0.3,
        creaseSharpness: 1.6,
        creaseRolloffLo: 0.74,
        creaseRolloffHi: 0.93,
        creaseLegLo: 1.02,
        creaseLegHi: 1.2,
        footFadeLo: 0.0,
        footFadeHi: 0.12,
        headFadeLo: 1.64,
        headFadeHi: 1.8,
        headGlow: 0.28,
        headFill: 0.5,
        stateMix: 0.9,
      });
      holoMaterial.depthTest = true;
      holoMaterial.depthWrite = false;

      const depthMaterial = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: true,
        depthTest: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });

      // Auto-fit AFTER deformation so the now-A-pose body fills the frame.
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const scale = size.y > 0 ? TARGET_HEIGHT / size.y : 1.0;
      const fitTransform = {
        scale,
        offset: new THREE.Vector3(-center.x * scale, -box.min.y * scale, -center.z * scale),
      };
      const fittedHalfWidth = Math.max(size.x * scale * 0.5, 1e-4);

      const groupM = new THREE.Matrix4().compose(
        fitTransform.offset,
        new THREE.Quaternion(),
        new THREE.Vector3(scale, scale, scale),
      );

      // ---- Classify each mesh's vertices into muscle groups (in fitted world
      // space) and seed the muscle-state attributes the shader reads.
      const wv = new THREE.Vector3();
      const coloredMeshes: THREE.Mesh[] = [];
      for (const m of meshes) {
        const geo = m.geometry;
        const pos = geo.attributes.position;
        const vc = pos.count;
        const full = groupM.clone().multiply(m.matrixWorld);
        const groupIndex = new Int8Array(vc);
        const hasState = new Float32Array(vc);
        const stateColor = new Float32Array(vc * 3); // cyan until first paint
        const selected = new Float32Array(vc);
        for (let i = 0; i < vc; i++) {
          wv.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(full);
          const yN = wv.y / TARGET_HEIGHT;
          const xN = Math.abs(wv.x) / fittedHalfWidth;
          const gi = classifyMuscle(yN, xN, wv.z);
          groupIndex[i] = gi;
          hasState[i] = gi >= 0 ? 1 : 0;
          stateColor[i * 3] = 0.357;
          stateColor[i * 3 + 1] = 0.89;
          stateColor[i * 3 + 2] = 1.0;
        }
        geo.userData.groupIndex = groupIndex;
        geo.setAttribute("aHasState", new THREE.BufferAttribute(hasState, 1));
        geo.setAttribute("aStateColor", new THREE.BufferAttribute(stateColor, 3));
        geo.setAttribute("aSelected", new THREE.BufferAttribute(selected, 1));
        coloredMeshes.push(m);
      }

      const wireMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color("#a8edff"),
        vertexColors: true,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const wireV = new THREE.Vector3();
      const wireOverlays = meshes.map((m) => {
        const geometry = new THREE.WireframeGeometry(m.geometry);
        const full = groupM.clone().multiply(m.matrixWorld);
        const wp = geometry.attributes.position;
        const colors = new Float32Array(wp.count * 3);
        for (let i = 0; i < wp.count; i++) {
          wireV.set(wp.getX(i), wp.getY(i), wp.getZ(i)).applyMatrix4(full);
          const footFade = smoothstep(WIRE_FOOT_LO, WIRE_FOOT_HI, wireV.y);
          const headK = smoothstep(WIRE_HEAD_LO, WIRE_HEAD_HI, wireV.y);
          const headDamp = 1 + (WIRE_HEAD_GLOW - 1) * headK;
          const f = footFade * headDamp;
          colors[i * 3] = f;
          colors[i * 3 + 1] = f;
          colors[i * 3 + 2] = f;
        }
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        return { geometry, matrix: m.matrixWorld.clone() };
      });

      const depthOverlays = meshes.map((m) => ({
        geometry: m.geometry,
        matrix: m.matrixWorld.clone(),
      }));

      return {
        scene: root,
        coloredMeshes,
        wireOverlays,
        depthOverlays,
        depthMaterial,
        holoMaterial,
        wireMaterial,
        fitTransform,
      };
    }, [collada]);

  // Apply the holo material to every visible mesh.
  useEffect(() => {
    const root = collada.scene;
    root.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh && !HIDE_PATTERNS.test(m.name) && !HIDE_PATTERNS.test(m.parent?.name ?? "")) {
        m.material = holoMaterial;
      }
    });
  }, [collada, holoMaterial]);

  // Repaint per-vertex muscle-state colours whenever the states change.
  useEffect(() => {
    const cyan = [0.357, 0.89, 1.0];
    const colors = MUSCLE_GROUPS.map((g) => {
      const c = new THREE.Color(tirednessColor(muscleStates[g]?.hoursSince ?? null));
      return [c.r, c.g, c.b] as [number, number, number];
    });
    for (const m of coloredMeshes) {
      const geo = m.geometry;
      const gi = geo.userData.groupIndex as Int8Array | undefined;
      const attr = geo.getAttribute("aStateColor") as THREE.BufferAttribute | undefined;
      if (!gi || !attr) continue;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < gi.length; i++) {
        const g = gi[i];
        const col = g >= 0 ? colors[g] : cyan;
        arr[i * 3] = col[0];
        arr[i * 3 + 1] = col[1];
        arr[i * 3 + 2] = col[2];
      }
      attr.needsUpdate = true;
    }
  }, [coloredMeshes, muscleStates]);

  // Flag the selected group's vertices so the shader can highlight them.
  useEffect(() => {
    const selIndex =
      selection?.kind === "muscle" ? MUSCLE_GROUPS.indexOf(selection.group) : -1;
    for (const m of coloredMeshes) {
      const geo = m.geometry;
      const gi = geo.userData.groupIndex as Int8Array | undefined;
      const attr = geo.getAttribute("aSelected") as THREE.BufferAttribute | undefined;
      if (!gi || !attr) continue;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < gi.length; i++) arr[i] = gi[i] === selIndex && selIndex >= 0 ? 1 : 0;
      attr.needsUpdate = true;
    }
  }, [coloredMeshes, selection]);

  useFrame((_, dt) => {
    holoMaterial.update();
    if (spinRef.current) {
      spinRef.current.position.y = Math.sin(performance.now() * 0.0008) * 0.012;
      if (autoRotate) spinRef.current.rotation.y += dt * 0.35;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    const mesh = e.object as THREE.Mesh;
    const gi = mesh.geometry?.userData?.groupIndex as Int8Array | undefined;
    if (!gi || e.face == null) return;
    e.stopPropagation();
    const g = gi[e.face.a];
    if (g >= 0) onSelect({ kind: "muscle", group: MUSCLE_GROUPS[g] });
    else onSelect(null);
  };

  return (
    <group ref={spinRef}>
      <group
        scale={fitTransform.scale}
        position={fitTransform.offset}
        onClick={interactive ? handleClick : undefined}
        onPointerMissed={interactive ? () => onSelect(null) : undefined}
      >
        {/* Depth-only pre-pass: drawn first, occludes the far side. Excluded from
            raycasting so only the visible holo surface is clickable. */}
        {depthOverlays.map((o, i) => (
          <mesh
            key={`depth-${i}`}
            geometry={o.geometry}
            material={depthMaterial}
            matrixAutoUpdate={false}
            matrix={o.matrix}
            renderOrder={-1}
            raycast={() => null}
          />
        ))}
        <primitive object={scene} />
        {wireOverlays.map((o, i) => (
          <lineSegments
            key={i}
            geometry={o.geometry}
            material={wireMaterial}
            matrixAutoUpdate={false}
            matrix={o.matrix}
            raycast={() => null}
          />
        ))}
      </group>
    </group>
  );
}

export default HoloBody;
