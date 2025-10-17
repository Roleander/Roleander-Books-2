"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Mic, MicOff, CheckCircle, XCircle, RotateCcw } from "lucide-react"

interface VoiceCalibrationProps {
  onCalibrationComplete: (calibrationData: CalibrationData) => void
  isOpen: boolean
  onClose: () => void
}

interface CalibrationData {
  averageConfidence: number
  voicePatterns: string[]
  recommendedThreshold: number
  calibrationDate: string
}

export function VoiceCalibration({ onCalibrationComplete, isOpen, onClose }: VoiceCalibrationProps) {
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [calibrationResults, setCalibrationResults] = useState<CalibrationData | null>(null)
  const [progress, setProgress] = useState(0)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const calibrationSamples = useRef<string[]>([])
  const confidenceSamples = useRef<number[]>([])

  const calibrationPhrases = [
    "play",
    "pause",
    "volume up",
    "volume down",
    "next",
    "previous",
    "faster",
    "slower"
  ]

  const startCalibration = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser')
      return
    }

    setIsCalibrating(true)
    setCurrentStep(0)
    setProgress(0)
    calibrationSamples.current = []
    confidenceSamples.current = []

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()

    const recognition = recognitionRef.current
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = navigator.language || 'en-US'
    // maxAlternatives may not be available in all browsers
    if ('maxAlternatives' in recognition) {
      (recognition as any).maxAlternatives = 1
    }

    recognition.onresult = (event) => {
      const result = event.results[0]
      const transcript = result[0].transcript.toLowerCase().trim()
      const confidence = result[0].confidence || 0.5

      console.log(`Calibration step ${currentStep + 1}: Heard "${transcript}" with confidence ${confidence}`)

      calibrationSamples.current.push(transcript)
      confidenceSamples.current.push(confidence)

      setCurrentStep(prev => prev + 1)
      setProgress(((currentStep + 1) / calibrationPhrases.length) * 100)

      if (currentStep + 1 >= calibrationPhrases.length) {
        completeCalibration()
      } else {
        // Continue to next phrase after a short delay
        setTimeout(() => {
          startListeningForPhrase(currentStep + 1)
        }, 1500)
      }
    }

    recognition.onerror = (event) => {
      console.error('Calibration error:', event.error)
      // Continue with next phrase even if current one failed
      setCurrentStep(prev => prev + 1)
      setProgress(((currentStep + 1) / calibrationPhrases.length) * 100)

      if (currentStep + 1 >= calibrationPhrases.length) {
        completeCalibration()
      } else {
        setTimeout(() => {
          startListeningForPhrase(currentStep + 1)
        }, 1500)
      }
    }

    recognition.onend = () => {
      // Auto-restart if calibration is still in progress
      if (isCalibrating && currentStep < calibrationPhrases.length) {
        setTimeout(() => {
          startListeningForPhrase(currentStep)
        }, 1000)
      }
    }

    // Start with first phrase
    startListeningForPhrase(0)
  }

  const startListeningForPhrase = (step: number) => {
    if (!recognitionRef.current || !isCalibrating) return

    try {
      recognitionRef.current.start()
    } catch (error) {
      console.error('Failed to start recognition for step', step, error)
    }
  }

  const completeCalibration = () => {
    setIsCalibrating(false)

    const averageConfidence = confidenceSamples.current.reduce((a, b) => a + b, 0) / confidenceSamples.current.length
    const successfulRecognitions = confidenceSamples.current.filter(c => c > 0.6).length
    const successRate = successfulRecognitions / confidenceSamples.current.length

    // Calculate recommended confidence threshold based on calibration
    const recommendedThreshold = Math.max(0.5, Math.min(0.8, averageConfidence - 0.1))

    const calibrationData: CalibrationData = {
      averageConfidence,
      voicePatterns: calibrationSamples.current,
      recommendedThreshold,
      calibrationDate: new Date().toISOString()
    }

    setCalibrationResults(calibrationData)
    onCalibrationComplete(calibrationData)

    // Stop recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  const resetCalibration = () => {
    setIsCalibrating(false)
    setCurrentStep(0)
    setProgress(0)
    setCalibrationResults(null)
    calibrationSamples.current = []
    confidenceSamples.current = []

    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  if (!isOpen) return null

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Calibration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isCalibrating && !calibrationResults && (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Calibrate your voice for better recognition accuracy. We'll ask you to say several common commands.
            </p>
            <Button onClick={startCalibration} className="w-full">
              <Mic className="h-4 w-4 mr-2" />
              Start Calibration
            </Button>
          </div>
        )}

        {isCalibrating && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Mic className="h-5 w-5 text-primary animate-pulse" />
              <span className="font-medium">Listening...</span>
            </div>

            <div className="space-y-2">
              <p className="text-sm">Please say:</p>
              <Badge variant="outline" className="text-lg px-4 py-2">
                "{calibrationPhrases[currentStep]}"
              </Badge>
            </div>

            <Progress value={progress} className="w-full" />

            <p className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {calibrationPhrases.length}
            </p>
          </div>
        )}

        {calibrationResults && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Calibration Complete!</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Average Confidence:</span>
                <div className="font-medium">{Math.round(calibrationResults.averageConfidence * 100)}%</div>
              </div>
              <div>
                <span className="text-muted-foreground">Recommended Threshold:</span>
                <div className="font-medium">{Math.round(calibrationResults.recommendedThreshold * 100)}%</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={onClose} className="flex-1">
                Apply Settings
              </Button>
              <Button onClick={resetCalibration} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <Button onClick={onClose} variant="ghost" className="w-full">
          Close
        </Button>
      </CardContent>
    </Card>
  )
}