"use client"

import dynamic from 'next/dynamic'

const ThreeSceneDemo = dynamic(() => import("@/components/ui/three-scene-demo").then(mod => ({ default: mod.ThreeSceneDemo })), {
  ssr: false,
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading 3D Demo...</div>
})

export default function ThreeDemoPage() {
  return <ThreeSceneDemo />
}