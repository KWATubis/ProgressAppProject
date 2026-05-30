import { Suspense, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

export default function Scene({ children }: { children: ReactNode }) {
  // Tight near/far around the actual subject. The body sits ~4.5u away and is
  // ~1u deep; a 0.1/100 range (1000:1) wastes nearly all depth-buffer precision
  // on empty space, so physically-close surfaces (forearm/thigh, clavicle/trap
  // fold, pec/ribcage) share a quantized depth and flicker as it rotates.
  // 0.5/20 (40:1) gives ~25x finer precision on the figure.
  return (
    <Canvas
      style={{ width: '100vw', height: '100vh', display: 'block', background: '#02060a' }}
      camera={{ position: [0, 1.05, 4.5], fov: 32, near: 0.5, far: 20 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
      }}
    >
      <color attach="background" args={['#02060a']} />
      <ambientLight color="#9fdcff" intensity={0.6} />
      <directionalLight color="#ffffff" position={[2, 5, 3]} intensity={1.0} />
      <pointLight color="#5be3ff" position={[-3, 2, -4]} intensity={1.8} distance={20} />

      <Suspense fallback={null}>{children}</Suspense>

      <OrbitControls
        target={[0, 1.0, 0]}
        enablePan={false}
        enableZoom
        minDistance={1.8}
        maxDistance={8}
        autoRotate
        autoRotateSpeed={0.5}
      />

      <EffectComposer>
        <Bloom intensity={0.26} luminanceThreshold={0.7} luminanceSmoothing={0.25} radius={0.6} mipmapBlur />
        <Vignette eskil={false} offset={0.32} darkness={0.88} />
      </EffectComposer>
    </Canvas>
  )
}
