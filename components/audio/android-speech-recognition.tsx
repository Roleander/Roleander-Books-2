"use client"

import { useState, useEffect, useRef } from "react"

// Android-specific speech recognition fallback
interface AndroidSpeechRecognitionProps {
  onCommand: (command: string) => void
  isListening: boolean
  availableCommands: string[]
  customCommands?: { [key: string]: string }
}

export function AndroidSpeechRecognition({
  onCommand,
  isListening,
  availableCommands,
  customCommands = {},
}: AndroidSpeechRecognitionProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [confidence, setConfidence] = useState(0)
  const [lastCommand, setLastCommand] = useState("")
  const [isAndroid, setIsAndroid] = useState(false)

  const recognitionRef = useRef<any | null>(null)

  useEffect(() => {
    // Detect Android device
    const checkAndroid = () => {
      const isAndroidDevice = /Android/i.test(navigator.userAgent)
      setIsAndroid(isAndroidDevice)
      return isAndroidDevice
    }

    const android = checkAndroid()

    if (android) {
      // Check for Android WebView or Cordova environment
      const isCordova = !!(window as any).cordova
      const isWebView = !!(window as any).webkit?.messageHandlers

      if (isCordova || isWebView) {
        // Use native Android speech recognition
        setIsSupported(true)
        initializeAndroidSpeechRecognition()
      } else {
        // Fallback to Web Speech API with Android optimizations
        initializeWebSpeechForAndroid()
      }
    }
  }, [])

  const initializeAndroidSpeechRecognition = () => {
    // For Cordova/PhoneGap apps
    if ((window as any).plugins?.speechRecognition) {
      const speechRecognition = (window as any).plugins.speechRecognition

      recognitionRef.current = {
        startListening: () => {
          const options = {
            language: 'en-US',
            matches: 5,
            prompt: 'Speak now',
            showPopup: false,
            showPartial: false
          }

          speechRecognition.startListening(
            (matches: string[]) => {
              console.log('[Android] Speech matches:', matches)
              if (matches && matches.length > 0) {
                const bestMatch = matches[0]
                setTranscript(bestMatch)
                setConfidence(0.8) // Cordova plugin doesn't provide confidence
                processAndroidCommand(bestMatch)
              }
            },
            (error: any) => {
              console.error('[Android] Speech recognition error:', error)
              setIsRecording(false)
            },
            options
          )
        },
        stopListening: () => {
          speechRecognition.stopListening()
        },
        isSupported: () => {
          return speechRecognition.isRecognitionAvailable()
        }
      }
    }
  }

  const initializeWebSpeechForAndroid = () => {
    // Web Speech API optimized for Android browsers
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition) {
      setIsSupported(true)

      recognitionRef.current = new SpeechRecognition()
      const recognition = recognitionRef.current

      // Android-specific optimizations
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'
      recognition.maxAlternatives = 3

      recognition.onstart = () => {
        console.log("[Android Web] Voice recognition started")
        setIsRecording(true)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[0]
        const transcript = result[0].transcript
        const confidence = result[0].confidence || 0.7

        console.log("[Android Web] Result:", transcript, "Confidence:", confidence)
        setTranscript(transcript)
        setConfidence(confidence)

        if (result.isFinal) {
          setLastCommand(transcript)
          processAndroidCommand(transcript)
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("[Android Web] Speech recognition error:", event.error)
        setIsRecording(false)

        // Retry on network errors
        if (event.error === 'network' && isListening) {
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
              try {
                recognitionRef.current.start()
              } catch (retryError) {
                console.error("[Android Web] Retry failed:", retryError)
              }
            }
          }, 2000)
        }
      }

      recognition.onend = () => {
        console.log("[Android Web] Voice recognition ended")
        setIsRecording(false)

        // Auto-restart for continuous listening
        if (isListening) {
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
              try {
                recognitionRef.current.start()
              } catch (error) {
                console.error("[Android Web] Restart failed:", error)
              }
            }
          }, 1000)
        }
      }
    }
  }

  const processAndroidCommand = (transcript: string) => {
    const lowerTranscript = transcript.toLowerCase().trim()

    // Check custom commands first
    for (const [customCmd, action] of Object.entries(customCommands)) {
      if (lowerTranscript.includes(customCmd.toLowerCase())) {
        onCommand(action)
        return
      }
    }

    // Enhanced command matching for Android
    const commandMap: { [key: string]: string[] } = {
      play: ["play", "start", "begin", "resume", "go"],
      pause: ["pause", "stop", "halt", "wait"],
      back: ["back", "previous", "rewind", "backward", "earlier"],
      forward: ["forward", "next", "skip", "ahead", "fast forward"],
      "volume up": ["volume up", "louder", "increase volume", "turn up"],
      "volume down": ["volume down", "quieter", "decrease volume", "turn down"],
    }

    // Check standard commands
    for (const [command, synonyms] of Object.entries(commandMap)) {
      if (synonyms.some((synonym) => lowerTranscript.includes(synonym))) {
        onCommand(command)
        return
      }
    }

    // Check available commands
    const matchingCommand = availableCommands.find((cmd) => {
      const cmdLower = cmd.toLowerCase()
      return lowerTranscript.includes(cmdLower) || cmdLower.includes(lowerTranscript)
    })

    if (matchingCommand) {
      onCommand(matchingCommand)
      return
    }

    // Fallback
    onCommand(transcript)
  }

  useEffect(() => {
    if (!recognitionRef.current || !isSupported) return

    if (isListening && !isRecording) {
      try {
        if (recognitionRef.current.startListening) {
          // Cordova plugin
          recognitionRef.current.startListening()
        } else {
          // Web Speech API
          recognitionRef.current.start()
        }
      } catch (error) {
        console.error("[Android] Error starting recognition:", error)
      }
    } else if (!isListening && isRecording) {
      try {
        if (recognitionRef.current.stopListening) {
          // Cordova plugin
          recognitionRef.current.stopListening()
        } else {
          // Web Speech API
          recognitionRef.current.stop()
        }
      } catch (error) {
        console.error("[Android] Error stopping recognition:", error)
      }
    }
  }, [isListening, isSupported, isRecording])

  // Only render on Android devices
  if (!isAndroid || !isSupported) {
    return null
  }

  return (
    <div className="android-speech-recognition">
      {transcript && (
        <div className="mb-2 p-2 bg-blue-50 rounded text-sm">
          <span className="font-medium">Android Speech:</span> {transcript}
          {confidence > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({Math.round(confidence * 100)}%)
            </span>
          )}
        </div>
      )}
      {lastCommand && (
        <div className="mb-2 p-2 bg-green-50 rounded text-sm">
          <span className="font-medium">Processed:</span> {lastCommand}
        </div>
      )}
    </div>
  )
}

// Type definitions for Android/Cordova
declare global {
  interface Window {
    cordova: any
    plugins: {
      speechRecognition: {
        startListening: (success: (matches: string[]) => void, error: (error: any) => void, options: any) => void
        stopListening: () => void
        isRecognitionAvailable: () => Promise<boolean>
      }
    }
    webkit: {
      messageHandlers: any
    }
  }
}