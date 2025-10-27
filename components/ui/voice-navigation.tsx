"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Mic, MicOff, Navigation, Settings, Volume2 } from 'lucide-react'
import { VoiceRecognition } from '@/components/audio/voice-recognition'
import { useRouter } from 'next/navigation'

interface VoiceNavigationProps {
  isEnabled: boolean
  onToggle: (enabled: boolean) => void
}

export function VoiceNavigation({ isEnabled, onToggle }: VoiceNavigationProps) {
  const [isListening, setIsListening] = useState(false)
  const [lastCommand, setLastCommand] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const router = useRouter()

  // Navigation commands mapping
  const navigationCommands = {
    // Main sections
    'go to library': '/library',
    'open library': '/library',
    'show library': '/library',
    'library': '/library',

    'go to profile': '/profile',
    'open profile': '/profile',
    'show profile': '/profile',
    'profile': '/profile',
    'my profile': '/profile',

    'go to admin': '/admin',
    'open admin': '/admin',
    'show admin': '/admin',
    'admin': '/admin',
    'admin panel': '/admin',

    'go to subscription': '/subscription',
    'open subscription': '/subscription',
    'show subscription': '/subscription',
    'subscription': '/subscription',
    'billing': '/subscription',

    'go home': '/',
    'home': '/',
    'main page': '/',

    // Series navigation
    'browse series': '/series',
    'show series': '/series',
    'series': '/series',

    // Auth pages
    'login': '/auth/login',
    'sign in': '/auth/login',
    'log in': '/auth/login',

    'signup': '/auth/signup',
    'sign up': '/auth/signup',
    'register': '/auth/signup',
    'create account': '/auth/signup',

    'check email': '/auth/check-email',
    'verify email': '/auth/check-email',

    // Demo pages
    '3d demo': '/three-demo',
    'show 3d demo': '/three-demo',
    'three demo': '/three-demo',
    'demo': '/three-demo',

    // Voice control commands
    'start voice navigation': 'enable',
    'enable voice navigation': 'enable',
    'stop voice navigation': 'disable',
    'disable voice navigation': 'disable',
    'turn off voice': 'disable',
    'turn on voice': 'disable',
  }

  const handleVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase().trim()
    setLastCommand(command)
    setCommandHistory(prev => [command, ...prev.slice(0, 4)]) // Keep last 5 commands

    console.log('[VoiceNav] Processing command:', lowerCommand)

    // Check for navigation commands
    for (const [navCommand, route] of Object.entries(navigationCommands)) {
      if (lowerCommand.includes(navCommand) ||
          navCommand.includes(lowerCommand) ||
          levenshteinDistance(lowerCommand, navCommand) <= 2) {

        if (route === 'enable') {
          onToggle(true)
          setLastCommand(`Voice navigation enabled`)
          return
        }

        if (route === 'disable') {
          onToggle(false)
          setIsListening(false)
          setLastCommand(`Voice navigation disabled`)
          return
        }

        console.log('[VoiceNav] Navigating to:', route)
        router.push(route)
        setLastCommand(`Navigating to ${navCommand}`)
        return
      }
    }

    // Fallback for unrecognized commands
    setLastCommand(`Command not recognized: "${command}"`)
    console.log('[VoiceNav] Unrecognized command:', command)
  }

  // Simple Levenshtein distance for fuzzy matching
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = []
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        }
      }
    }
    return matrix[str2.length][str1.length]
  }

  const toggleListening = () => {
    if (!isEnabled) {
      onToggle(true)
    }
    setIsListening(!isListening)
  }

  // Auto-disable listening when voice navigation is turned off
  useEffect(() => {
    if (!isEnabled) {
      setIsListening(false)
    }
  }, [isEnabled])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Navigation className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Voice Navigation</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="voice-nav-toggle" className="text-sm">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </Label>
            <Switch
              id="voice-nav-toggle"
              checked={isEnabled}
              onCheckedChange={onToggle}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEnabled && (
          <>
            {/* Voice Control Button */}
            <div className="flex items-center justify-center">
              <Button
                onClick={toggleListening}
                size="lg"
                className={`h-16 w-16 rounded-full ${
                  isListening ? 'bg-red-500 hover:bg-red-600' : ''
                }`}
              >
                {isListening ? (
                  <Mic className="h-6 w-6" />
                ) : (
                  <MicOff className="h-6 w-6" />
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              {isListening ? 'Listening for navigation commands...' : 'Tap to start voice navigation'}
            </div>

            {/* Voice Recognition Component */}
            <VoiceRecognition
              onCommand={handleVoiceCommand}
              isListening={isListening}
              availableCommands={Object.keys(navigationCommands)}
            />

            {/* Last Command Feedback */}
            {lastCommand && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Last Command:</span>
                </div>
                <p className="text-sm">{lastCommand}</p>
              </div>
            )}

            {/* Command History */}
            {commandHistory.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Recent Commands:</h4>
                <div className="space-y-1">
                  {commandHistory.map((cmd, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {cmd}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Available Commands */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Available Voice Commands:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.keys(navigationCommands).slice(0, 12).map((command, index) => (
              <Badge key={index} variant="outline" className="justify-center py-1 text-xs">
                "{command}"
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Say any of these commands to navigate around the app. Voice navigation must be enabled first.
          </p>
        </div>

        {/* Settings */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Voice Navigation Settings</span>
            </div>
            <Badge variant={isEnabled ? "default" : "secondary"}>
              {isEnabled ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Enable voice navigation to use voice commands for app navigation.
            This works alongside existing audio player voice controls.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Hook for managing voice navigation state
export function useVoiceNavigation() {
  const [isEnabled, setIsEnabled] = useState(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('voice-navigation-enabled') === 'true'
    }
    return false
  })

  const toggleVoiceNavigation = (enabled: boolean) => {
    setIsEnabled(enabled)
    if (typeof window !== 'undefined') {
      localStorage.setItem('voice-navigation-enabled', enabled.toString())
    }
  }

  return {
    isEnabled,
    toggleVoiceNavigation
  }
}