import { useEffect, useMemo, useRef } from 'react'
import { useLoader, useFrame } from '@react-three/fiber'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import * as THREE from 'three'
import { HolographicMaterial } from './HolographicMaterial'

const HIDE_PATTERNS = /teeth|gums|tongue|innereye/i

// Arm posing. The imported figure is a T-pose; a single rigid drop reads as a
// stiff scarecrow, so we settle the arms in two segments — the whole arm drops
// off the shoulder (with a slight forward swing so it leaves the dead-flat
// coronal plane), then everything past the elbow adds a soft forward flex — and
// shave a little thickness off the limb so it isn't chunky.
const SHOULDER_DROP    = 0.88  // rad, whole-arm drop from the A-pose toward the side; a touch shy
                               // of clamped-to-the-body so the upper arm clears the lat (armpit gap)
const ELBOW_BEND       = 0.46  // rad, forearm flex — bends the elbow so the hands carry forward off
                               // the thighs instead of lying flat against them like a mannequin
const ELBOW_FRAC       = 0.50  // along-arm fraction (shoulder→fingertip) where the forearm begins
const ELBOW_BLEND      = 0.16  // smooth ramp width around the elbow
const ARM_FORWARD      = 0.20  // rad, forward swing of the whole arm — lifts the hands out of the
                               // dead coronal plane so they sit slightly in front of the hips
const ARM_SLIM         = 0.86  // arm thickness scale toward its centerline (1 = unchanged)
const SHOULDER_FRAC    = 0.11  // shoulder pivot X as fraction of T-pose half-width
const ARM_BLEND_FRAC   = 0.06  // smooth blend width around shoulder

