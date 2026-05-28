"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { MuscleGroup, MuscleState } from "@/lib/body/muscle-state";

/**
 * Procedural anatomical body — built from ~50 primitive meshes (one per
 * muscle / region). Each primitive renders as a wireframe + a dim fresnel
 * fill, so the composition itself produces a muscular silhouette and clean
 * muscle separations. No external GLB, no animation rig.
 *
 * Coordinates: feet at y=0, head ~1.83. Body centered on x=0, front faces +z.
 */

type Props = {
  baseColor?: string;
  // Back-compat shim — unused for now while the body is presentational.
  targetHeight?: number;
  floorY?: number;
  muscleStates?: Record<MuscleGroup, MuscleState>;
  hoveredGroup?: MuscleGroup | null;
  selectedGroup?: MuscleGroup | null;
};

type V3 = [number, number, number];
type Part = {
  name: string;
  geom: THREE.BufferGeometry;
  position: V3;
  rotation?: V3;
  scale?: V3;
};

// ---------- Shaders ----------

const FILL_VERT = /* glsl */ `
  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldNormal;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec4 viewPos = viewMatrix * worldPos;
    vViewNormal = normalize(normalMatrix * normal);
    // Approximate world normal — non-uniform scale skews this slightly but
    // it's good enough for the rough sky-occlusion gradient.
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(-viewPos.xyz);
    gl_Position = projectionMatrix * viewPos;
  }
`;

/**
 * Fresnel rim + fake AO from above. Fragments whose world normal points
 * downward are darkened — undersides of pecs, biceps, quads, glutes — so the
 * ~50 stacked ellipsoids start to read as one continuous lit volume instead
 * of disconnected spheres.
 */
const FILL_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldNormal;
  uniform vec3 uColor;
  void main() {
    vec3 N = normalize(vViewNormal);
    vec3 V = normalize(vViewDir);
    float NdotV = clamp(dot(N, V), 0.0, 1.0);
    float fresnel = pow(1.0 - NdotV, 1.85);

    // skyFactor: 1.0 for upward-facing normals (lit by sky), 0.0 for downward.
    float skyFactor = clamp(vWorldNormal.y * 0.5 + 0.5, 0.0, 1.0);
    float ao = mix(0.42, 1.0, skyFactor);

    vec3 col = uColor * (0.07 + fresnel * 0.50) * ao;
    float alpha = clamp(fresnel * 0.26 + 0.05 * ao, 0.0, 0.38);
    gl_FragColor = vec4(col, alpha);
  }
