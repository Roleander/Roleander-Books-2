"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { BookOpen, Heart, Crown, User, Mic } from "lucide-react"

interface FavoriteSeries {
  id: string
  series: {
    id: string
    title: string
    description: string
    author: string
    narrator: string
    genre: string
    is_premium: boolean
    cover_image_url: string
  }
  created_at: string
}

export function FavoritesGrid() {
  const [favorites, setFavorites] = useState<FavoriteSeries[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchFavorites()
  }, [])

  const fetchFavorites = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("favorites")
        .select(`
          *,
          series:series_id (
            id,
            title,
            description,
            author,
            narrator,
            genre,
            is_premium,
            cover_image_url
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setFavorites(data || [])
    } catch (error) {
      console.error("Error fetching favorites:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const removeFavorite = async (seriesId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("series_id", seriesId)

      if (error) throw error
      setFavorites((prev) => prev.filter((fav) => fav.series.id !== seriesId))
    } catch (error) {
      console.error("Error removing favorite:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
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
      <div>
        <h2 className="text-2xl font-serif font-bold mb-2">Your Favorites</h2>
        <p className="text-muted-foreground">Series you've marked as favorites</p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">No favorites yet</h3>
          <p className="text-muted-foreground">Heart series you love to add them to your favorites</p>
          <Button className="mt-4" onClick={() => router.push("/library")}>
            Browse Series
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map((favorite) => (
            <Card
              key={favorite.id}
              className="group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
            >
              <CardContent className="p-0">
                {/* Cover Image */}
                <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-accent/20 to-primary/20">
                  {favorite.series.cover_image_url ? (
                    <img
                      src={favorite.series.cover_image_url || "/placeholder.svg"}
                      alt={favorite.series.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                  )}

                  {/* Premium Badge */}
                  {favorite.series.is_premium && (
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="bg-accent/90 text-accent-foreground gap-1">
                        <Crown className="h-3 w-3" />
                        Premium
                      </Badge>
                    </div>
                  )}

                  {/* Remove Favorite Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-3 right-3 h-8 w-8 p-0 bg-background/80 hover:bg-background"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFavorite(favorite.series.id)
                    }}
                  >
                    <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                  </Button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-serif font-semibold text-lg leading-tight line-clamp-2">
                      {favorite.series.title}
                    </h3>
                    {favorite.series.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{favorite.series.description}</p>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    {favorite.series.author && (
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>{favorite.series.author}</span>
                      </div>
                    )}
                    {favorite.series.narrator && (
                      <div className="flex items-center gap-2">
                        <Mic className="h-3 w-3" />
                        <span>{favorite.series.narrator}</span>
                      </div>
                    )}
                  </div>

                  {favorite.series.genre && (
                    <Badge variant="outline" className="text-xs">
                      {favorite.series.genre}
                    </Badge>
                  )}

                  <Button className="w-full mt-4" onClick={() => router.push(`/series/${favorite.series.id}`)}>
                    View Series
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