// Wireframe-overlay height fade (true world space: feet ~0, head ~2.0). Kills
// the sole wireframe that webs a bright line between the feet, and dims the
// densely tessellated skull/face so the head stops over-glowing.
const WIRE_FOOT_LO   = 0.0   // wireframe fully gone at/below the soles
const WIRE_FOOT_HI   = 0.13  // back to full brightness just above the feet
const WIRE_HEAD_LO   = 1.64  // head damp starts around the jaw/neck
const WIRE_HEAD_HI   = 1.82  // full damp by mid-skull
const WIRE_HEAD_GLOW = 0.28  // wireframe brightness multiplier on the head

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function poseArms(meshes: THREE.Mesh[]) {
  if (meshes.length === 0) return
  const box = new THREE.Box3()
  for (const m of meshes) box.expandByObject(m)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)

  const shoulderY    = box.min.y + size.y * 0.82
  const shoulderEdge = size.x * SHOULDER_FRAC
  const blendBand    = size.x * ARM_BLEND_FRAC
  const reach        = Math.max(size.x * 0.5 - shoulderEdge, 1e-4) // shoulder → fingertip span

  // Vertical gate for "is this an arm vertex". The X-only test (offX > shoulderEdge)
  // is far too greedy on its own — it selects ~58% of the body (lats, hips, outer
  // thighs, and the outer edges of the wide-stance feet), and with no height check
  // those foot verts got rotated about the shoulder pivot by the full arm drop,
  // sweeping them across the centerline into two bright crossing blades under the
  // feet. This figure is an A-pose: the arm slopes from the shoulder (Y≈0.82·h) down
  // to the hands (Y≈0.58·h), while the legs/feet sit below ~0.44·h. Fading the arm
  // influence in across [0.44, 0.57]·h keeps the whole arm (hands included) but can
  // never reach the legs or feet again.
  const armBandLo = box.min.y + size.y * 0.44
  const armBandHi = box.min.y + size.y * 0.57

  // Scratch objects reused across every vertex (no per-vertex allocation).
  const v       = new THREE.Vector3()
  const elbow   = new THREE.Vector3()
  const qDrop   = new THREE.Quaternion()
  const qFwd    = new THREE.Quaternion()
  const qShould = new THREE.Quaternion()
  const qElbow  = new THREE.Quaternion()
  const X_AXIS  = new THREE.Vector3(1, 0, 0)
  const Y_AXIS  = new THREE.Vector3(0, 1, 0)
  const Z_AXIS  = new THREE.Vector3(0, 0, 1)

  for (const mesh of meshes) {
    const geo = mesh.geometry
    if (geo.userData.armsDeformed) continue
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const offX = Math.abs(x - center.x)
      const wY = smoothstep(armBandLo, armBandHi, y)
      const w = smoothstep(shoulderEdge, shoulderEdge + blendBand, offX) * wY
      if (w <= 0) continue
      const dir = x > center.x ? 1 : -1

      // 1. Slim the limb: pull thickness (vertical + front/back) toward the arm's
      //    centerline, ramped in by w so the shoulder/deltoid stays full.
      const slim = 1 - (1 - ARM_SLIM) * w
      v.set(x, shoulderY + (y - shoulderY) * slim, center.z + (z - center.z) * slim)

      // 2. Upper arm: drop the whole arm off the shoulder (rotate about Z), plus a
      //    small forward swing about Y so it leaves the dead-flat coronal plane.
      const pivotX = center.x + dir * shoulderEdge
      qDrop.setFromAxisAngle(Z_AXIS, -dir * SHOULDER_DROP * w)
      qFwd.setFromAxisAngle(Y_AXIS, -dir * ARM_FORWARD * w)
      qShould.multiplyQuaternions(qFwd, qDrop)

      v.set(v.x - pivotX, v.y - shoulderY, v.z - center.z).applyQuaternion(qShould)
      v.set(v.x + pivotX, v.y + shoulderY, v.z + center.z)

      // 3. Forearm: soft elbow flex forward for everything past the elbow. The
      //    elbow joint is the point along the T-pose arm at ELBOW_FRAC, carried
      //    through the same shoulder rotation, so the forearm pivots about it.
      const t = (offX - shoulderEdge) / reach
      const flex = smoothstep(ELBOW_FRAC, ELBOW_FRAC + ELBOW_BLEND, t) * ELBOW_BEND * w
      if (flex > 1e-5) {
        elbow.set(dir * ELBOW_FRAC * reach, 0, 0).applyQuaternion(qShould)
        elbow.set(elbow.x + pivotX, elbow.y + shoulderY, elbow.z + center.z)
        qElbow.setFromAxisAngle(X_AXIS, -flex)
        v.sub(elbow).applyQuaternion(qElbow).add(elbow)
      }

      pos.setXYZ(i, v.x, v.y, v.z)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    geo.userData.armsDeformed = true
  }
}

