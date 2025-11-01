"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Play, Clock, Star, BookOpen } from "lucide-react"
import { UserProfileMenu } from "@/components/user-profile-menu"
import { AuthGuard } from "@/components/auth-guard"
import Link from "next/link"

// Mock audiobook data
const audiobooks = [
  {
    id: 1,
    title: "The Midnight Library",
    author: "Matt Haig",
    narrator: "Carey Mulligan",
    duration: "8h 32m",
    rating: 4.5,
    genre: "Fiction",
    cover: "/midnight-library-cover.png",
    description: "A dazzling novel about all the choices that go into a life well lived.",
    progress: 0,
  },
  {
    id: 2,
    title: "Atomic Habits",
    author: "James Clear",
    narrator: "James Clear",
    duration: "5h 35m",
    rating: 4.8,
    genre: "Self-Help",
    cover: "/atomic-habits-cover.png",
    description: "An easy and proven way to build good habits and break bad ones.",
    progress: 45,
  },
  {
    id: 3,
    title: "Project Hail Mary",
    author: "Andy Weir",
    narrator: "Ray Porter",
    duration: "16h 10m",
    rating: 4.7,
    genre: "Science Fiction",
    cover: "/project-hail-mary-cover.png",
    description: "A lone astronaut must save the earth from disaster in this incredible new science-based thriller.",
    progress: 0,
  },
  {
    id: 4,
    title: "Educated",
    author: "Tara Westover",
    narrator: "Julia Whelan",
    duration: "12h 10m",
    rating: 4.6,
    genre: "Biography",
    cover: "/educated-memoir-cover.png",
    description: "A memoir about a young girl who, kept out of school, leaves her survivalist family.",
    progress: 78,
  },
  {
    id: 5,
    title: "The Seven Husbands of Evelyn Hugo",
    author: "Taylor Jenkins Reid",
    narrator: "Alma Cuervo",
    duration: "12h 10m",
    rating: 4.4,
    genre: "Romance",
    cover: "/book-cover-seven-husbands-evelyn-hugo.jpg",
    description: "A reclusive Hollywood icon finally tells her story to a young journalist.",
    progress: 23,
  },
  {
    id: 6,
    title: "Dune",
    author: "Frank Herbert",
    narrator: "Scott Brick",
    duration: "21h 2m",
    rating: 4.3,
    genre: "Science Fiction",
    cover: "/book-cover-dune-classic.jpg",
    description: "Set on the desert planet Arrakis, this is the story of Paul Atreides.",
    progress: 0,
  },
]

const genres = ["All", "Fiction", "Science Fiction", "Self-Help", "Biography", "Romance", "Mystery", "Fantasy"]

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState("All")
  const [sortBy, setSortBy] = useState("title")

  const filteredBooks = audiobooks
    .filter((book) => {
      const matchesSearch =
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesGenre = selectedGenre === "All" || book.genre === selectedGenre
      return matchesSearch && matchesGenre
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.rating - a.rating
        case "duration":
          return Number.parseInt(a.duration) - Number.parseInt(b.duration)
        case "author":
          return a.author.localeCompare(b.author)
        default:
          return a.title.localeCompare(b.title)
      }
    })

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-2xl font-bold text-gradient-red">
                SoundBook
              </Link>
              <nav className="hidden md:flex items-center space-x-6">
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                  Dashboard
                </Link>
                <Link href="/library" className="text-primary font-medium">
                  Library
                </Link>
                <UserProfileMenu />
              </nav>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-6">Audiobook Library</h1>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search books or authors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>

              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="w-full md:w-48 h-11">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent>
                  {genres.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-48 h-11">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="author">Author</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <Card key={book.id} className="group hover:shadow-lg transition-all duration-200 border-border/50">
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
            ))}
          </div>

          {filteredBooks.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No books found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
