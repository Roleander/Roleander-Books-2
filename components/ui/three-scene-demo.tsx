"use client"

import { ThreeScene, ThreeScenePresets } from './three-scene'

export function ThreeSceneDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            🎮 3D Animated Companion Demo
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience the immersive 3D visual companion for your interactive audiobooks.
            This demo showcases the floating animated objects that appear alongside your audio content.
          </p>
        </div>

        {/* Main Demo Section */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Interactive 3D Scene */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">🎨 Interactive 3D Scene</h2>
            <p className="text-muted-foreground">
              This is the main 3D companion that appears in your audiobook player.
              Watch the animated sphere, cube, and torus float and rotate with metallic materials.
              Now includes interactive dice rolling for RPG gameplay!
            </p>
            <div className="bg-card rounded-lg p-4 border">
              <ThreeScene {...ThreeScenePresets.interactive} />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✨ <strong>Features:</strong> Floating animations, metallic materials, smooth rotations</p>
              <p>🎲 <strong>New Feature:</strong> Interactive dice rolling system integrated</p>
              <p>🎤 <strong>Voice Commands:</strong> Try saying "show 3d", "3d scene", or "roll dice"</p>
              <p>📱 <strong>Integration:</strong> Appears above book covers in audio player</p>
            </div>
          </div>

          {/* Compact Version */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">📏 Compact Version</h2>
            <p className="text-muted-foreground">
              Smaller version for secondary displays or mobile interfaces.
              Perfect for thumbnails or smaller UI elements.
            </p>
            <div className="bg-card rounded-lg p-4 border flex justify-center">
              <ThreeScene {...ThreeScenePresets.compact} />
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>📐 <strong>Size:</strong> 200x200px - perfect for mobile</p>
              <p>⚡ <strong>Performance:</strong> Optimized for smaller screens</p>
              <p>🎯 <strong>Use Case:</strong> Thumbnails, notifications, or compact displays</p>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-card rounded-lg p-6 border">
          <h2 className="text-2xl font-semibold mb-4">🛠 Technical Implementation</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold text-primary mb-2">🎭 3D Technologies</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>Three.js:</strong> Professional 3D rendering engine</li>
                <li>• <strong>React Three Fiber:</strong> React renderer for Three.js</li>
                <li>• <strong>React Three Drei:</strong> Useful 3D helpers and components</li>
                <li>• <strong>TypeScript:</strong> Full type safety and IntelliSense</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-primary mb-2">🎨 Visual Features</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>Metallic Materials:</strong> Realistic surface reflections</li>
                <li>• <strong>Floating Animations:</strong> Smooth up/down movements</li>
                <li>• <strong>Rotational Motion:</strong> Continuous object rotation</li>
                <li>• <strong>Dynamic Lighting:</strong> Ambient and directional lights</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Audio Player Mockup */}
        <div className="bg-card rounded-lg p-6 border">
          <h2 className="text-2xl font-semibold mb-4">🎵 Audio Player Integration</h2>
          <p className="text-muted-foreground mb-4">
            This is how the 3D companion appears in your audiobook player interface.
            The animated scene sits prominently above the book cover, creating an immersive visual experience.
          </p>

          <div className="bg-gradient-to-r from-background to-accent/10 rounded-lg p-6 border-2 border-dashed border-primary/20">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* 3D Scene Area */}
              <div className="w-full lg:w-80 flex-shrink-0">
                <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-accent/20 to-primary/20 shadow-lg relative border-2 border-primary/30">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ThreeScene {...ThreeScenePresets.interactive} />
                  </div>
                  <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
                    <span className="text-xs text-white font-medium">🎮 3D Companion</span>
                  </div>
                </div>
                {/* Book Cover Placeholder */}
                <div className="mt-4 aspect-video rounded-lg bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                  <div className="text-center text-muted-foreground">
                    <div className="text-2xl mb-2">📚</div>
                    <div className="text-sm">Book Cover</div>
                  </div>
                </div>
              </div>

              {/* Player Controls Mockup */}
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>0:00</span>
                    <span>15:30</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <div className="w-12 h-12 bg-muted rounded-full animate-pulse"></div>
                  <div className="w-16 h-16 bg-primary rounded-full animate-pulse"></div>
                  <div className="w-12 h-12 bg-muted rounded-full animate-pulse"></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-muted rounded animate-pulse"></div>
                    <div className="w-20 h-4 bg-muted rounded animate-pulse"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-12 h-8 bg-muted rounded animate-pulse"></div>
                    <div className="w-12 h-8 bg-muted rounded animate-pulse"></div>
                    <div className="w-12 h-8 bg-muted rounded animate-pulse"></div>
                  </div>
                  <div className="w-12 h-8 bg-primary rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Voice Commands */}
        <div className="bg-card rounded-lg p-6 border">
          <h2 className="text-2xl font-semibold mb-4">🎤 Voice Commands</h2>
          <p className="text-muted-foreground mb-4">
            The 3D companion responds to voice commands. Try these in your audiobook player:
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🎤</span>
              </div>
              <div>
                <div className="font-medium">"Show 3D"</div>
                <div className="text-sm text-muted-foreground">Acknowledges the 3D scene</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🎤</span>
              </div>
              <div>
                <div className="font-medium">"3D Scene"</div>
                <div className="text-sm text-muted-foreground">Interacts with the companion</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🎤</span>
              </div>
              <div>
                <div className="font-medium">"Companion"</div>
                <div className="text-sm text-muted-foreground">Addresses the 3D element</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🎤</span>
              </div>
              <div>
                <div className="font-medium">All Audio Commands</div>
                <div className="text-sm text-muted-foreground">Play, pause, volume, speed controls</div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center space-y-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-8 border">
          <h2 className="text-2xl font-semibold">🚀 Ready to Experience?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Your 3D animated companion is now integrated into your audiobook player.
            Navigate to any chapter at <strong>http://localhost:3000</strong> to see it in action!
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/library"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              📚 Go to Library
            </a>
            <a
              href="/profile"
              className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
            >
              👤 View Character Sheet
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}