"use client"

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Float, Sphere, Box, Torus } from '@react-three/drei'
import { useRef, useState } from 'react'
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

  return (
    <div
      className="rounded-lg overflow-hidden border border-border"
      style={{ width, height }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
      >
        <SceneContent interactive={interactive} />
        {showControls && <OrbitControls enableZoom={true} enablePan={false} />}
      </Canvas>

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