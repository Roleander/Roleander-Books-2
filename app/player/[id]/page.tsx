"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Bookmark,
  Share,
  ArrowLeft,
  Clock,
  Star,
} from "lucide-react"
import { getAudiobookById } from "@/lib/audiobooks"
import Link from "next/link"

export default function PlayerPage() {
  const params = useParams()
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement>(null)

  const bookId = Number(params.id)
  const book = getAudiobookById(bookId)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)

    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("loadedmetadata", updateDuration)
    audio.addEventListener("ended", () => setIsPlaying(false))

    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("loadedmetadata", updateDuration)
      audio.removeEventListener("ended", () => setIsPlaying(false))
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = value[0]
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    const newVolume = value[0]
    audio.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isMuted) {
      audio.volume = volume
      setIsMuted(false)
    } else {
      audio.volume = 0
      setIsMuted(true)
    }
  }

  const skipForward = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.min(audio.currentTime + 30, duration)
  }

  const skipBackward = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(audio.currentTime - 15, 0)
  }

  const changePlaybackRate = (rate: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = rate
    setPlaybackRate(rate)
  }

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Book not found</h1>
          <Button asChild>
            <Link href="/library">Back to Library</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-red min-h-screen">
        <div className="absolute inset-0 bg-black/30" />

        <header className="relative z-10 p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <Bookmark className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <Share className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="relative z-10 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="relative mb-6">
                <img
                  src={book.cover || "/placeholder.svg"}
                  alt={book.title}
                  className="w-64 h-64 mx-auto rounded-2xl shadow-2xl"
                />
                {book.progress > 0 && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-black/60 rounded-full p-1">
                      <div className="bg-white h-1 rounded-full" style={{ width: `${book.progress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <h1 className="text-2xl font-bold text-white mb-2 text-balance">{book.title}</h1>
              <p className="text-white/80 mb-1">by {book.author}</p>
              <p className="text-white/60 text-sm mb-4">Narrated by {book.narrator}</p>

              <div className="flex items-center justify-center space-x-4 text-white/80 text-sm">
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{book.rating}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{book.duration}</span>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/20">
                  {book.genre}
                </Badge>
              </div>
            </div>

            <div className="mb-6">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="w-full"
              />
              <div className="flex justify-between text-white/80 text-sm mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-6 mb-6">
              <Button
                variant="ghost"
                size="lg"
                className="text-white hover:bg-white/10 h-12 w-12 rounded-full"
                onClick={skipBackward}
              >
                <SkipBack className="h-6 w-6" />
              </Button>

              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/90 h-16 w-16 rounded-full"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
              </Button>

              <Button
                variant="ghost"
                size="lg"
                className="text-white hover:bg-white/10 h-12 w-12 rounded-full"
                onClick={skipForward}
              >
                <SkipForward className="h-6 w-6" />
              </Button>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={toggleMute}>
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <div className="w-20">
                  <Slider value={[isMuted ? 0 : volume]} max={1} step={0.1} onValueChange={handleVolumeChange} />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-white/80 text-sm">Speed:</span>
                {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <Button
                    key={rate}
                    variant={playbackRate === rate ? "secondary" : "ghost"}
                    size="sm"
                    className={playbackRate === rate ? "" : "text-white hover:bg-white/10"}
                    onClick={() => changePlaybackRate(rate)}
                  >
                    {rate}x
                  </Button>
                ))}
              </div>
            </div>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-4">
                <h3 className="text-white font-medium mb-2">Currently Playing</h3>
                <p className="text-white/80 text-sm">Chapter 1: The Beginning</p>
                <p className="text-white/60 text-xs mt-1">{book.description}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <audio ref={audioRef} src={book.audioUrl || "/placeholder-audio.mp3"} preload="metadata" />
      </div>
    </div>
  )
}