// Carve the interior mouth / throat / nasal cavity out of the body mesh. With
// the teeth + tongue hidden and the hologram see-through, that deep concave
// pocket was glowing through the face like an "esophagus". There's no separate
// mesh for it, so we detect it geometrically: the head's skin fully encloses
// the head centroid, so in any spherical direction the OUTERMOST vertex is skin
// and anything sitting at a much smaller radius in that same direction is an
// interior cavity. We delete only triangles whose three vertices are all
// interior — that removes the throat tube while leaving the lips and face skin
// (which are at full radius) intact.
function trimInteriorHeadCavities(
  geo: THREE.BufferGeometry,
  { headLo = 0.78, interiorFrac = 0.6, azBins = 16, polBins = 8 } = {},
) {
  if (geo.userData.mouthTrimmed) return
  const pos = geo.attributes.position
  const N = pos.count
  if (!N) return

  geo.computeBoundingBox()
  const bb = geo.boundingBox!
  const minY = bb.min.y
  const height = (bb.max.y - bb.min.y) || 1
  const yCut = minY + headLo * height

  // Centroid of the head/neck region (everything above the cut).
  let sx = 0, sy = 0, sz = 0, hc = 0
  for (let i = 0; i < N; i++) {
    if (pos.getY(i) < yCut) continue
    sx += pos.getX(i); sy += pos.getY(i); sz += pos.getZ(i); hc++
  }
  if (hc < 200) return // no real head region resolved — bail safely
  const cx = sx / hc, cy = sy / hc, cz = sz / hc

  // Per-direction outer-skin radius: bin head verts by spherical direction from
  // the centroid and keep the max radius per bin (= the skin).
  const nb = azBins * polBins
  const binMaxR = new Float32Array(nb)
  const binOf = (dx: number, dy: number, dz: number, r: number) => {
    const az = (Math.atan2(dz, dx) + Math.PI) / (2 * Math.PI)
    const pol = Math.acos(Math.min(1, Math.max(-1, dy / (r || 1)))) / Math.PI
    const ai = Math.min(azBins - 1, Math.max(0, Math.floor(az * azBins)))
    const pi = Math.min(polBins - 1, Math.max(0, Math.floor(pol * polBins)))
    return ai * polBins + pi
  }
  const vr = new Float32Array(N)
  const vbin = new Int32Array(N).fill(-1)
  for (let i = 0; i < N; i++) {
    if (pos.getY(i) < yCut) continue
    const dx = pos.getX(i) - cx, dy = pos.getY(i) - cy, dz = pos.getZ(i) - cz
    const r = Math.hypot(dx, dy, dz)
    const b = binOf(dx, dy, dz, r)
    vr[i] = r; vbin[i] = b
    if (r > binMaxR[b]) binMaxR[b] = r
  }

  const interior = new Uint8Array(N)
  for (let i = 0; i < N; i++) {
    const b = vbin[i]
    if (b >= 0 && vr[i] < interiorFrac * binMaxR[b]) interior[i] = 1
  }

  // Rebuild without the all-interior triangles.
  const index = geo.index
  const triCount = Math.floor((index ? index.count : N) / 3)
  let removed = 0
  if (index) {
    const newIdx: number[] = []
    for (let t = 0; t < triCount; t++) {
      const a = index.getX(t * 3), b = index.getX(t * 3 + 1), c = index.getX(t * 3 + 2)
      if (interior[a] && interior[b] && interior[c]) { removed++; continue }
      newIdx.push(a, b, c)
    }
    geo.setIndex(newIdx)
  } else {
    const names = Object.keys(geo.attributes)
    const out: Record<string, number[]> = {}
    for (const n of names) out[n] = []
    for (let t = 0; t < triCount; t++) {
      const a = t * 3, b = t * 3 + 1, c = t * 3 + 2
      if (interior[a] && interior[b] && interior[c]) { removed++; continue }
      for (const vi of [a, b, c]) {
        for (const n of names) {
          const at = geo.attributes[n]
          for (let k = 0; k < at.itemSize; k++) out[n].push(at.getComponent(vi, k))
        }
      }
    }
    for (const n of names) {
      const at = geo.attributes[n]
      geo.setAttribute(n, new THREE.BufferAttribute(new Float32Array(out[n]), at.itemSize))
    }
  }
  geo.computeVertexNormals()
  geo.userData.mouthTrimmed = true
}

