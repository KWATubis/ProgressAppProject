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
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec4 viewPos = viewMatrix * worldPos;
    vViewNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-viewPos.xyz);
    gl_Position = projectionMatrix * viewPos;
  }
`;

const FILL_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  uniform vec3 uColor;
  void main() {
    float NdotV = clamp(dot(normalize(vViewNormal), normalize(vViewDir)), 0.0, 1.0);
    float fresnel = pow(1.0 - NdotV, 2.0);
    vec3 col = uColor * (0.10 + fresnel * 0.55);
    float alpha = clamp(fresnel * 0.30 + 0.06, 0.0, 0.45);
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
    geom: new THREE.CylinderGeometry(0.052, 0.072, 0.11, 14, 1),
    position: [0, 1.555, 0],
  });
  // traps
  parts.push({
    name: "trap-l",
    geom: new THREE.SphereGeometry(0.075, 14, 10),
    position: [-0.08, 1.535, -0.005],
    scale: [1.0, 0.7, 0.9],
  });
  parts.push({
    name: "trap-r",
    geom: new THREE.SphereGeometry(0.075, 14, 10),
    position: [0.08, 1.535, -0.005],
    scale: [1.0, 0.7, 0.9],
  });

  // ===== TORSO =====
  // Ribcage shell — the underlying torso silhouette
  parts.push({
    name: "ribcage",
    geom: new THREE.SphereGeometry(0.135, 18, 14),
    position: [0, 1.31, 0],
    scale: [1.05, 1.45, 0.72],
  });
  // Pecs — flattened ellipsoids on the chest, slight downward slope outward
  parts.push({
    name: "pec-l",
    geom: new THREE.SphereGeometry(0.075, 16, 12),
    position: [-0.085, 1.43, 0.07],
    rotation: [0, 0, 0.08],
    scale: [1.2, 0.85, 0.55],
  });
  parts.push({
    name: "pec-r",
    geom: new THREE.SphereGeometry(0.075, 16, 12),
    position: [0.085, 1.43, 0.07],
    rotation: [0, 0, -0.08],
    scale: [1.2, 0.85, 0.55],
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
      geom: new THREE.SphereGeometry(0.095, 16, 12),
      position: [sx * 0.115, 1.32, -0.07],
      scale: [0.65, 1.45, 0.5],
    });
  }
  // Spine ridge (back center)
  parts.push({
    name: "spine",
    geom: new THREE.CapsuleGeometry(0.014, 0.40, 4, 8),
    position: [0, 1.30, -0.105],
  });

  // ===== SHOULDERS =====
  for (const sx of [-1, 1]) {
    parts.push({
      name: `delt-${sx}`,
      geom: new THREE.SphereGeometry(0.082, 18, 14),
      position: [sx * 0.225, 1.51, 0],
      scale: [1.0, 0.95, 1.05],
    });
  }

  // ===== ARMS =====
  for (const sx of [-1, 1]) {
    // Bicep (front)
    parts.push({
      name: `bicep-${sx}`,
      geom: new THREE.SphereGeometry(0.052, 14, 10),
      position: [sx * 0.232, 1.345, 0.025],
      scale: [0.95, 1.75, 0.9],
    });
    // Tricep (back)
    parts.push({
      name: `tricep-${sx}`,
      geom: new THREE.SphereGeometry(0.052, 14, 10),
      position: [sx * 0.232, 1.345, -0.025],
      scale: [0.95, 1.75, 0.9],
    });
    // Elbow
    parts.push({
      name: `elbow-${sx}`,
      geom: new THREE.SphereGeometry(0.045, 12, 10),
      position: [sx * 0.232, 1.16, 0],
    });
    // Forearm
    parts.push({
      name: `forearm-${sx}`,
      geom: new THREE.CapsuleGeometry(0.042, 0.16, 6, 12),
      position: [sx * 0.232, 1.06, 0],
      scale: [1.05, 1.0, 0.95],
    });
    // Wrist
    parts.push({
      name: `wrist-${sx}`,
      geom: new THREE.SphereGeometry(0.034, 12, 10),
      position: [sx * 0.232, 0.92, 0],
    });
    // Hand (flat ellipsoid)
    parts.push({
      name: `hand-${sx}`,
      geom: new THREE.SphereGeometry(0.045, 12, 10),
      position: [sx * 0.232, 0.86, 0],
      scale: [0.75, 1.4, 0.45],
    });
  }

  // ===== HIPS / PELVIS =====
  parts.push({
    name: "pelvis",
    geom: new THREE.SphereGeometry(0.13, 18, 14),
    position: [0, 0.96, 0],
    scale: [1.32, 0.65, 0.85],
  });
  // V-line abductor cuts (oblique hip lines)
  for (const sx of [-1, 1]) {
    parts.push({
      name: `vline-${sx}`,
      geom: new THREE.CapsuleGeometry(0.015, 0.08, 4, 8),
      position: [sx * 0.075, 1.04, 0.07],
      rotation: [0, 0, sx * 0.55],
    });
  }
  // Glutes (back)
  for (const sx of [-1, 1]) {
    parts.push({
      name: `glute-${sx}`,
      geom: new THREE.SphereGeometry(0.082, 14, 12),
      position: [sx * 0.082, 0.935, -0.05],
      scale: [1.0, 1.0, 0.85],
    });
  }

  // ===== LEGS =====
  for (const sx of [-1, 1]) {
    // Quad — front of thigh
    parts.push({
      name: `quad-${sx}`,
      geom: new THREE.CapsuleGeometry(0.068, 0.22, 6, 14),
      position: [sx * 0.105, 0.67, 0.025],
      scale: [0.95, 1.0, 0.95],
    });
    // Vastus medialis — inner-knee teardrop
    parts.push({
      name: `vmo-${sx}`,
      geom: new THREE.SphereGeometry(0.035, 12, 10),
      position: [sx * 0.075, 0.51, 0.05],
      scale: [0.7, 1.4, 0.65],
    });
    // Hamstring — back of thigh
    parts.push({
      name: `ham-${sx}`,
      geom: new THREE.CapsuleGeometry(0.062, 0.22, 6, 14),
      position: [sx * 0.105, 0.67, -0.025],
      scale: [0.95, 1.0, 0.95],
    });
    // Knee
    parts.push({
      name: `knee-${sx}`,
      geom: new THREE.SphereGeometry(0.052, 14, 10),
      position: [sx * 0.105, 0.46, 0.01],
    });
    // Calf — back of shin
    parts.push({
      name: `calf-${sx}`,
      geom: new THREE.CapsuleGeometry(0.055, 0.15, 6, 12),
      position: [sx * 0.105, 0.27, -0.022],
      scale: [0.95, 1.0, 0.95],
    });
    // Shin — front of lower leg
    parts.push({
      name: `shin-${sx}`,
      geom: new THREE.CapsuleGeometry(0.042, 0.16, 6, 12),
      position: [sx * 0.105, 0.28, 0.018],
    });
    // Ankle
    parts.push({
      name: `ankle-${sx}`,
      geom: new THREE.SphereGeometry(0.040, 12, 10),
      position: [sx * 0.105, 0.095, 0],
    });
    // Foot
    parts.push({
      name: `foot-${sx}`,
      geom: new THREE.BoxGeometry(0.065, 0.045, 0.17),
      position: [sx * 0.105, 0.03, 0.055],
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