`;

// ---------- Anatomy ----------

/**
 * Build every primitive that makes up the body. Hand-tuned proportions:
 * shoulder-to-shoulder ~0.55m, waist ~0.30m, hips ~0.36m → V-taper.
 * All positions are world-space with feet at y=0.
 */
function buildBody(): Part[] {
  const parts: Part[] = [];

  // ===== HEAD & NECK =====
  parts.push({
    name: "head",
    geom: new THREE.SphereGeometry(0.105, 18, 14),
    position: [0, 1.74, 0],
    scale: [0.95, 1.08, 0.95],
  });
  // jaw bulge
  parts.push({
    name: "jaw",
    geom: new THREE.SphereGeometry(0.072, 14, 10),
    position: [0, 1.66, 0.012],
    scale: [1.0, 0.7, 0.95],
  });
  parts.push({
    name: "neck",
    geom: new THREE.CylinderGeometry(0.054, 0.078, 0.11, 16, 1),
    position: [0, 1.555, 0],
  });
  // Sternocleidomastoid (SCM) — visible neck cord from behind ear to sternum
  for (const sx of [-1, 1]) {
    parts.push({
      name: `scm-${sx}`,
      geom: new THREE.CapsuleGeometry(0.012, 0.085, 4, 8),
      position: [sx * 0.025, 1.555, 0.038],
      rotation: [0, 0, sx * 0.20],
    });
  }
  // Trapezius — sloping cap from neck to shoulder
  parts.push({
    name: "trap-l",
    geom: new THREE.SphereGeometry(0.085, 16, 12),
    position: [-0.09, 1.54, -0.005],
    scale: [1.0, 0.7, 0.9],
  });
  parts.push({
    name: "trap-r",
    geom: new THREE.SphereGeometry(0.085, 16, 12),
    position: [0.09, 1.54, -0.005],
    scale: [1.0, 0.7, 0.9],
  });

  // ===== TORSO =====
  // Ribcage shell — the underlying torso silhouette
  parts.push({
    name: "ribcage",
    geom: new THREE.SphereGeometry(0.138, 22, 16),
    position: [0, 1.31, 0],
    scale: [1.10, 1.50, 0.75],
  });
  // Pecs — flattened ellipsoids on the chest, slight downward slope outward
  parts.push({
    name: "pec-l",
    geom: new THREE.SphereGeometry(0.082, 22, 16),
    position: [-0.088, 1.43, 0.075],
    rotation: [0, 0, 0.10],
    scale: [1.32, 0.95, 0.65],
  });
  parts.push({
    name: "pec-r",
    geom: new THREE.SphereGeometry(0.082, 22, 16),
    position: [0.088, 1.43, 0.075],
    rotation: [0, 0, -0.10],
    scale: [1.32, 0.95, 0.65],
  });

  // 6-pack abs (3 rows × 2 cols)
  const ABS_ROWS = [1.34, 1.27, 1.20];
  for (const yRow of ABS_ROWS) {
    for (const sx of [-1, 1]) {
      parts.push({
        name: `ab-${yRow}-${sx}`,
        geom: new THREE.SphereGeometry(0.038, 12, 10),
        position: [sx * 0.038, yRow, 0.108],
        scale: [0.85, 0.78, 0.4],
      });
    }
  }
  // Obliques (V-shape flanking the abs)
  for (const sx of [-1, 1]) {
    parts.push({
      name: `oblique-${sx}`,
      geom: new THREE.CapsuleGeometry(0.028, 0.13, 6, 10),
      position: [sx * 0.107, 1.24, 0.05],
      rotation: [0, 0, sx * 0.18],
    });
  }
  // Serratus (small finger-like below pec, on side)
  for (const sx of [-1, 1]) {
    parts.push({
      name: `serratus-${sx}`,
      geom: new THREE.CapsuleGeometry(0.018, 0.05, 4, 8),
      position: [sx * 0.118, 1.345, 0.04],
      rotation: [0, 0, sx * 0.5],
    });
  }

  // Lats — wide back wings
  for (const sx of [-1, 1]) {
    parts.push({
      name: `lat-${sx}`,
      geom: new THREE.SphereGeometry(0.10, 18, 14),
      position: [sx * 0.125, 1.32, -0.07],
      scale: [0.78, 1.5, 0.55],
    });
  }
  // Spine ridge (back center)
  parts.push({
    name: "spine",
    geom: new THREE.CapsuleGeometry(0.014, 0.42, 4, 8),
    position: [0, 1.30, -0.108],
  });
  // Erector spinae — pillars flanking the spine
  for (const sx of [-1, 1]) {
    parts.push({
      name: `erector-${sx}`,
      geom: new THREE.CapsuleGeometry(0.022, 0.30, 4, 8),
      position: [sx * 0.038, 1.28, -0.10],
    });
  }

  // ===== SHOULDERS — three-head deltoid =====
  for (const sx of [-1, 1]) {
    // Lateral (middle) head — the main cap
    parts.push({
      name: `delt-lat-${sx}`,
      geom: new THREE.SphereGeometry(0.092, 22, 16),
      position: [sx * 0.235, 1.51, 0],
      scale: [1.0, 0.95, 1.05],
    });
    // Anterior head — forward bulge
    parts.push({
      name: `delt-ant-${sx}`,
      geom: new THREE.SphereGeometry(0.058, 16, 12),
      position: [sx * 0.205, 1.50, 0.045],
      scale: [0.9, 0.85, 0.85],
    });
    // Posterior head — back bulge
    parts.push({
      name: `delt-post-${sx}`,
      geom: new THREE.SphereGeometry(0.055, 16, 12),
      position: [sx * 0.210, 1.50, -0.045],
      scale: [0.9, 0.85, 0.85],
    });
  }

  // ===== ARMS =====
  for (const sx of [-1, 1]) {
    // Bicep (front) — bigger peak
    parts.push({
      name: `bicep-${sx}`,
      geom: new THREE.SphereGeometry(0.058, 18, 14),
      position: [sx * 0.240, 1.345, 0.028],
      scale: [1.05, 1.85, 1.0],
    });
    // Tricep (back) — three-head approximation as a single mass
    parts.push({
      name: `tricep-${sx}`,
      geom: new THREE.SphereGeometry(0.058, 18, 14),
      position: [sx * 0.240, 1.345, -0.030],
      scale: [1.05, 1.85, 1.05],
    });
    // Brachialis — small bulge on the outer side of the upper arm
    parts.push({
      name: `brachialis-${sx}`,
      geom: new THREE.CapsuleGeometry(0.022, 0.06, 4, 8),
      position: [sx * 0.282, 1.27, 0],
    });
    // Elbow
    parts.push({
      name: `elbow-${sx}`,
      geom: new THREE.SphereGeometry(0.048, 14, 12),
      position: [sx * 0.240, 1.15, 0],
    });
    // Forearm — flexor mass (front, thicker)
    parts.push({
      name: `forearm-flex-${sx}`,
      geom: new THREE.CapsuleGeometry(0.048, 0.17, 6, 14),
      position: [sx * 0.240, 1.05, 0.008],
      scale: [1.05, 1.0, 1.0],
    });
    // Forearm extensor (back, slightly thinner — gives the forearm a twist)
    parts.push({
      name: `forearm-ext-${sx}`,
      geom: new THREE.CapsuleGeometry(0.040, 0.16, 4, 10),
      position: [sx * 0.240, 1.05, -0.020],
    });
    // Wrist
    parts.push({
      name: `wrist-${sx}`,
      geom: new THREE.SphereGeometry(0.036, 12, 10),
      position: [sx * 0.240, 0.91, 0],
    });
    // Hand (flat ellipsoid)
    parts.push({
      name: `hand-${sx}`,
      geom: new THREE.SphereGeometry(0.046, 14, 10),
      position: [sx * 0.240, 0.85, 0],
      scale: [0.78, 1.45, 0.45],
    });
  }

  // ===== HIPS / PELVIS =====
  parts.push({
    name: "pelvis",
    geom: new THREE.SphereGeometry(0.13, 22, 16),
    position: [0, 0.96, 0],
    scale: [1.34, 0.68, 0.88],
  });
  // V-line abductor cuts (oblique hip lines)
  for (const sx of [-1, 1]) {
    parts.push({
      name: `vline-${sx}`,
      geom: new THREE.CapsuleGeometry(0.014, 0.10, 4, 8),
      position: [sx * 0.078, 1.04, 0.072],
      rotation: [0, 0, sx * 0.58],
    });
  }
  // Iliac crest — diagonal ridge on each hip bone above the V-line
  for (const sx of [-1, 1]) {
    parts.push({
      name: `iliac-${sx}`,
      geom: new THREE.CapsuleGeometry(0.012, 0.085, 4, 8),
      position: [sx * 0.13, 1.11, 0.03],
      rotation: [0, 0, sx * 1.05],
    });
  }
  // Glutes (back) — bigger
  for (const sx of [-1, 1]) {
    parts.push({
      name: `glute-${sx}`,
      geom: new THREE.SphereGeometry(0.088, 18, 14),
      position: [sx * 0.085, 0.93, -0.055],
      scale: [1.0, 1.0, 0.9],
    });
  }

  // ===== LEGS =====
  for (const sx of [-1, 1]) {
    // Quad — front of thigh (beefier)
    parts.push({
      name: `quad-${sx}`,
      geom: new THREE.CapsuleGeometry(0.078, 0.22, 8, 16),
      position: [sx * 0.108, 0.67, 0.028],
      scale: [0.95, 1.0, 0.95],
    });
    // Vastus medialis — inner-knee teardrop
    parts.push({
      name: `vmo-${sx}`,
      geom: new THREE.SphereGeometry(0.038, 14, 10),
      position: [sx * 0.078, 0.50, 0.052],
      scale: [0.75, 1.45, 0.7],
    });
    // Sartorius — diagonal sash across the thigh
    parts.push({
      name: `sartorius-${sx}`,
      geom: new THREE.CapsuleGeometry(0.013, 0.22, 4, 8),
      position: [sx * 0.10, 0.66, 0.07],
      rotation: [0, 0, sx * 0.18],
    });
    // Adductor — inner thigh
    parts.push({
      name: `adductor-${sx}`,
      geom: new THREE.CapsuleGeometry(0.035, 0.18, 6, 12),
      position: [sx * 0.045, 0.71, 0],
    });
    // Hamstring — back of thigh
    parts.push({
      name: `ham-${sx}`,
      geom: new THREE.CapsuleGeometry(0.068, 0.22, 8, 14),
      position: [sx * 0.108, 0.67, -0.028],
      scale: [0.95, 1.0, 0.95],
    });
    // Knee
    parts.push({
      name: `knee-${sx}`,
      geom: new THREE.SphereGeometry(0.054, 16, 12),
      position: [sx * 0.108, 0.455, 0.012],
    });
    // Calf — back of shin (beefier diamond)
    parts.push({
      name: `calf-${sx}`,
      geom: new THREE.CapsuleGeometry(0.060, 0.14, 6, 14),
      position: [sx * 0.108, 0.27, -0.024],
      scale: [0.95, 1.0, 0.95],
    });
    // Shin — front of lower leg
    parts.push({
      name: `shin-${sx}`,
      geom: new THREE.CapsuleGeometry(0.044, 0.16, 6, 12),
      position: [sx * 0.108, 0.28, 0.020],
    });
    // Ankle
    parts.push({
      name: `ankle-${sx}`,
      geom: new THREE.SphereGeometry(0.042, 14, 12),
      position: [sx * 0.108, 0.095, 0],
    });
    // Foot
    parts.push({
      name: `foot-${sx}`,
      geom: new THREE.BoxGeometry(0.07, 0.045, 0.18),
      position: [sx * 0.108, 0.028, 0.06],
    });
  }

  return parts;
}

export function BodyMesh({ baseColor = "#5be3ff" }: Props) {
  const group = useMemo(() => {
    const root = new THREE.Group();
    const color = new THREE.Color(baseColor);
    const parts = buildBody();

    for (const part of parts) {
      const partGroup = new THREE.Group();
      partGroup.position.set(...part.position);
      if (part.rotation)
        partGroup.rotation.set(...part.rotation);
      if (part.scale) partGroup.scale.set(...part.scale);

      // Fresnel fill — provides a dim interior glow, lets the wireframe lead.
      const fillMat = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: color.clone() } },
        vertexShader: FILL_VERT,
        fragmentShader: FILL_FRAG,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const fillMesh = new THREE.Mesh(part.geom, fillMat);
      fillMesh.renderOrder = 0;
      fillMesh.frustumCulled = false;
      partGroup.add(fillMesh);

      // Wireframe — every face edge of the primitive.
      const wireGeom = new THREE.WireframeGeometry(part.geom);
      const wireMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        toneMapped: false,
      });
      const wireLines = new THREE.LineSegments(wireGeom, wireMat);
      wireLines.renderOrder = 1;
      wireLines.frustumCulled = false;
      partGroup.add(wireLines);

      partGroup.name = part.name;
      root.add(partGroup);
    }

    return root;
  }, [baseColor]);

  return <primitive object={group} />;
}
