import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Clock, Star, BookOpen } from "lucide-react"
import Link from "next/link"

interface BookCardProps {
  book: {
    id: number
    title: string
    author: string
    narrator: string
    duration: string
    rating: number
    genre: string
    cover: string
    description: string
    progress: number
  }
}

export function BookCard({ book }: BookCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-border/50">
      <CardHeader className="p-4">
        <div className="relative mb-4">
          <img
            src={book.cover || "/placeholder.svg"}
            alt={book.title}
            className="w-full h-48 object-cover rounded-lg"
          />
          {book.progress > 0 && (
            <div className="absolute bottom-2 left-2 right-2">
              <div className="bg-black/60 rounded-full p-1">
                <div className="bg-primary h-1 rounded-full" style={{ width: `${book.progress}%` }} />
              </div>
              <span className="text-xs text-white ml-2">{book.progress}% complete</span>
            </div>
          )}
          <Button
            size="sm"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            asChild
          >
            <Link href={`/player/${book.id}`}>
              <Play className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="space-y-2">
          <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
          <CardDescription className="text-sm">by {book.author}</CardDescription>
          <CardDescription className="text-xs">Narrated by {book.narrator}</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{book.rating}</span>
          </div>
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{book.duration}</span>
          </div>
        </div>

        <Badge variant="secondary" className="mb-3">
          {book.genre}
        </Badge>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{book.description}</p>

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" asChild>
            <Link href={`/player/${book.id}`}>
              <Play className="h-4 w-4 mr-2" />
              {book.progress > 0 ? "Continue" : "Play"}
            </Link>
          </Button>
          <Button size="sm" variant="outline">
            <BookOpen className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
