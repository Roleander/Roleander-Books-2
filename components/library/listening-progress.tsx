"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Play, BookOpen } from "lucide-react"

interface ListeningProgressItem {
  id: string
  progress_seconds: number
  completed: boolean
  last_listened_at: string
  audiobook: {
    id: string
    title: string
    duration_seconds: number
    series: {
      id: string
      title: string
      cover_image_url: string
    }
  }
}

export function ListeningProgress() {
  const [progressItems, setProgressItems] = useState<ListeningProgressItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchListeningProgress()
  }, [])

  const fetchListeningProgress = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("listening_progress")
        .select(`
          *,
          audiobook:audiobook_id (
            id,
            title,
            duration_seconds,
            series:series_id (
              id,
              title,
              cover_image_url
            )
          )
        `)
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("last_listened_at", { ascending: false })

      if (error) throw error
      setProgressItems(data || [])
    } catch (error) {
      console.error("Error fetching listening progress:", error)
    } finally {
      setIsLoading(false)
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return "Yesterday"
    return date.toLocaleDateString()
  }

  const getProgressPercentage = (progressSeconds: number, totalSeconds: number) => {
    if (totalSeconds === 0) return 0
    return Math.min((progressSeconds / totalSeconds) * 100, 100)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-muted rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-2 bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold mb-2">Continue Listening</h2>
        <p className="text-muted-foreground">Pick up where you left off</p>
      </div>

      {progressItems.length === 0 ? (
        <div className="text-center py-12">
          <Play className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">No listening progress yet</h3>
          <p className="text-muted-foreground">Start listening to a series to see your progress here</p>
          <Button className="mt-4" onClick={() => router.push("/library")}>
            Browse Series
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {progressItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  {/* Cover Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-accent/20 to-primary/20 flex-shrink-0">
                    {item.audiobook.series?.cover_image_url ? (
                      <img
                        src={item.audiobook.series.cover_image_url || "/placeholder.svg"}
                        alt={item.audiobook.series.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-serif font-semibold text-lg truncate">
                          {item.audiobook.series?.title || "Unknown Series"}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">{item.audiobook.title}</p>
                      </div>
                      <Badge variant="outline" className="ml-2 flex-shrink-0">
                        {formatDate(item.last_listened_at)}
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{formatDuration(item.progress_seconds)} listened</span>
                        <span>{formatDuration(item.audiobook.duration_seconds)} total</span>
                      </div>
                      <Progress
                        value={getProgressPercentage(item.progress_seconds, item.audiobook.duration_seconds)}
                        className="h-2"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => router.push(`/listen/${item.audiobook.id}`)} className="gap-2">
                        <Play className="h-4 w-4" />
                        Continue
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/series/${item.audiobook.series?.id}`)}
                      >
                        View Series
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
