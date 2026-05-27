"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

type Props = {
  targetHeight?: number;
  floorY?: number;
  color?: string;
};

useGLTF.preload("/models/body.glb");

export function BodyMesh({ targetHeight = 1.88, floorY = 0, color = "#5be3ff" }: Props) {
  const gltf = useGLTF("/models/body.glb");
  console.log("BodyMesh: useGLTF loaded?", !!gltf?.scene, "scene children:", gltf?.scene?.children.length);

  const scene = useMemo(() => {
    if (!gltf?.scene) return null;
    try {
      const cloned = SkeletonUtils.clone(gltf.scene);
      console.log("BodyMesh: cloned scene children:", cloned.children.length);
      return cloned;
    } catch (e) {
      console.error("BodyMesh: clone failed:", e);
      return null;
    }
  }, [gltf]);

  const { scale, offset } = useMemo(() => {
    if (!gltf?.scene) return { scale: 1, offset: new THREE.Vector3() };
    try {
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      const s = targetHeight / (size.y || 1);
      const offsetY = floorY - box.min.y * s;
      console.log("BodyMesh: height=", size.y, "scale=", s, "offsetY=", offsetY);
      return {
        scale: s,
        offset: new THREE.Vector3(-box.getCenter(new THREE.Vector3()).x * s, offsetY, 0),
      };
    } catch (e) {
      console.error("BodyMesh: bbox failed:", e);
      return { scale: 1, offset: new THREE.Vector3() };
    }
  }, [gltf, targetHeight, floorY]);

  if (!scene) {
    console.warn("BodyMesh: scene is null, returning null");
    return null;
  }

  console.log("BodyMesh: rendering with scale", scale, "offset", offset);
  return (
    <group position={offset} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}
