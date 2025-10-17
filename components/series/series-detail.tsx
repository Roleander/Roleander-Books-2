"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ArrowLeft, Play, Heart, Crown, User, Mic, Clock, BookOpen } from "lucide-react"

interface SeriesDetailProps {
  seriesId: string
}

interface Series {
  id: string
  title: string
  description: string
  author: string
  narrator: string
  genre: string
  is_premium: boolean
  cover_image_url: string
}

interface Audiobook {
  id: string
  title: string
  description: string
  duration_seconds: number
  chapter_number: number
  is_premium: boolean
  progress?: {
    progress_seconds: number
    completed: boolean
  }
}

export function SeriesDetail({ seriesId }: SeriesDetailProps) {
  const [series, setSeries] = useState<Series | null>(null)
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([])
  const [isFavorite, setIsFavorite] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<{ subscription_tier: string } | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchSeriesData()
    fetchUserProfile()
    checkFavoriteStatus()
  }, [seriesId])

  const fetchUserProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single()

      if (error) throw error
      setUserProfile(data)
    } catch (error) {
      console.error("Error fetching user profile:", error)
    }
  }

  const fetchSeriesData = async () => {
    try {
      // Fetch series info
      const { data: seriesData, error: seriesError } = await supabase
        .from("series")
        .select("*")
        .eq("id", seriesId)
        .single()

      if (seriesError) throw seriesError
      setSeries(seriesData)

      // Fetch audiobooks with progress
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: audiobooksData, error: audiobooksError } = await supabase
        .from("audiobooks")
        .select(`
          *,
          listening_progress:listening_progress(progress_seconds, completed)
        `)
        .eq("series_id", seriesId)
        .order("chapter_number")

      if (audiobooksError) throw audiobooksError

      const processedAudiobooks = audiobooksData.map((book) => ({
        ...book,
        progress: book.listening_progress?.[0] || null,
      }))

      setAudiobooks(processedAudiobooks)
    } catch (error) {
      console.error("Error fetching series data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkFavoriteStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("series_id", seriesId)
        .single()

      if (error && error.code !== "PGRST116") throw error
      setIsFavorite(!!data)
    } catch (error) {
      console.error("Error checking favorite status:", error)
    }
  }

  const toggleFavorite = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      if (isFavorite) {
        const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("series_id", seriesId)
        if (error) throw error
        setIsFavorite(false)
      } else {
        const { error } = await supabase.from("favorites").insert([{ user_id: user.id, series_id: seriesId }])
        if (error) throw error
        setIsFavorite(true)
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getProgressPercentage = (progressSeconds: number, totalSeconds: number) => {
    if (totalSeconds === 0) return 0
    return Math.min((progressSeconds / totalSeconds) * 100, 100)
  }

  const canAccessPremium = (isPremium: boolean) => {
    return !isPremium || userProfile?.subscription_tier === "premium"
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-32" />
          <div className="flex gap-8">
            <div className="w-64 h-80 bg-muted rounded" />
            <div className="flex-1 space-y-4">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-20 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!series) {
    return (
      <div className="container mx-auto px-6 py-8 text-center">
        <h1 className="text-2xl font-serif font-bold mb-4">Series not found</h1>
        <Button onClick={() => router.push("/library")}>Back to Library</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {/* Series Header */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cover Image */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-br from-accent/20 to-primary/20">
            {series.cover_image_url ? (
              <img
                src={series.cover_image_url || "/placeholder.svg"}
                alt={series.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="h-24 w-24 text-muted-foreground/50" />
              </div>
            )}
          </div>
        </div>

        {/* Series Info */}
        <div className="flex-1 space-y-6">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-serif font-bold">{series.title}</h1>
                {series.is_premium && (
                  <Badge variant="secondary" className="gap-1">
                    <Crown className="h-3 w-3" />
                    Premium
                  </Badge>
                )}
              </div>
              <Button variant="outline" onClick={toggleFavorite} className="gap-2 bg-transparent">
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                {isFavorite ? "Favorited" : "Add to Favorites"}
              </Button>
            </div>

            {series.description && (
              <p className="text-muted-foreground text-lg leading-relaxed">{series.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            {series.author && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Author</p>
                  <p className="font-medium">{series.author}</p>
                </div>
              </div>
            )}
            {series.narrator && (
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Narrator</p>
                  <p className="font-medium">{series.narrator}</p>
                </div>
              </div>
            )}
            {series.genre && (
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Genre</p>
                  <p className="font-medium">{series.genre}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chapters List */}
      <div className="space-y-6">
        <h2 className="text-2xl font-serif font-bold">Chapters</h2>

        <div className="space-y-4">
          {audiobooks.map((audiobook) => (
            <Card key={audiobook.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline">Chapter {audiobook.chapter_number}</Badge>
                      {audiobook.is_premium && (
                        <Badge variant="secondary" className="gap-1">
                          <Crown className="h-3 w-3" />
                          Premium
                        </Badge>
                      )}
                      {audiobook.progress?.completed && <Badge className="bg-green-500">Completed</Badge>}
                    </div>

                    <h3 className="font-serif font-semibold text-lg mb-1">{audiobook.title}</h3>
                    {audiobook.description && (
                      <p className="text-sm text-muted-foreground mb-3">{audiobook.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDuration(audiobook.duration_seconds)}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {audiobook.progress && audiobook.progress.progress_seconds > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatDuration(audiobook.progress.progress_seconds)} listened</span>
                          <span>
                            {Math.round(
                              getProgressPercentage(audiobook.progress.progress_seconds, audiobook.duration_seconds),
                            )}
                            % complete
                          </span>
                        </div>
                        <Progress
                          value={getProgressPercentage(audiobook.progress.progress_seconds, audiobook.duration_seconds)}
                          className="h-1"
                        />
                      </div>
                    )}
                  </div>

                  <div className="ml-6 flex-shrink-0">
                    <Button
                      onClick={() => router.push(`/listen/${audiobook.id}`)}
                      disabled={!canAccessPremium(audiobook.is_premium)}
                      className="gap-2"
                    >
                      <Play className="h-4 w-4" />
                      {audiobook.progress?.progress_seconds ? "Continue" : "Start"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {audiobooks.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No chapters available</h3>
            <p className="text-muted-foreground">This series doesn't have any chapters yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
