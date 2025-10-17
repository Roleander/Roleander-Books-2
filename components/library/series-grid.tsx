"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { BookOpen, Clock, User, Mic, Crown, Heart } from "lucide-react"

interface Series {
  id: string
  title: string
  description: string
  author: string
  narrator: string
  genre: string
  is_premium: boolean
  cover_image_url: string
  audiobook_count: number
  total_duration: number
}

interface SeriesGridProps {
  searchQuery: string
}

export function SeriesGrid({ searchQuery }: SeriesGridProps) {
  const [series, setSeries] = useState<Series[]>([])
  const [filteredSeries, setFilteredSeries] = useState<Series[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<{ subscription_tier: string } | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchUser()
    fetchSeries()
  }, [])

  useEffect(() => {
    if (user) {
      fetchUserProfile()
      fetchFavorites()
    }
  }, [user])

  useEffect(() => {
    filterSeries()
  }, [searchQuery, series])

  const fetchUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error("Error fetching user:", error)
    }
  }

  const fetchUserProfile = async () => {
    try {
      if (!user) return

      const { data, error } = await supabase.rpc("get_user_subscription_tier", { user_id: user.id })

      if (error) throw error
      setUserProfile({ subscription_tier: data || "free" })
    } catch (error) {
      console.error("Error fetching user profile:", error)
      setUserProfile({ subscription_tier: "free" })
    }
  }

  const fetchSeries = async () => {
    try {
      const { data, error } = await supabase.from("series").select(`
          *,
          audiobooks:audiobooks(count),
          total_duration:audiobooks(duration_seconds)
        `)

      if (error) throw error

      const processedSeries = (data || []).map((s) => ({
        ...s,
        audiobook_count: s.audiobooks?.[0]?.count || 0,
        total_duration:
          s.total_duration?.reduce((sum: number, book: any) => sum + (book.duration_seconds || 0), 0) || 0,
      }))

      setSeries(processedSeries)
    } catch (error) {
      console.error("Error fetching series:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFavorites = async () => {
    try {
      if (!user) return

      const { data, error } = await supabase.from("favorites").select("series_id").eq("user_id", user.id)

      if (error) throw error
      setFavorites(new Set(data?.map((f) => f.series_id) || []))
    } catch (error) {
      console.error("Error fetching favorites:", error)
    }
  }

  const filterSeries = () => {
    if (!searchQuery.trim()) {
      setFilteredSeries(series)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = series.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.author?.toLowerCase().includes(query) ||
        s.narrator?.toLowerCase().includes(query) ||
        s.genre?.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query),
    )

    setFilteredSeries(filtered)
  }

  const toggleFavorite = async (seriesId: string) => {
    try {
      if (!user) {
        router.push("/auth/login")
        return
      }

      if (favorites.has(seriesId)) {
        const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("series_id", seriesId)
        if (error) throw error
        setFavorites((prev) => {
          const newSet = new Set(prev)
          newSet.delete(seriesId)
          return newSet
        })
      } else {
        const { error } = await supabase.from("favorites").insert([{ user_id: user.id, series_id: seriesId }])
        if (error) throw error
        setFavorites((prev) => new Set(prev).add(seriesId))
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

  const canAccessPremium = (isPremium: boolean) => {
    return !isPremium || userProfile?.subscription_tier === "premium"
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-0">
              <div className="aspect-[3/4] bg-muted rounded-t-lg" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {searchQuery && (
        <div className="text-sm text-muted-foreground">
          Found {filteredSeries.length} result{filteredSeries.length !== 1 ? "s" : ""} for "{searchQuery}"
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredSeries.map((seriesItem) => (
          <Card
            key={seriesItem.id}
            className="group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
          >
            <CardContent className="p-0">
              {/* Cover Image */}
              <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-accent/20 to-primary/20">
                {seriesItem.cover_image_url ? (
                  <img
                    src={seriesItem.cover_image_url || "/placeholder.svg"}
                    alt={seriesItem.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-16 w-16 text-muted-foreground/50" />
                  </div>
                )}

                {/* Premium Badge */}
                {seriesItem.is_premium && (
                  <div className="absolute top-3 left-3">
                    <Badge variant="secondary" className="bg-accent/90 text-accent-foreground gap-1">
                      <Crown className="h-3 w-3" />
                      Premium
                    </Badge>
                  </div>
                )}

                {/* Favorite Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-3 right-3 h-8 w-8 p-0 bg-background/80 hover:bg-background"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(seriesItem.id)
                  }}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      favorites.has(seriesItem.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"
                    }`}
                  />
                </Button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-serif font-semibold text-lg leading-tight line-clamp-2">{seriesItem.title}</h3>
                  {seriesItem.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{seriesItem.description}</p>
                  )}
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  {seriesItem.author && (
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span>{seriesItem.author}</span>
                    </div>
                  )}
                  {seriesItem.narrator && (
                    <div className="flex items-center gap-2">
                      <Mic className="h-3 w-3" />
                      <span>{seriesItem.narrator}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(seriesItem.total_duration)}</span>
                    </div>
                    <span>{seriesItem.audiobook_count} chapters</span>
                  </div>
                </div>

                {seriesItem.genre && (
                  <Badge variant="outline" className="text-xs">
                    {seriesItem.genre}
                  </Badge>
                )}

                <Button
                  className="w-full mt-4"
                  disabled={seriesItem.is_premium && !canAccessPremium(seriesItem.is_premium)}
                  onClick={() => {
                    if (seriesItem.is_premium && !user) {
                      router.push("/auth/login")
                    } else if (seriesItem.is_premium && !canAccessPremium(seriesItem.is_premium)) {
                      router.push("/subscription")
                    } else {
                      router.push(`/series/${seriesItem.id}`)
                    }
                  }}
                >
                  {seriesItem.is_premium && !user
                    ? "Sign In Required"
                    : seriesItem.is_premium && !canAccessPremium(seriesItem.is_premium)
                      ? "Premium Required"
                      : "Start Listening"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSeries.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">{searchQuery ? "No series found" : "No series available yet"}</h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Try adjusting your search terms" : "Check back later for new content"}
          </p>
        </div>
      )}
    </div>
  )
}
