import { useMemo } from 'react'
import * as THREE from 'three'
import { useHoloMaterial, useWireframeMaterial } from './HoloMaterial'

function HoloPart({
  geometry,
  position,
  rotation,
  material,
  wireMaterial,
}: {
  geometry: THREE.BufferGeometry
  position: [number, number, number]
  rotation?: [number, number, number]
  material: THREE.Material
  wireMaterial: THREE.Material
}) {
  const wire = useMemo(() => new THREE.WireframeGeometry(geometry), [geometry])
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geometry} material={material} />
      <lineSegments geometry={wire} material={wireMaterial} />
    </group>
  )
}

export default function PlaceholderBody() {
  const fill = useHoloMaterial('#5be3ff')
  const wire = useWireframeMaterial('#a8f0ff')

  const head     = useMemo(() => new THREE.SphereGeometry(0.18, 24, 24), [])
  const neck     = useMemo(() => new THREE.CylinderGeometry(0.07, 0.09, 0.12, 16), [])
  const torso    = useMemo(() => new THREE.CapsuleGeometry(0.32, 0.55, 8, 24), [])
  const hips     = useMemo(() => new THREE.SphereGeometry(0.28, 24, 18), [])
  const upperArm = useMemo(() => new THREE.CapsuleGeometry(0.09, 0.32, 6, 16), [])
  const forearm  = useMemo(() => new THREE.CapsuleGeometry(0.075, 0.30, 6, 16), [])
  const hand     = useMemo(() => new THREE.SphereGeometry(0.08, 14, 12), [])
  const thigh    = useMemo(() => new THREE.CapsuleGeometry(0.135, 0.40, 6, 18), [])
  const calf     = useMemo(() => new THREE.CapsuleGeometry(0.105, 0.36, 6, 16), [])
  const foot     = useMemo(() => new THREE.SphereGeometry(0.10, 14, 12), [])

  return (
    <group position={[0, -0.9, 0]}>
      {/* head + neck */}
      <HoloPart geometry={head}  position={[0, 2.05, 0]}  material={fill} wireMaterial={wire} />
      <HoloPart geometry={neck}  position={[0, 1.85, 0]}  material={fill} wireMaterial={wire} />

      {/* torso */}
      <HoloPart geometry={torso} position={[0, 1.40, 0]}  material={fill} wireMaterial={wire} />

      {/* hips */}
      <HoloPart geometry={hips}  position={[0, 0.95, 0]}  material={fill} wireMaterial={wire} />

      {/* left arm */}
      <HoloPart geometry={upperArm} position={[-0.42, 1.55, 0]} rotation={[0, 0,  0.12]} material={fill} wireMaterial={wire} />
      <HoloPart geometry={forearm}  position={[-0.42, 1.15, 0]} material={fill} wireMaterial={wire} />
      <HoloPart geometry={hand}     position={[-0.42, 0.92, 0]} material={fill} wireMaterial={wire} />

      {/* right arm */}
      <HoloPart geometry={upperArm} position={[ 0.42, 1.55, 0]} rotation={[0, 0, -0.12]} material={fill} wireMaterial={wire} />
      <HoloPart geometry={forearm}  position={[ 0.42, 1.15, 0]} material={fill} wireMaterial={wire} />
      <HoloPart geometry={hand}     position={[ 0.42, 0.92, 0]} material={fill} wireMaterial={wire} />

      {/* left leg */}
      <HoloPart geometry={thigh} position={[-0.16, 0.55, 0]} material={fill} wireMaterial={wire} />
      <HoloPart geometry={calf}  position={[-0.16, 0.10, 0]} material={fill} wireMaterial={wire} />
      <HoloPart geometry={foot}  position={[-0.16,-0.13, 0.05]} material={fill} wireMaterial={wire} />

      {/* right leg */}
      <HoloPart geometry={thigh} position={[ 0.16, 0.55, 0]} material={fill} wireMaterial={wire} />
      <HoloPart geometry={calf}  position={[ 0.16, 0.10, 0]} material={fill} wireMaterial={wire} />
      <HoloPart geometry={foot}  position={[ 0.16,-0.13, 0.05]} material={fill} wireMaterial={wire} />
    </group>
  )
}