// Two jobs in one geometry pass:
//   1. Inflate the muscle bellies so the figure reads as more muscular.
//   2. Bake a per-vertex concavity "cavity map" into `aCrease` (1.0 = deepest
//      valley where muscle groups meet) which the shader lights as crisp
//      glowing border lines.
// Both run in object space so the result is stable and sharp at any camera
// distance, unlike a screen-space normal-derivative crease.
function enhanceMuscles(geo: THREE.BufferGeometry, inflate = 0.011) {
  if (geo.userData.musclesProcessed) return
  const posAttr = geo.attributes.position
  const N = posAttr.count
  if (!N) return

  geo.computeBoundingBox()
  const bb = geo.boundingBox!
  const bbSize = new THREE.Vector3(); bb.getSize(bbSize)
  const height = bbSize.y || 1
  const diag = bb.min.distanceTo(bb.max) || 1
  const inv = 1 / (diag * 1e-5) // weld tolerance relative to model size

  // ---- Weld coincident vertices so we can walk the real mesh topology.
  const keyToId = new Map<string, number>()
  const orig2canon = new Int32Array(N)
  const cx: number[] = [], cy: number[] = [], cz: number[] = []
  let M = 0
  for (let i = 0; i < N; i++) {
    const x = posAttr.getX(i), y = posAttr.getY(i), z = posAttr.getZ(i)
    const k = `${Math.round(x * inv)}|${Math.round(y * inv)}|${Math.round(z * inv)}`
    let id = keyToId.get(k)
    if (id === undefined) { id = M++; keyToId.set(k, id); cx.push(x); cy.push(y); cz.push(z) }
    orig2canon[i] = id
  }

  // ---- Triangles + one-ring adjacency (both invariant under displacement).
  const index = geo.index
  const triCount = Math.floor((index ? index.count : N) / 3)
  const tris = new Int32Array(triCount * 3)
  const adj: Set<number>[] = Array.from({ length: M }, () => new Set<number>())
  const vAt = (t: number, c: number) => (index ? index.getX(t * 3 + c) : t * 3 + c)
  for (let t = 0; t < triCount; t++) {
    const a = orig2canon[vAt(t, 0)], b = orig2canon[vAt(t, 1)], c = orig2canon[vAt(t, 2)]
    tris[t * 3] = a; tris[t * 3 + 1] = b; tris[t * 3 + 2] = c
    adj[a].add(b); adj[a].add(c)
    adj[b].add(a); adj[b].add(c)
    adj[c].add(a); adj[c].add(b)
  }

  // Area-weighted smoothed normals for a given position set.
  const computeNormals = (px: number[], py: number[], pz: number[]) => {
    const nx = new Float32Array(M), ny = new Float32Array(M), nz = new Float32Array(M)
    for (let t = 0; t < triCount; t++) {
      const a = tris[t * 3], b = tris[t * 3 + 1], c = tris[t * 3 + 2]
      const ux = px[b] - px[a], uy = py[b] - py[a], uz = pz[b] - pz[a]
      const vx = px[c] - px[a], vy = py[c] - py[a], vz = pz[c] - pz[a]
      const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx
      nx[a] += fx; ny[a] += fy; nz[a] += fz
      nx[b] += fx; ny[b] += fy; nz[b] += fz
      nx[c] += fx; ny[c] += fy; nz[c] += fz
    }
    for (let i = 0; i < M; i++) { const l = Math.hypot(nx[i], ny[i], nz[i]) || 1; nx[i] /= l; ny[i] /= l; nz[i] /= l }
    return { nx, ny, nz }
  }

  // Smoothed concavity: mean dot(dir-to-neighbor, normal). >0 in valleys,
  // <0 on bulges — the muscle-separation / muscle-belly signal.
  const concavity = (px: number[], py: number[], pz: number[], nx: Float32Array, ny: Float32Array, nz: Float32Array) => {
    const conc = new Float32Array(M)
    for (let i = 0; i < M; i++) {
      const ns = adj[i]; if (ns.size === 0) continue
      let s = 0
      for (const j of ns) {
        const dx = px[j] - px[i], dy = py[j] - py[i], dz = pz[j] - pz[i]
        const l = Math.hypot(dx, dy, dz) || 1
        s += (dx / l) * nx[i] + (dy / l) * ny[i] + (dz / l) * nz[i]
      }
      conc[i] = s / ns.size
    }
    const sm = new Float32Array(M)
    for (let i = 0; i < M; i++) { let s = conc[i], n = 1; for (const j of adj[i]) { s += conc[j]; n++ } sm[i] = s / n }
    return sm
  }

  // ---- Local mesh resolution = mean distance to one-ring neighbours, per
  // canonical vertex (measured on the ORIGINAL positions). Hands and faces are
  // always far more finely tessellated (tiny triangles) than the torso/limbs.
  // `formMask` is 1 on the broad muscle forms (pecs, delts, quads, back) and
  // fades to 0 on fine detail (fingers, facial features, ears). We use it to
  // keep the muscle inflation + seam/rim glow on the big forms while sparing
  // the hands and face — no pose- or position-based guessing required.
  const el = new Float32Array(M)
  for (let i = 0; i < M; i++) {
    const ns = adj[i]
    if (ns.size === 0) { el[i] = 0; continue }
    let s = 0
    for (const j of ns) s += Math.hypot(cx[j] - cx[i], cy[j] - cy[i], cz[j] - cz[i])
    el[i] = s / ns.size
  }
  const elSorted = Float32Array.from(el).sort()
  const elLo = elSorted[Math.min(M - 1, Math.floor(M * 0.40))] || 0
  const elHi = elSorted[Math.min(M - 1, Math.floor(M * 0.80))] || 1
  const elRange = Math.max(elHi - elLo, 1e-6)
  const formMask = new Float32Array(M)
  for (let i = 0; i < M; i++) {
    const t = Math.min(1, Math.max(0, (el[i] - elLo) / elRange))
    formMask[i] = t * t * (3 - 2 * t) // smoothstep: 0 = fine detail, 1 = broad form
  }

  let nrm = computeNormals(cx, cy, cz)
  let sm = concavity(cx, cy, cz, nrm.nx, nrm.ny, nrm.nz)

  // ---- Inflate muscle bellies: push the convex regions (pecs, delts, arms,
  // quads, calves...) outward along their normal, masked to skip the head/neck
  // and feet. Bigger bellies + relatively deeper valleys = more muscular AND
  // more defined.
  if (inflate > 0) {
    const mags = Float32Array.from(sm, (v) => Math.abs(v)).sort()
    const scale = mags[Math.min(M - 1, Math.floor(M * 0.98))] || 1
    const minY = bb.min.y
    const disp = new Float32Array(M)
    for (let i = 0; i < M; i++) {
      const yN = (cy[i] - minY) / height
      const headMask = 1 - THREE.MathUtils.smoothstep(yN, 0.80, 0.92) // fade out over head/neck
      const footMask = THREE.MathUtils.smoothstep(yN, 0.02, 0.10)      // fade out at the feet
      const convexN = Math.min(1, Math.max(0, -sm[i] / scale))         // how much of a bulge
      // formMask keeps the inflation on broad muscle forms but spares fine
      // detail, so thin fingers and facial features don't balloon.
      disp[i] = inflate * height * headMask * footMask * convexN * formMask[i]
    }
    // Smooth the displacement field so the added mass reads as smooth volume.
    // More passes round the bellies off so muscles don't peak into points.
    for (let pass = 0; pass < 4; pass++) {
      const tmp = new Float32Array(M)
      for (let i = 0; i < M; i++) { let s = disp[i], n = 1; for (const j of adj[i]) { s += disp[j]; n++ } tmp[i] = s / n }
      disp.set(tmp)
    }
    for (let i = 0; i < M; i++) { cx[i] += nrm.nx[i] * disp[i]; cy[i] += nrm.ny[i] * disp[i]; cz[i] += nrm.nz[i] * disp[i] }
    for (let i = 0; i < N; i++) { const c = orig2canon[i]; posAttr.setXYZ(i, cx[c], cy[c], cz[c]) }
    posAttr.needsUpdate = true
    nrm = computeNormals(cx, cy, cz)
    sm = concavity(cx, cy, cz, nrm.nx, nrm.ny, nrm.nz)
  }

  // ---- Bake the cavity map, normalised 0..1 against the 2nd/98th percentiles
  // so single deep pits (nostrils, ear canals) can't crush the scale.
  const sorted = Float32Array.from(sm).sort()
  const lo = sorted[Math.max(0, Math.floor(M * 0.02))]
  const hi = sorted[Math.min(M - 1, Math.floor(M * 0.98))]
  const range = (hi - lo) || 1
  const crease = new Float32Array(N)
  for (let i = 0; i < N; i++) crease[i] = Math.min(1, Math.max(0, (sm[orig2canon[i]] - lo) / range))
  geo.setAttribute('aCrease', new THREE.BufferAttribute(crease, 1))

  // ---- Bake the broad-form mask so the shader can calm the seam + rim glow
  // on the hands and face without touching the torso's muscle definition.
  const form = new Float32Array(N)
  for (let i = 0; i < N; i++) form[i] = formMask[orig2canon[i]]
  geo.setAttribute('aForm', new THREE.BufferAttribute(form, 1))

  geo.computeVertexNormals()
  geo.userData.musclesProcessed = true
}

