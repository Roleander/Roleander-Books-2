"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  BookOpen,
  MessageSquare,
  User,
  UserPlus,
} from "lucide-react"
import { VoiceRecognition } from "./voice-recognition"
import { InteractiveChoices } from "./interactive-choices"
import { BookCharacterProgression } from "../character/book-character-progression"
import { ThreeScene, ThreeScenePresets } from "../ui/three-scene"
import { InteractiveDice } from "../ui/interactive-dice"

interface AudioPlayerProps {
  audiobookId: string
  user?: any
}

interface Audiobook {
  id: string
  title: string
  description: string
  audio_file_url: string
  duration_seconds: number
  chapter_number: number
  series: {
    id: string
    title: string
    cover_image_url: string
  }
}

interface Choice {
  id: string
  choice_text: string
  choice_number: number
  voice_command: string
  next_audiobook_id: string | null
  choice_type?: 'standard' | 'dice'
  dice_outcomes?: Array<{
    id: string
    min_roll: number
    max_roll: number
    next_audiobook_id: string | null
    outcome_description: string
  }>
}

interface ListeningProgress {
  progress_seconds: number
  completed: boolean
}

export function AudioPlayer({ audiobookId, user }: AudioPlayerProps) {
  const [audiobook, setAudiobook] = useState<Audiobook | null>(null)
  const [choices, setChoices] = useState<Choice[]>([])
  const [progress, setProgress] = useState<ListeningProgress>({ progress_seconds: 0, completed: false })
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [showChoices, setShowChoices] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [isAudioReady, setIsAudioReady] = useState(false)
  const [showCharacterProgress, setShowCharacterProgress] = useState(false)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [showDice, setShowDice] = useState(false)
  const [diceResult, setDiceResult] = useState<number | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const progressUpdateRef = useRef<NodeJS.Timeout>()
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchAudiobookData()
    return () => {
      if (progressUpdateRef.current) {
        clearInterval(progressUpdateRef.current)
      }
    }
  }, [audiobookId, user])

  useEffect(() => {
    if (audioRef.current && audiobook) {
      audioRef.current.currentTime = progress.progress_seconds
      setCurrentTime(progress.progress_seconds)
    }
  }, [audiobook, progress.progress_seconds])

  const fetchAudiobookData = async () => {
    try {
      const { data: audiobookData, error: audiobookError } = await supabase
        .from("audiobooks")
        .select(`
          *,
          series:series_id (
            id,
            title,
            cover_image_url
          )
        `)
        .eq("id", audiobookId)
        .single()

      if (audiobookError) throw audiobookError

      console.log("[v0] Audiobook data:", audiobookData)
      console.log("[v0] Audio file URL:", audiobookData.audio_file_url)

      if (!audiobookData.audio_file_url || audiobookData.audio_file_url.trim() === "") {
        setAudioError("No audio file URL provided for this audiobook")
        console.log("[v0] No audio URL found")
      } else if (!audiobookData.audio_file_url.startsWith("http") && !audiobookData.audio_file_url.startsWith("/")) {
        setAudioError("Invalid audio file URL format")
        console.log("[v0] Invalid audio URL format:", audiobookData.audio_file_url)
      }

      setAudiobook(audiobookData)

      const { data: choicesData, error: choicesError } = await supabase
        .from("audio_choices")
        .select("*")
        .eq("audiobook_id", audiobookId)
        .order("choice_number")

      if (choicesError) throw choicesError
      setChoices(choicesData || [])

      if (user) {
        const { data: progressData, error: progressError } = await supabase
          .from("listening_progress")
          .select("*")
          .eq("user_id", user.id)
          .eq("audiobook_id", audiobookId)
          .single()

        if (progressError && progressError.code !== "PGRST116") throw progressError
        if (progressData) {
          setProgress(progressData)
        }
      }
    } catch (error) {
      console.error("Error fetching audiobook data:", error)
      setAudioError("Failed to load audiobook data")
    } finally {
      setIsLoading(false)
    }
  }

  const updateProgress = async (progressSeconds: number, completed = false) => {
    try {
      if (!user) {
        console.log("[v0] Guest user - progress not saved")
        return
      }

      const { error } = await supabase.from("listening_progress").upsert(
        {
          user_id: user.id,
          audiobook_id: audiobookId,
          progress_seconds: Math.floor(progressSeconds),
          completed,
          last_listened_at: new Date().toISOString(),
        },
        { onConflict: "user_id,audiobook_id" },
      )

      if (error) throw error
    } catch (error) {
      console.error("Error updating progress:", error)
    }
  }

  const handlePlay = async () => {
    if (!audioRef.current || !isAudioReady) {
      console.log("[v0] Cannot play: audio not ready")
      setAudioError("Audio is not ready to play")
      return
    }

    try {
      console.log("[v0] Attempting to play audio")
      await audioRef.current.play()
      setIsPlaying(true)
      setAudioError(null)

      progressUpdateRef.current = setInterval(() => {
        if (audioRef.current) {
          const currentTime = audioRef.current.currentTime
          setCurrentTime(currentTime)
          updateProgress(currentTime)

          const timeRemaining = duration - currentTime
          if (choices.length > 0 && timeRemaining <= 30 && timeRemaining > 0 && !showChoices) {
            setShowChoices(true)
          }
        }
      }, 1000)
    } catch (error) {
      console.log("[v0] Play error:", error)
      setAudioError("Failed to play audio. The audio file may not be available.")
      setIsPlaying(false)
    }
  }

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      if (progressUpdateRef.current) {
        clearInterval(progressUpdateRef.current)
      }
    }
  }

  const handleSeek = (value: number[]) => {
    const newTime = value[0]
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
      updateProgress(newTime)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume
        setIsMuted(false)
      } else {
        audioRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed)
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15)
    }
  }

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 15)
    }
  }

  const handleChoiceSelected = async (choice: Choice) => {
    await updateProgress(duration, true)

    // Award experience for making choices
    if (selectedCharacterId) {
      try {
        await supabase.rpc('add_character_experience', {
          character_id: selectedCharacterId,
          exp_amount: 15
        })
      } catch (error) {
        console.error('Error awarding choice experience:', error)
      }
    }

    if (choice.choice_type === 'dice') {
      // For dice choices, trigger dice roll instead of direct navigation
      setShowDice(true)
      // Store the dice choice for later processing
      setDiceResult(null) // Reset to trigger new roll
      return
    }

    if (choice.next_audiobook_id) {
      router.push(`/listen/${choice.next_audiobook_id}`)
    } else {
      router.push(`/series/${audiobook?.series.id}`)
    }
  }

  const handleVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase().trim()

    // 3D Scene commands
    if (lowerCommand.includes("show 3d") || lowerCommand.includes("3d scene") || lowerCommand.includes("companion")) {
      // The 3D scene is always visible, but we could add more interactive features
      console.log("[3D] Voice command received for 3D scene")
      return
    }

    // Dice commands
    if (lowerCommand.includes("roll dice") || lowerCommand.includes("dice roll") || lowerCommand.includes("roll d20")) {
      setShowDice(true)
      return
    }

    if (lowerCommand.includes("close dice") || lowerCommand.includes("hide dice")) {
      setShowDice(false)
      return
    }

    // RPG character commands
    if (lowerCommand.includes("check stats") || lowerCommand.includes("show character") || lowerCommand.includes("character sheet")) {
      setShowCharacterProgress(!showCharacterProgress)
      return
    }

    if (lowerCommand.includes("level up") || lowerCommand.includes("gain experience")) {
      if (selectedCharacterId) {
        supabase.rpc('add_character_experience', {
          character_id: selectedCharacterId,
          exp_amount: 25
        })
      }
      return
    }

    // Enhanced command processing with better matching
    if (lowerCommand.includes("play") || lowerCommand.includes("start") || lowerCommand.includes("resume")) {
      handlePlay()
      return
    }
    if (lowerCommand.includes("pause") || lowerCommand.includes("stop") || lowerCommand.includes("halt")) {
      handlePause()
      return
    }
    if (lowerCommand.includes("back") || lowerCommand.includes("rewind") || lowerCommand.includes("previous")) {
      skipBackward()
      return
    }
    if (lowerCommand.includes("forward") || lowerCommand.includes("skip") || lowerCommand.includes("next")) {
      skipForward()
      return
    }
    if (lowerCommand.includes("volume up") || lowerCommand.includes("louder")) {
      const newVolume = Math.min(1, volume + 0.1)
      handleVolumeChange([newVolume])
      return
    }
    if (lowerCommand.includes("volume down") || lowerCommand.includes("quieter")) {
      const newVolume = Math.max(0, volume - 0.1)
      handleVolumeChange([newVolume])
      return
    }

    // Speed control commands
    if (lowerCommand.includes("faster") || lowerCommand.includes("speed up")) {
      const newSpeed = Math.min(2, playbackRate + 0.25)
      handleSpeedChange(newSpeed)
      return
    }
    if (lowerCommand.includes("slower") || lowerCommand.includes("slow down")) {
      const newSpeed = Math.max(0.5, playbackRate - 0.25)
      handleSpeedChange(newSpeed)
      return
    }

    // Interactive choice matching with fuzzy logic
    const matchingChoice = choices.find((choice) => {
      const voiceCommand = choice.voice_command.toLowerCase().trim()
      const choiceText = choice.choice_text.toLowerCase().trim()

      return (
        lowerCommand === voiceCommand ||
        lowerCommand.includes(voiceCommand) ||
        voiceCommand.includes(lowerCommand) ||
        lowerCommand === choice.choice_number.toString() ||
        lowerCommand.includes(choiceText) ||
        choiceText.includes(lowerCommand)
      )
    })

    if (matchingChoice) {
      handleChoiceSelected(matchingChoice)
      return
    }

    console.log("[v0] Unrecognized voice command:", command)
  }

  // Create custom commands based on current chapter
  const customCommands = {
    ...choices.reduce(
      (acc, choice) => {
        acc[choice.voice_command] = choice.voice_command
        acc[choice.choice_text] = choice.voice_command
        return acc
      },
      {} as { [key: string]: string },
    ),
    "go faster": "faster",
    "go slower": "slower",
    "turn up": "volume up",
    "turn down": "volume down",
    "check stats": "check stats",
    "show character": "show character",
    "character sheet": "character sheet",
    "level up": "level up",
    "gain experience": "gain experience",
    "show 3d": "show 3d",
    "3d scene": "3d scene",
    "companion": "companion",
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
      setIsAudioReady(true)
      setAudioError(null)
      console.log("[v0] Audio loaded successfully, duration:", audioRef.current.duration)
    }
  }

  const handleAudioError = (event: any) => {
    console.log("[v0] Audio error occurred:", event)
    const audio = audioRef.current
    if (audio) {
      let errorMessage = "Unknown audio error"
      switch (audio.error?.code) {
        case 1:
          errorMessage = "Audio loading was aborted"
          break
        case 2:
          errorMessage = "Network error while loading audio"
          break
        case 3:
          errorMessage = "Audio format not supported or file corrupted"
          break
        case 4:
          errorMessage = "Audio file not found or not suitable"
          break
      }
      console.log("[v0] Audio error details:", errorMessage, audio.error)
      setAudioError(errorMessage)
      setIsAudioReady(false)
    }
  }

  const handleAudioCanPlay = () => {
    console.log("[v0] Audio can play")
    setIsAudioReady(true)
    setAudioError(null)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-32" />
          <div className="h-64 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (!audiobook) {
    return (
      <div className="container mx-auto px-6 py-8 text-center">
        <h1 className="text-2xl font-serif font-bold mb-4">Audiobook not found</h1>
        <Button onClick={() => router.push("/library")}>Back to Library</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex-col">
      <div className="container mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {user ? (
              <Badge variant="secondary" className="gap-1">
                <User className="h-3 w-3" />
                Signed In
              </Badge>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <UserPlus className="h-3 w-3" />
                  Guest Mode
                </Badge>
                <Button variant="outline" size="sm" onClick={() => router.push("/auth/login")}>
                  Sign In
                </Button>
              </div>
            )}
          </div>
        </div>

        {!user && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-blue-200 flex items-center justify-center mt-0.5">
                  <UserPlus className="h-3 w-3 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Listening as Guest</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    You can listen to audiobooks without an account, but your progress won't be saved.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/auth/signup")}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    Create Account to Save Progress
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <audio
          ref={audioRef}
          src={audiobook.audio_file_url}
          onLoadedMetadata={handleAudioLoadedMetadata}
          onError={handleAudioError}
          onCanPlay={handleAudioCanPlay}
          onEnded={() => {
            setIsPlaying(false)
            if (choices.length > 0) {
              setShowChoices(true)
            } else {
              updateProgress(duration, true)
            }
          }}
          preload="metadata"
        />

        {audioError && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-destructive/20 flex items-center justify-center mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-destructive mb-1">Audio Error</h3>
                  <p className="text-sm text-muted-foreground mb-3">{audioError}</p>
                  <p className="text-xs text-muted-foreground">
                    This is likely because the audio file URL is a placeholder. In a real application, this would point
                    to actual audio files stored in a service like Vercel Blob or AWS S3.
                  </p>
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAudioError(null)
                        if (audioRef.current) {
                          audioRef.current.load()
                        }
                      }}
                    >
                      Retry Loading
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50 shadow-xl">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
                {/* 3D Animated Scene */}
                <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-accent/20 to-primary/20 shadow-lg relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ThreeScene {...ThreeScenePresets.interactive} />
                  </div>
                  <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
                    <span className="text-xs text-white font-medium">🎮 3D Companion</span>
                  </div>
                </div>

                {/* Book Cover (smaller) */}
                <div className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-accent/20 to-primary/20 shadow-lg">
                  {audiobook.series.cover_image_url ? (
                    <img
                      src={audiobook.series.cover_image_url || "/placeholder.svg"}
                      alt={audiobook.series.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-6">
                <div className="text-center lg:text-left">
                  <h1 className="text-2xl font-serif font-bold mb-2">{audiobook.title}</h1>
                  <p className="text-lg text-muted-foreground mb-1">{audiobook.series.title}</p>
                  <div className="flex items-center gap-2 justify-center lg:justify-start">
                    <Badge variant="outline">Chapter {audiobook.chapter_number}</Badge>
                    {isAudioReady ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Audio Ready
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Loading Audio...
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={1}
                    onValueChange={handleSeek}
                    className="w-full"
                    disabled={!isAudioReady}
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={skipBackward}
                    className="h-12 w-12 p-0 bg-transparent"
                    disabled={!isAudioReady}
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>

                  <Button
                    size="lg"
                    onClick={isPlaying ? handlePause : handlePlay}
                    className="h-16 w-16 p-0 rounded-full"
                    disabled={!isAudioReady}
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={skipForward}
                    className="h-12 w-12 p-0 bg-transparent"
                    disabled={!isAudioReady}
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={toggleMute} className="h-8 w-8 p-0">
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      max={1}
                      step={0.1}
                      onValueChange={handleVolumeChange}
                      className="w-20"
                    />
                  </div>

                  <div className="flex justify-start gap-0 h-fit w-fit flex-col items-center">
                    <span className="text-sm text-muted-foreground">Speed:</span>
                    {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <Button
                        key={speed}
                        variant={playbackRate === speed ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleSpeedChange(speed)}
                        className="h-8 px-2"
                        disabled={!isAudioReady}
                      >
                        {speed}x
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant={isVoiceEnabled ? "default" : "outline"}
                    onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                    className="leading-7 text-left rounded-full flex-row gap-0 w-12"
                    disabled={!isAudioReady}
                  >
                    {isVoiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    Voz
                  </Button>

                  {user && (
                    <Button
                      variant={showCharacterProgress ? "default" : "outline"}
                      onClick={() => setShowCharacterProgress(!showCharacterProgress)}
                      className="leading-7 text-left rounded-full flex-row gap-0 w-12"
                      disabled={!selectedCharacterId}
                      title="Toggle character progression"
                    >
                      <User className="h-4 w-4" />
                      RPG
                    </Button>
                  )}

                  <Button
                    variant={showDice ? "default" : "outline"}
                    onClick={() => setShowDice(!showDice)}
                    className="leading-7 text-left rounded-full flex-row gap-0 w-12"
                    title="Roll interactive dice"
                  >
                    🎲 Dice
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <VoiceRecognition
          onCommand={handleVoiceCommand}
          isListening={isVoiceEnabled}
          availableCommands={[
            "play",
            "pause",
            "stop",
            "back",
            "forward",
            "volume up",
            "volume down",
            "faster",
            "slower",
            "check stats",
            "show character",
            "character sheet",
            "level up",
            "gain experience",
            "show 3d",
            "3d scene",
            "companion",
            "roll dice",
            "dice roll",
            "roll d20",
            "close dice",
            "hide dice",
            ...choices.map((c) => c.voice_command),
            ...choices.map((c) => c.choice_number.toString()),
          ]}
          customCommands={customCommands}
          enableWakeWord={false}
        />

        {showChoices && choices.length > 0 && (
          <InteractiveChoices choices={choices} onChoiceSelected={handleChoiceSelected} />
        )}

        {/* Character Progression Panel */}
        {showCharacterProgress && selectedCharacterId && (
          <BookCharacterProgression
            characterId={selectedCharacterId}
            audiobookId={audiobookId}
            onProgressUpdate={(progress) => {
              console.log('[RPG] Book progress updated:', progress)
            }}
          />
        )}

        {/* Interactive Dice Panel */}
        {showDice && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <InteractiveDice
              onRollResult={(result, modifier) => {
                setDiceResult(result)
                console.log('[Dice] Rolled:', result, 'with modifier:', modifier)
              }}
              onChoiceInfluence={(choiceIndex, diceResult) => {
                console.log('[Dice] Influencing choice:', choiceIndex, 'with result:', diceResult)
                // Find the dice choice and determine outcome based on roll
                const diceChoice = choices.find(c => c.choice_type === 'dice')
                if (diceChoice?.dice_outcomes) {
                  const outcome = diceChoice.dice_outcomes.find(outcome =>
                    diceResult >= outcome.min_roll && diceResult <= outcome.max_roll
                  )

                  if (outcome) {
                    console.log('[Dice] Selected outcome:', outcome.outcome_description)
                    // Award experience for dice rolls
                    if (selectedCharacterId) {
                      supabase.rpc('add_character_experience', {
                        character_id: selectedCharacterId,
                        exp_amount: 25
                      })
                    }

                    if (outcome.next_audiobook_id) {
                      router.push(`/listen/${outcome.next_audiobook_id}`)
                    } else {
                      router.push(`/series/${audiobook?.series.id}`)
                    }
                  }
                }
              }}
              availableChoices={choices}
              onClose={() => setShowDice(false)}
            />
          </div>
        )}

        {audiobook.description && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-serif font-semibold mb-2">About This Chapter</h3>
                  <p className="text-muted-foreground leading-relaxed">{audiobook.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
