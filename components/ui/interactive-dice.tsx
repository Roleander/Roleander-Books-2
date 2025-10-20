"use client"

import { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Float, Box, Sphere } from '@react-three/drei'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Zap, Sparkles } from 'lucide-react'
import * as THREE from 'three'

interface InteractiveDiceProps {
  onRollResult?: (result: number, modifier?: number) => void
  onChoiceInfluence?: (choiceIndex: number, diceResult: number) => void
  availableChoices?: Array<{ id: string, choice_text: string }>
  isVisible?: boolean
  onClose?: () => void
  diceType?: 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20'
}

interface Dice3DProps {
  result: number
  isRolling: boolean
  onRollComplete?: (result: number) => void
}

function Dice3D({ result, isRolling, onRollComplete }: Dice3DProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [rotation, setRotation] = useState([0, 0, 0])
  const [position, setPosition] = useState([0, 0, 0])

  useFrame((state) => {
    if (meshRef.current) {
      if (isRolling) {
        // Rolling animation
        meshRef.current.rotation.x += 0.1
        meshRef.current.rotation.y += 0.15
        meshRef.current.rotation.z += 0.08

        // Bounce effect
        const time = state.clock.elapsedTime
        meshRef.current.position.y = Math.sin(time * 8) * 0.2
      } else {
        // Settle to final result
        const targetRotations = {
          1: [0, 0, 0],
          2: [0, Math.PI / 2, 0],
          3: [Math.PI / 2, 0, 0],
          4: [-Math.PI / 2, 0, 0],
          5: [0, -Math.PI / 2, 0],
          6: [Math.PI, 0, 0]
        }

        const targetRotation = targetRotations[result as keyof typeof targetRotations] || [0, 0, 0]

        meshRef.current.rotation.x += (targetRotation[0] - meshRef.current.rotation.x) * 0.1
        meshRef.current.rotation.y += (targetRotation[1] - meshRef.current.rotation.y) * 0.1
        meshRef.current.rotation.z += (targetRotation[2] - meshRef.current.rotation.z) * 0.1

        meshRef.current.position.y += (0 - meshRef.current.position.y) * 0.1
      }
    }
  })

  useEffect(() => {
    if (!isRolling && result > 0) {
      setTimeout(() => {
        onRollComplete?.(result)
      }, 1000)
    }
  }, [isRolling, result, onRollComplete])

  return (
    <Float speed={2} rotationIntensity={isRolling ? 2 : 0.5} floatIntensity={isRolling ? 1 : 0.3}>
      <Box ref={meshRef} args={[1, 1, 1]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#f59e0b" roughness={0.1} metalness={0.8} />

        {/* Dice dots */}
        <Text
          position={[0, 0, 0.51]}
          fontSize={0.3}
          color="black"
          anchorX="center"
          anchorY="middle"
        >
          {result}
        </Text>

        {/* Side dots for visual effect */}
        <Text
          position={[0, 0, -0.51]}
          fontSize={0.2}
          color="black"
          anchorX="center"
          anchorY="middle"
        >
          ⚅
        </Text>
      </Box>
    </Float>
  )
}

function ParticleEffect({ isActive }: { isActive: boolean }) {
  const particlesRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (particlesRef.current && isActive) {
      particlesRef.current.rotation.y += 0.01
      particlesRef.current.children.forEach((child, index) => {
        const mesh = child as THREE.Mesh
        mesh.position.y += Math.sin(state.clock.elapsedTime * 2 + index) * 0.01
      })
    }
  })

  if (!isActive) return null

  return (
    <group ref={particlesRef}>
      {Array.from({ length: 20 }, (_, i) => (
        <Sphere key={i} args={[0.02, 8, 8]} position={[
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4
        ]}>
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
        </Sphere>
      ))}
    </group>
  )
}

