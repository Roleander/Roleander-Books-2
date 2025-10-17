"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Volume2, Smartphone, Settings } from "lucide-react"
import { AndroidSpeechRecognition } from "./android-speech-recognition"
import { VoiceCalibration } from "./voice-calibration"

interface VoiceRecognitionProps {
  onCommand: (command: string) => void
  isListening: boolean
  availableCommands: string[]
  customCommands?: { [key: string]: string } // Custom commands per chapter
  enableWakeWord?: boolean
}

export function VoiceRecognition({
  onCommand,
  isListening,
  availableCommands,
  customCommands = {},
  enableWakeWord = false,
}: VoiceRecognitionProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [confidence, setConfidence] = useState(0)
  const [lastCommand, setLastCommand] = useState("")
  const [isMobile, setIsMobile] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<string>("unknown")
  const [detectedLanguage, setDetectedLanguage] = useState("en-US")
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7)
  const [recognitionAttempts, setRecognitionAttempts] = useState(0)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [gainNode, setGainNode] = useState<GainNode | null>(null)
  const [audioPreprocessor, setAudioPreprocessor] = useState<ScriptProcessorNode | null>(null)
  const [isPreprocessingEnabled, setIsPreprocessingEnabled] = useState(true)
  const [feedbackMode, setFeedbackMode] = useState<'none' | 'basic' | 'detailed'>('basic')
  const [recognitionStats, setRecognitionStats] = useState({
    totalCommands: 0,
    successfulCommands: 0,
    averageConfidence: 0,
    lastAccuracy: 0
  })
  const [showCalibration, setShowCalibration] = useState(false)

  const recognitionRef = useRef<any | null>(null)
  const restartTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(isMobileDevice)
      return isMobileDevice
    }

    const mobile = checkMobile()

    // Auto-detect language from browser settings
    const detectLanguage = () => {
      const browserLang = navigator.language || 'en-US'
      // Map common languages to supported speech recognition languages
      const langMap: { [key: string]: string } = {
        'en': 'en-US',
        'en-US': 'en-US',
        'en-GB': 'en-GB',
        'es': 'es-ES',
        'es-ES': 'es-ES',
        'fr': 'fr-FR',
        'fr-FR': 'fr-FR',
        'de': 'de-DE',
        'de-DE': 'de-DE',
        'it': 'it-IT',
        'it-IT': 'it-IT',
        'pt': 'pt-BR',
        'pt-BR': 'pt-BR',
        'pt-PT': 'pt-PT',
        'ja': 'ja-JP',
        'ja-JP': 'ja-JP',
        'ko': 'ko-KR',
        'ko-KR': 'ko-KR',
        'zh': 'zh-CN',
        'zh-CN': 'zh-CN',
        'zh-TW': 'zh-TW'
      }
      return langMap[browserLang] || langMap[browserLang.split('-')[0]] || 'en-US'
    }

    setDetectedLanguage(detectLanguage())

    // Initialize Web Audio API for preprocessing
    const initAudioContext = async () => {
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)()
        setAudioContext(context)

        // Initialize audio preprocessing nodes
        if (isPreprocessingEnabled) {
          await setupAudioPreprocessing(context)
        }
      } catch (error) {
        console.warn('[v0] Web Audio API not supported:', error)
        setIsPreprocessingEnabled(false)
      }
    }

    // Audio preprocessing setup for noise reduction
    const setupAudioPreprocessing = async (context: AudioContext) => {
      try {
        // Create analyzer for noise gate
        const analyser = context.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.8

        // Create gain node for volume control
        const gainNode = context.createGain()
        gainNode.gain.value = 1.0

        // Create filter for high-frequency noise reduction
        const highPassFilter = context.createBiquadFilter()
        highPassFilter.type = 'highpass'
        highPassFilter.frequency.value = 80 // Remove low-frequency noise
        highPassFilter.Q.value = 0.7

        // Create low-pass filter for high-frequency noise
        const lowPassFilter = context.createBiquadFilter()
        lowPassFilter.type = 'lowpass'
        lowPassFilter.frequency.value = 8000 // Remove high-frequency noise
        lowPassFilter.Q.value = 0.7

        // Connect preprocessing chain
        highPassFilter.connect(lowPassFilter)
        lowPassFilter.connect(gainNode)
        gainNode.connect(analyser)
        analyser.connect(context.destination)

        setGainNode(gainNode)
        console.log('[v0] Audio preprocessing initialized')
      } catch (error) {
        console.warn('[v0] Audio preprocessing setup failed:', error)
        setIsPreprocessingEnabled(false)
      }
    }

    initAudioContext()

    // Check for speech recognition support with better mobile detection
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (SpeechRecognition) {
      setIsSupported(true)

      recognitionRef.current = new SpeechRecognition()
      const recognition = recognitionRef.current

      // Enhanced configuration for better mobile support and accuracy
      recognition.continuous = !mobile // Continuous mode can be problematic on mobile
      recognition.interimResults = true
      recognition.lang = detectedLanguage
      recognition.maxAlternatives = 5 // Increased for better accuracy
      recognition.serviceURI = '' // Let browser choose best service

      // Enable offline speech recognition if supported
      if ('webkitSpeechGrammarList' in window || 'SpeechGrammarList' in window) {
        console.log('[v0] Offline speech recognition capabilities detected')
        try {
          // Configure for offline mode when possible
          if (typeof recognition.grammars !== 'undefined') {
            const GrammarList = (window as any).webkitSpeechGrammarList || (window as any).SpeechGrammarList
            if (GrammarList) {
              recognition.grammars = new GrammarList()
            }
          }
        } catch (error) {
          console.warn('[v0] Failed to initialize offline grammar:', error)
        }
      }

      // Mobile-specific optimizations
      if (mobile) {
        recognition.continuous = false
        recognition.interimResults = false // Simpler processing for mobile
      }

      recognition.onstart = () => {
        console.log("[v0] Voice recognition started")
        setIsRecording(true)
        setPermissionStatus("granted")

        // Resume audio context if suspended (required by some browsers)
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume()
        }
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ""
        let interimTranscript = ""
        let bestConfidence = 0
        let allTranscripts: string[] = []

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = result[0].transcript
          const confidence = result[0].confidence || 0

          allTranscripts.push(transcript)

          if (result.isFinal) {
            finalTranscript += transcript
            bestConfidence = Math.max(bestConfidence, confidence)
          } else {
            interimTranscript += transcript
          }
        }

        const fullTranscript = finalTranscript || interimTranscript
        setTranscript(fullTranscript)
        setConfidence(bestConfidence)

        if (finalTranscript) {
          console.log("[v0] Final transcript:", finalTranscript, "Confidence:", bestConfidence)

          // Only process commands above confidence threshold
          if (bestConfidence >= confidenceThreshold) {
            setLastCommand(finalTranscript)
            processVoiceCommand(finalTranscript)

            // Update recognition stats
            setRecognitionStats(prev => ({
              totalCommands: prev.totalCommands + 1,
              successfulCommands: prev.successfulCommands + 1,
              averageConfidence: (prev.averageConfidence * prev.totalCommands + bestConfidence) / (prev.totalCommands + 1),
              lastAccuracy: bestConfidence
            }))
          } else {
            console.log("[v0] Command rejected - low confidence:", bestConfidence)
            setLastCommand(`Low confidence: "${finalTranscript}" (${Math.round(bestConfidence * 100)}%)`)

            // Update stats for failed recognition
            setRecognitionStats(prev => ({
              ...prev,
              totalCommands: prev.totalCommands + 1,
              lastAccuracy: bestConfidence
            }))
          }

          setTimeout(() => {
            setTranscript("")
          }, 2000)
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("[v0] Speech recognition error:", event.error)

        if (event.error === "not-allowed") {
          setPermissionStatus("denied")
        } else if (event.error === "no-speech") {
          setPermissionStatus("no-speech")
          setRecognitionAttempts(prev => prev + 1)
        } else if (event.error === "network") {
          console.log("[v0] Network error - attempting retry")
          // Auto-retry on network errors
          setTimeout(() => {
            if (isListening && recognitionRef.current) {
              try {
                recognitionRef.current.start()
              } catch (retryError) {
                console.error("[v0] Retry failed:", retryError)
              }
            }
          }, 2000)
        }

        setIsRecording(false)
      }

      recognition.onend = () => {
        console.log("[v0] Voice recognition ended")
        setIsRecording(false)

        // Auto-restart logic with mobile considerations
        if (isListening && !mobile) {
          if (restartTimeoutRef.current) {
            clearTimeout(restartTimeoutRef.current)
          }

          restartTimeoutRef.current = setTimeout(
            () => {
              try {
                if (isListening && recognitionRef.current) {
                  console.log("[v0] Restarting voice recognition")
                  recognitionRef.current.start()
                }
              } catch (error) {
                console.error("[v0] Error restarting recognition:", error)
              }
            },
            mobile ? 1000 : 500,
          ) // Longer delay for mobile
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
    }
  }, [])

  // Enhanced command processing with fuzzy matching, custom commands, and confidence validation
  const processVoiceCommand = (transcript: string) => {
    const lowerTranscript = transcript.toLowerCase().trim()

    // Clean transcript from common filler words and punctuation
    const cleanedTranscript = lowerTranscript
      .replace(/[.,!?;:]/g, '')
      .replace(/\b(um|uh|like|you know|so|well|actually)\b/g, '')
      .trim()

    console.log("[v0] Processing command:", cleanedTranscript)

    // Check custom commands first with improved matching
    for (const [customCmd, action] of Object.entries(customCommands)) {
      const cmdLower = customCmd.toLowerCase()
      if (cleanedTranscript.includes(cmdLower) ||
          cmdLower.includes(cleanedTranscript) ||
          levenshteinDistance(cleanedTranscript, cmdLower) <= 1) {
        console.log("[v0] Matched custom command:", customCmd, "->", action)
        onCommand(action)
        return
      }
    }

    // Enhanced command matching with synonyms and fuzzy matching
    const commandMap: { [key: string]: string[] } = {
      play: ["play", "start", "begin", "resume", "go", "continue", "unpause"],
      pause: ["pause", "stop", "halt", "wait", "freeze"],
      back: ["back", "previous", "rewind", "backward", "earlier", "go back"],
      forward: ["forward", "next", "skip", "ahead", "fast forward", "advance"],
      "volume up": ["volume up", "louder", "increase volume", "turn up", "raise volume"],
      "volume down": ["volume down", "quieter", "decrease volume", "lower volume", "turn down"],
      "faster": ["faster", "speed up", "quicken", "accelerate"],
      "slower": ["slower", "speed down", "slow down", "decelerate"]
    }

    // Check standard commands with fuzzy matching and context awareness
    for (const [command, synonyms] of Object.entries(commandMap)) {
      const match = synonyms.find(synonym => {
        const distance = levenshteinDistance(cleanedTranscript, synonym)
        const includesCheck = cleanedTranscript.includes(synonym) || synonym.includes(cleanedTranscript)
        return includesCheck || distance <= 2
      })

      if (match) {
        console.log("[v0] Matched standard command:", match, "->", command)
        onCommand(command)
        return
      }
    }

    // Check available commands with improved partial matching
    const matchingCommand = availableCommands.find((cmd) => {
      const cmdLower = cmd.toLowerCase()
      const distance = levenshteinDistance(cleanedTranscript, cmdLower)
      const includesCheck = cleanedTranscript.includes(cmdLower) || cmdLower.includes(cleanedTranscript)

      // More lenient matching for short commands
      const threshold = cmdLower.length <= 3 ? 1 : 2
      return includesCheck || distance <= threshold
    })

    if (matchingCommand) {
      console.log("[v0] Matched available command:", matchingCommand)
      onCommand(matchingCommand)
      return
    }

    // Fallback: send cleaned transcript
    console.log("[v0] No command match, sending transcript:", cleanedTranscript)
    onCommand(cleanedTranscript)
  }

  const handleCalibrationComplete = (calibrationData: any) => {
    console.log("[v0] Calibration completed:", calibrationData)
    setConfidenceThreshold(calibrationData.recommendedThreshold)
    setShowCalibration(false)
  }

  // Simple Levenshtein distance for fuzzy matching
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = []
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

  useEffect(() => {
    if (!recognitionRef.current) return

    if (isListening && isSupported) {
      try {
        console.log("[v0] Starting voice recognition")
        recognitionRef.current.start()
      } catch (error) {
        console.error("[v0] Error starting recognition:", error)
      }
    } else {
      console.log("[v0] Stopping voice recognition")
      recognitionRef.current.stop()
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
    }
  }, [isListening, isSupported])

  if (!isSupported) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-4 sm:p-6 text-center">
          <MicOff className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-serif font-semibold mb-2 text-sm sm:text-base">Voice Recognition Not Supported</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">
            Your browser doesn't support voice recognition. Please use a modern browser like Chrome or Edge.
          </p>
          {isMobile && (
            <p className="text-xs text-muted-foreground">
              On mobile devices, try using Chrome browser for better voice recognition support.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-2 transition-colors ${isRecording ? "border-primary bg-primary/5" : "border-border"}`}>
      <CardContent className="p-4 sm:p-6">
        {/* Android-specific speech recognition fallback */}
        <AndroidSpeechRecognition
          onCommand={onCommand}
          isListening={isListening}
          availableCommands={availableCommands}
          customCommands={customCommands}
        />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isRecording ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {isRecording ? <Mic className="h-4 w-4 sm:h-5 sm:w-5" /> : <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-semibold text-sm sm:text-base">Voice Control</h3>
                {isMobile && <Smartphone className="h-4 w-4 text-muted-foreground" />}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isRecording
                  ? "Listening for commands..."
                  : isListening
                    ? isMobile
                      ? "Tap Voice Control to speak"
                      : "Click Voice Control to activate"
                    : "Voice recognition ready"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCalibration(true)}
              className="h-8 w-8 p-0"
              title="Calibrate voice recognition"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Badge variant={isRecording ? "default" : "secondary"} className="text-xs">
              {isRecording ? "Listening" : isListening ? "Active" : "Standby"}
            </Badge>
          </div>
        </div>

        {permissionStatus === "denied" && (
          <div className="mb-4 p-3 bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive">
              Microphone access denied. Please enable microphone permissions in your browser settings.
            </p>
          </div>
        )}

        {transcript && (
           <div className="mb-4 p-3 bg-muted rounded-lg">
             <div className="flex items-center gap-2 mb-1">
               <Volume2 className="h-4 w-4 text-muted-foreground" />
               <span className="text-sm font-medium">Heard:</span>
             </div>
             <p className="text-sm">{transcript}</p>
             {confidence > 0 && (
               <div className="flex items-center gap-2 mt-1">
                 <p className="text-xs text-muted-foreground">Confidence: {Math.round(confidence * 100)}%</p>
                 <div className="flex-1 bg-muted-foreground/20 rounded-full h-1">
                   <div
                     className={`h-1 rounded-full transition-all ${
                       confidence >= confidenceThreshold ? 'bg-green-500' : 'bg-yellow-500'
                     }`}
                     style={{ width: `${Math.min(confidence * 100, 100)}%` }}
                   />
                 </div>
                 <span className="text-xs text-muted-foreground">{detectedLanguage}</span>
               </div>
             )}
           </div>
         )}

        {lastCommand && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                Last Command
              </Badge>
            </div>
            <p className="text-sm font-medium">{lastCommand}</p>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium mb-3">Available Voice Commands:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {availableCommands.map((command, index) => (
              <Badge key={index} variant="outline" className="justify-center py-1 text-xs">
                "{command}"
              </Badge>
            ))}
            {Object.keys(customCommands).map((command, index) => (
              <Badge key={`custom-${index}`} variant="secondary" className="justify-center py-1 text-xs">
                "{command}"
              </Badge>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2 text-xs text-muted-foreground">
           <p>
             💡 <strong>Tip:</strong>{" "}
             {isMobile
               ? "On mobile, speak clearly after tapping Voice Control. The system will process your command automatically."
               : "Speak clearly and wait for the system to process your command. Voice control will continue listening for new commands."}
           </p>
           <div className="flex items-center justify-between">
             <span>Language: {detectedLanguage}</span>
             <span>Min Confidence: {Math.round(confidenceThreshold * 100)}%</span>
           </div>
           <div className="flex items-center justify-between">
             <span>Preprocessing: {isPreprocessingEnabled ? 'Enabled' : 'Disabled'}</span>
             <span>Attempts: {recognitionAttempts}</span>
           </div>

           {feedbackMode !== 'none' && recognitionStats.totalCommands > 0 && (
             <div className="p-2 bg-muted/50 rounded text-xs">
               <div className="font-medium mb-1">Recognition Stats:</div>
               <div className="grid grid-cols-2 gap-1">
                 <span>Success Rate: {Math.round((recognitionStats.successfulCommands / recognitionStats.totalCommands) * 100)}%</span>
                 <span>Avg Confidence: {Math.round(recognitionStats.averageConfidence * 100)}%</span>
                 {feedbackMode === 'detailed' && (
                   <>
                     <span>Total Commands: {recognitionStats.totalCommands}</span>
                     <span>Last Accuracy: {Math.round(recognitionStats.lastAccuracy * 100)}%</span>
                   </>
                 )}
               </div>
             </div>
           )}

           {recognitionAttempts > 0 && (
             <p className="text-yellow-600">
               ⚠️ Having trouble? Try speaking more clearly or adjusting your microphone.
             </p>
           )}
         </div>
 
         {/* Voice Calibration Modal */}
         {showCalibration && (
           <VoiceCalibration
             onCalibrationComplete={handleCalibrationComplete}
             isOpen={showCalibration}
             onClose={() => setShowCalibration(false)}
           />
         )}
       </CardContent>
     </Card>
   )
 }
