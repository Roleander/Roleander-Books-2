"use client"

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Float, Sphere, Box, Torus } from '@react-three/drei'
import { useRef, useState, useEffect, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ThreeSceneProps {
  width?: number
  height?: number
  interactive?: boolean
  showControls?: boolean
}

function AnimatedSphere({ position, color }: { position: [number, number, number], color: string }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.3
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2
    }
  })

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={0.5}>
      <Sphere ref={meshRef} position={position} args={[0.5, 32, 32]}>
        <meshStandardMaterial color={color} roughness={0.1} metalness={0.8} />
      </Sphere>
    </Float>
  )
}

function AnimatedCube({ position, color }: { position: [number, number, number], color: string }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01
      meshRef.current.rotation.y += 0.01
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.2
    }
  })

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.3}>
      <Box ref={meshRef} position={position} args={[0.8, 0.8, 0.8]}>
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.6} />
      </Box>
    </Float>
  )
}

function AnimatedTorus({ position, color }: { position: [number, number, number], color: string }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.5
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.3
    }
  })

  return (
    <Float speed={1} rotationIntensity={0.8} floatIntensity={0.4}>
      <Torus ref={meshRef} position={position} args={[0.6, 0.2, 16, 32]}>
        <meshStandardMaterial color={color} roughness={0.1} metalness={0.9} />
      </Torus>
    </Float>
  )
}

function SceneContent({ interactive }: { interactive: boolean }) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#6366f1" />

      {/* 3D Objects */}
      <AnimatedSphere position={[-2, 0, 0]} color="#6366f1" />
      <AnimatedCube position={[2, 0, 0]} color="#8b5cf6" />
      <AnimatedTorus position={[0, 1.5, 0]} color="#f59e0b" />

      {/* Interactive elements */}
      {interactive && (
        <Text
          position={[0, -2, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          Tap to interact
        </Text>
      )}
    </>
  )
}

export function ThreeScene({
  width = 300,
  height = 300,
  interactive = false,
  showControls = false
}: ThreeSceneProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [webglSupported, setWebglSupported] = useState(true)

  // Check WebGL support on mount
  useEffect(() => {
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        setWebglSupported(!!gl)
      } catch (e) {
        setWebglSupported(false)
      }
    }
    checkWebGL()
  }, [])

  // Fallback UI for when 3D fails or WebGL not supported
  if (hasError || !webglSupported) {
    return (
      <div
        className="rounded-lg overflow-hidden border border-border bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center"
        style={{ width, height }}
      >
        <div className="text-center text-white/70 p-4">
          <div className="text-2xl mb-2">🎮</div>
          <div className="text-sm">3D Scene Unavailable</div>
          {!webglSupported && <div className="text-xs mt-1">WebGL not supported</div>}
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg overflow-hidden border border-border"
      style={{ width, height }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Suspense
        fallback={
          <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
            <div className="text-white/70 text-sm">Loading 3D...</div>
          </div>
        }
      >
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
          onError={(error) => {
            console.error('ThreeScene Canvas error:', error)
            setHasError(true)
          }}
          onCreated={({ gl }) => {
            try {
              gl.setClearColor('#0f172a')
              gl.shadowMap.enabled = false
              // Additional error handling for WebGL context
              const context = gl.getContext()
              if (context) {
                context.getExtension('WEBGL_lose_context')
              }
            } catch (e) {
              console.warn('WebGL context setup failed:', e)
              setHasError(true)
            }
          }}
          gl={{
            antialias: false,
            alpha: false,
            powerPreference: "default",
            failIfMajorPerformanceCaveat: false,
            stencil: false,
            depth: true
          }}
          dpr={[1, 2]}
          frameloop="always"
        >
          <SceneContent interactive={interactive} />
          {showControls && <OrbitControls enableZoom={true} enablePan={false} />}
        </Canvas>
      </Suspense>

      {interactive && (
        <div className="absolute bottom-2 left-2 right-2">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2 text-xs text-white text-center">
            {isHovered ? '🎮 Interactive 3D Scene' : '🎨 3D Audiobook Companion'}
          </div>
        </div>
      )}
    </div>
  )
}

// Preset configurations for different use cases
export const ThreeScenePresets = {
  compact: { width: 200, height: 200, interactive: false, showControls: false },
  interactive: { width: 300, height: 300, interactive: true, showControls: false },
  full: { width: 400, height: 400, interactive: true, showControls: true },
  minimal: { width: 150, height: 150, interactive: false, showControls: false },
}