export default function HoloBody({ url = '/models/standard-male-figure.dae' }: { url?: string }) {
  const collada = useLoader(ColladaLoader, url) as unknown as { scene: THREE.Scene }
  const groupRef = useRef<THREE.Group>(null)

  const { scene, wireOverlays, depthOverlays, depthMaterial, holoMaterial, wireMaterial, fitTransform } = useMemo(() => {
    const root = collada.scene
    root.updateMatrixWorld(true)

    const meshes: THREE.Mesh[] = []
    root.traverse((obj) => {
      const m = obj as THREE.Mesh
      if (!m.isMesh || !m.geometry) return
      if (HIDE_PATTERNS.test(m.name) || HIDE_PATTERNS.test(m.parent?.name ?? '')) {
        m.visible = false
        return
      }
      meshes.push(m)
    })

    poseArms(meshes)
    // The body is the mesh with the most vertices; carve its interior mouth /
    // throat cavity out before the muscle pass so it stops glowing through.
    let bodyMesh = meshes[0]
    for (const m of meshes) {
      if (m.geometry.attributes.position.count > (bodyMesh?.geometry.attributes.position.count ?? 0)) bodyMesh = m
    }
    if (bodyMesh) trimInteriorHeadCavities(bodyMesh.geometry)
    for (const m of meshes) enhanceMuscles(m.geometry)

    const holoMaterial = new HolographicMaterial({
      hologramColor: '#5be3ff',
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
      surfaceBrightness: 0.46,  // dimmer fill — smaller overall glow
      rimStrength: 1.0,         // smaller silhouette glow
      creaseStrength: 0.0,      // seam/muscle glow off entirely — no bright spots
      creaseThreshold: 0.42,    // lower cutoff so shallower ab-grid valleys light up
      creaseWidth: 0.3,         // line softness band above the threshold
      creaseSharpness: 1.5,     // crisp, well-defined lines
      footFadeLo: 0.0,          // kill the bright sole rim that joins the feet
      footFadeHi: 0.12,
      headFadeLo: 1.64,         // calm the over-bright skull / face / eyes
      headFadeHi: 1.8,
      headGlow: 0.28,           // rim + seam multiplier on the head
      headFill: 0.5,            // surface-fill multiplier on the head
    })
    // Rely on the depth pre-pass (below) for occlusion: test against it so the
    // far side of the body is rejected, but don't write depth ourselves (the
    // surface stays a translucent hologram, not an opaque cutout).
    holoMaterial.depthTest = true
    holoMaterial.depthWrite = false

    // Invisible depth-only material. We render a copy of every body mesh with
    // this FIRST (opaque queue → before the transparent holo + wireframe),
    // writing ONLY to the depth buffer. That records the nearest surface at
    // each pixel, so the holo surface and the wireframe lines on the far side
    // of the body get depth-tested away instead of bleeding through the front.
    const depthMaterial = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
      depthTest: true,
      // Push the recorded depth a hair AWAY from the camera. The holo surface is
      // drawn by a different shader program (HolographicMaterial) than this
      // pre-pass, and the two can disagree by ~1 ULP on the same vertex; without
      // a margin, the front surface sometimes computes a touch deeper than what
      // it wrote here, fails the LessEqual test, and sparkles out — worst at
      // grazing/high-curvature regions (traps, upper chest, forearms). A small
      // slope-scaled offset gives the front a reliable pass while staying far
      // smaller than any real gap, so the genuine far side stays occluded.
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })

    // Auto-fit AFTER deformation so the now-A-pose body fills the frame.
    root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(root)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const targetHeight = 2.0
    const scale = size.y > 0 ? targetHeight / size.y : 1.0
    const fitTransform = {
      scale,
      offset: new THREE.Vector3(-center.x * scale, -box.min.y * scale, -center.z * scale),
    }

    // The transform the rendered <group> applies on top of each mesh's own
    // matrix, so we can resolve each wireframe vertex to true world height and
    // fade it the same way the shader fades the surface.
    const groupM = new THREE.Matrix4().compose(
      fitTransform.offset,
      new THREE.Quaternion(),
      new THREE.Vector3(scale, scale, scale),
    )

    const wireMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color('#a8edff'),
      vertexColors: true,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const wireV = new THREE.Vector3()
    const wireOverlays = meshes.map((m) => {
      const geometry = new THREE.WireframeGeometry(m.geometry)
      const full = groupM.clone().multiply(m.matrixWorld)
      const wp = geometry.attributes.position
      const colors = new Float32Array(wp.count * 3)
      for (let i = 0; i < wp.count; i++) {
        wireV.set(wp.getX(i), wp.getY(i), wp.getZ(i)).applyMatrix4(full)
        const footFade = smoothstep(WIRE_FOOT_LO, WIRE_FOOT_HI, wireV.y)
        const headK = smoothstep(WIRE_HEAD_LO, WIRE_HEAD_HI, wireV.y)
        const headDamp = 1 + (WIRE_HEAD_GLOW - 1) * headK // lerp(1, glow, k)
        const f = footFade * headDamp
        colors[i * 3] = f
        colors[i * 3 + 1] = f
        colors[i * 3 + 2] = f
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      return { geometry, matrix: m.matrixWorld.clone() }
    })

    // Depth pre-pass copies: same geometry + world matrix as each body mesh,
    // drawn opaque (depth only) before everything else.
    const depthOverlays = meshes.map((m) => ({ geometry: m.geometry, matrix: m.matrixWorld.clone() }))

    return { scene: root, meshes, wireOverlays, depthOverlays, depthMaterial, holoMaterial, wireMaterial, fitTransform }
  }, [collada])

  useEffect(() => {
    const root = collada.scene
    root.traverse((obj) => {
      const m = obj as THREE.Mesh
      if (m.isMesh && !HIDE_PATTERNS.test(m.name) && !HIDE_PATTERNS.test(m.parent?.name ?? '')) {
        m.material = holoMaterial
      }
    })
  }, [collada, holoMaterial])

  useFrame(() => {
    holoMaterial.update()
  })

  return (
    <group ref={groupRef} scale={fitTransform.scale} position={fitTransform.offset}>
      {/* Depth-only pre-pass: renderOrder -1 + opaque material → drawn first,
          writing the nearest-surface depth that occludes the far side. */}
      {depthOverlays.map((o, i) => (
        <mesh key={`depth-${i}`} geometry={o.geometry} material={depthMaterial} matrixAutoUpdate={false} matrix={o.matrix} renderOrder={-1} />
      ))}
      <primitive object={scene} />
      {wireOverlays.map((o, i) => (
        <lineSegments key={i} geometry={o.geometry} material={wireMaterial} matrixAutoUpdate={false} matrix={o.matrix} />
      ))}
    </group>
  )
}
