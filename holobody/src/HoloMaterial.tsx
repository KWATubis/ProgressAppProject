import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import vert from './shaders/holo.vert.glsl'
import frag from './shaders/holo.frag.glsl'

export function useHoloMaterial(color = '#5be3ff') {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uTime:          { value: 0 },
        uColor:         { value: new THREE.Color(color) },
        uFresnelPower:  { value: 2.0 },
        uScanSpeed:     { value: 0.15 },
        uScanStrength:  { value: 0.3 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    })
  }, [color])

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
  })

  return material
}

export function useWireframeMaterial(color = '#bff7ff') {
  return useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [color])
}