export function InteractiveDice({
  onRollResult,
  onChoiceInfluence,
  availableChoices = [],
  isVisible = true,
  onClose,
  diceType = 'd20'
}: InteractiveDiceProps) {
  const [currentResult, setCurrentResult] = useState<number>(1)
  const [isRolling, setIsRolling] = useState(false)
  const [rollHistory, setRollHistory] = useState<number[]>([])
  const [modifier, setModifier] = useState(0)
  const [showParticles, setShowParticles] = useState(false)
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)

  const getDiceSides = (type: string) => {
    switch (type) {
      case 'd4': return 4
      case 'd6': return 6
      case 'd8': return 8
      case 'd10': return 10
      case 'd12': return 12
      case 'd20': return 20
      default: return 20
    }
  }

  const rollDice = () => {
    if (isRolling) return

    setIsRolling(true)
    setShowParticles(true)

    // Simulate rolling animation
    setTimeout(() => {
      const sides = getDiceSides(diceType)
      const result = Math.floor(Math.random() * sides) + 1
      setCurrentResult(result)
      setRollHistory(prev => [result, ...prev.slice(0, 4)]) // Keep last 5 rolls
      setIsRolling(false)

      setTimeout(() => {
        setShowParticles(false)
        onRollResult?.(result, modifier)

        // Auto-influence choice if one is selected
        if (selectedChoice !== null && availableChoices[selectedChoice]) {
          onChoiceInfluence?.(selectedChoice, result + modifier)
        }
      }, 1000)
    }, 2000)
  }

  const getDiceIcon = (value: number) => {
    const icons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6]
    const Icon = icons[value - 1] || Dice1
    return <Icon className="h-5 w-5" />
  }

  const getResultColor = (result: number) => {
    if (result >= 5) return 'text-green-600 bg-green-100'
    if (result >= 3) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  if (!isVisible) return null

  return (
    <Card className="w-full max-w-md mx-auto border-2 border-primary/20 shadow-xl">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">🎲 Interactive {diceType.toUpperCase()}</CardTitle>
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <CardDescription>
          Roll the dice to influence your story choices and character progression
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 3D Dice Display */}
        <div className="h-48 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg overflow-hidden relative">
          <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <pointLight position={[-10, -10, -5]} intensity={0.5} color="#fbbf24" />

            <Dice3D
              result={currentResult}
              isRolling={isRolling}
              onRollComplete={(result) => {
                console.log('Dice roll completed:', result)
              }}
            />

            <ParticleEffect isActive={showParticles} />
          </Canvas>

          {/* Result Overlay */}
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 text-center">
              <div className="text-white font-bold text-lg">
                {isRolling ? 'Rolling...' : `Result: ${currentResult + modifier}`}
              </div>
              {modifier !== 0 && (
                <div className="text-yellow-300 text-sm">
                  {modifier > 0 ? '+' : ''}{modifier} modifier
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Modifier */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Modifier:</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModifier(prev => prev - 1)}
                disabled={modifier <= -5}
              >
                -
              </Button>
              <span className="w-12 text-center font-mono">{modifier > 0 ? '+' : ''}{modifier}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModifier(prev => prev + 1)}
                disabled={modifier >= 5}
              >
                +
              </Button>
            </div>
          </div>

          {/* Roll Button */}
          <Button
            onClick={rollDice}
            disabled={isRolling}
            className="w-full h-12 text-lg font-bold"
            size="lg"
          >
            {isRolling ? (
              <>
                <Zap className="h-5 w-5 mr-2 animate-spin" />
                Rolling Dice...
              </>
            ) : (
              <>
                🎲 Roll {diceType.toUpperCase()}
              </>
            )}
          </Button>
        </div>

        {/* Choice Influence */}
        {availableChoices.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Influence Story Choice:</h4>
            <div className="space-y-2">
              {availableChoices.map((choice, index) => (
                <button
                  key={choice.id}
                  onClick={() => setSelectedChoice(index)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    selectedChoice === index
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-sm font-medium">{choice.choice_text}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Higher rolls favor this choice
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Roll History */}
        {rollHistory.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Recent Rolls:</h4>
            <div className="flex gap-2 flex-wrap">
              {rollHistory.map((roll, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className={`${getResultColor(roll)} flex items-center gap-1`}
                >
                  {getDiceIcon(roll)}
                  {roll}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button
            onClick={() => {
              setRollHistory([])
              setModifier(0)
              setSelectedChoice(null)
            }}
            variant="outline"
            className="flex-1"
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Preset configurations
export const DicePresets = {
  standard: { sides: 20, modifier: 0 },
  advantage: { sides: 20, modifier: 0, advantage: true },
  disadvantage: { sides: 20, modifier: 0, disadvantage: true },
  custom: { sides: 6, modifier: 0 },
}