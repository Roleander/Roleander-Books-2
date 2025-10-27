"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Sparkles, Volume2 } from 'lucide-react'

interface SplashScreenProps {
  onComplete: () => void
  duration?: number
  showProgress?: boolean
}

export function SplashScreen({ onComplete, duration = 3000, showProgress = true }: SplashScreenProps) {
  const [progress, setProgress] = useState(0)
  const [currentText, setCurrentText] = useState(0)

  const loadingTexts = [
    "Loading your audiobook adventure...",
    "Preparing immersive audio experience...",
    "Initializing 3D companions...",
    "Setting up voice commands...",
    "Ready for your story journey!"
  ]

  useEffect(() => {
    // Check if user has visited before and skip splash if they have
    const hasVisited = localStorage.getItem('roleander-visited')
    const skipDuration = hasVisited ? Math.min(duration * 0.3, 1000) : duration // 30% faster or max 1s for returning users

    const startTime = Date.now()
    const endTime = startTime + skipDuration

    const updateProgress = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const newProgress = Math.min((elapsed / skipDuration) * 100, 100)

      setProgress(newProgress)

      // Update loading text based on progress
      const textIndex = Math.floor((newProgress / 100) * loadingTexts.length)
      setCurrentText(Math.min(textIndex, loadingTexts.length - 1))

      if (newProgress < 100) {
        requestAnimationFrame(updateProgress)
      } else {
        // Mark as visited for future visits
        localStorage.setItem('roleander-visited', 'true')

        // Add a small delay before completing
        setTimeout(() => {
          onComplete()
        }, 500)
      }
    }

    requestAnimationFrame(updateProgress)
  }, [duration, onComplete])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5"
      >
        <div className="text-center space-y-8 max-w-md mx-auto px-6">
          {/* Logo/Brand Section */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            <div className="relative">
              <motion.div
                animate={{
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full shadow-lg"
              >
                <BookOpen className="w-10 h-10 text-primary-foreground" />
              </motion.div>

              {/* Floating sparkles */}
              <motion.div
                animate={{
                  y: [-10, 10, -10],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="w-6 h-6 text-accent" />
              </motion.div>

              <motion.div
                animate={{
                  y: [10, -10, 10],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
                className="absolute -bottom-2 -left-2"
              >
                <Volume2 className="w-5 h-5 text-primary" />
              </motion.div>
            </div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            >
              Roleander
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-muted-foreground"
            >
              Interactive Audiobooks
            </motion.p>
          </motion.div>

          {/* Loading Animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="space-y-6"
          >
            {/* Animated dots */}
            <div className="flex justify-center space-x-2">
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: index * 0.2,
                    ease: "easeInOut"
                  }}
                  className="w-3 h-3 bg-primary rounded-full"
                />
              ))}
            </div>

            {/* Loading Text */}
            <motion.div
              key={currentText}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-muted-foreground min-h-[1.25rem]"
            >
              {loadingTexts[currentText]}
            </motion.div>

            {/* Progress Bar */}
            {showProgress && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1 }}
                className="space-y-2"
              >
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    style={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  {Math.round(progress)}%
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Feature Highlights */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="grid grid-cols-3 gap-4 text-center"
          >
            {[
              { icon: "🎲", label: "RPG Dice" },
              { icon: "🎤", label: "Voice Control" },
              { icon: "🎮", label: "3D Scenes" }
            ].map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  duration: 0.4,
                  delay: 1.4 + index * 0.1,
                  type: "spring",
                  stiffness: 200
                }}
                className="space-y-1"
              >
                <div className="text-2xl">{feature.icon}</div>
                <div className="text-xs text-muted-foreground">{feature.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Hook for managing splash screen state
export function useSplashScreen() {
  const [isVisible, setIsVisible] = useState(true)

  const hideSplash = () => {
    setIsVisible(false)
  }

  return {
    isVisible,
    hideSplash
  }
}

// Provider component for app-wide splash screen management
export function SplashScreenProvider({ children }: { children: React.ReactNode }) {
  const { isVisible, hideSplash } = useSplashScreen()

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <SplashScreen
            onComplete={hideSplash}
            duration={3500}
            showProgress={true}
          />
        )}
      </AnimatePresence>
      {children}
    </>
  )
}

// Utility function to manually trigger splash screen (useful for page transitions)
export function showSplashScreen(duration = 2000) {
  return new Promise<void>((resolve) => {
    // Create a temporary splash overlay
    const splashContainer = document.createElement('div')
    splashContainer.id = 'temp-splash'
    splashContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999;
      background: linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--accent)/0.05) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-sans);
    `

    splashContainer.innerHTML = `
      <div style="text-align: center; color: hsl(var(--foreground));">
        <div style="font-size: 3rem; margin-bottom: 1rem;">🎲</div>
        <div style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">Roleander</div>
        <div style="font-size: 0.875rem; opacity: 0.7;">Loading...</div>
      </div>
    `

    document.body.appendChild(splashContainer)

    setTimeout(() => {
      if (splashContainer.parentNode) {
        splashContainer.remove()
      }
      resolve()
    }, duration)
  })
}