"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Clock, BookOpen, TrendingUp, Star, Headphones, Calendar, Award } from "lucide-react"
import { UserProfileMenu } from "@/components/user-profile-menu"
import { AuthGuard } from "@/components/auth-guard"
import { audiobooks } from "@/lib/audiobooks"

// Mock user data
const userData = {
  name: "Alex Johnson",
  email: "alex@example.com",
  avatar: "/user-avatar.jpg",
  memberSince: "January 2024",
  totalListeningTime: "127h 45m",
  booksCompleted: 12,
  currentStreak: 7,
  favoriteGenre: "Science Fiction",
}

const recentActivity = [
  {
    id: 1,
    type: "completed",
    book: audiobooks[1],
    timestamp: "2 hours ago",
  },
  {
    id: 2,
    type: "started",
    book: audiobooks[0],
    timestamp: "1 day ago",
  },
  {
    id: 3,
    type: "bookmarked",
    book: audiobooks[2],
    timestamp: "2 days ago",
  },
]

const currentlyReading = audiobooks.filter((book) => book.progress > 0 && book.progress < 100)
const recommendations = audiobooks.slice(0, 3)

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview")

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
                <Link href="/dashboard" className="text-primary font-medium">
                  Dashboard
                </Link>
                <Link href="/library" className="text-muted-foreground hover:text-foreground">
                  Library
                </Link>
                <UserProfileMenu />
              </nav>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <img
                src={userData.avatar || "/placeholder.svg?height=80&width=80"}
                alt={userData.name}
                className="w-20 h-20 rounded-full border-2 border-primary/20"
              />
              <div>
                <h1 className="text-3xl font-bold">Welcome back, {userData.name}!</h1>
                <p className="text-muted-foreground">Member since {userData.memberSince}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{userData.totalListeningTime}</div>
                  <div className="text-sm text-muted-foreground">Total Listening</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <BookOpen className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{userData.booksCompleted}</div>
                  <div className="text-sm text-muted-foreground">Books Completed</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Award className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{userData.currentStreak}</div>
                  <div className="text-sm text-muted-foreground">Day Streak</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Star className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{userData.favoriteGenre}</div>
                  <div className="text-sm text-muted-foreground">Favorite Genre</div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Headphones className="h-5 w-5" />
                      <span>Continue Listening</span>
                    </CardTitle>
                    <CardDescription>Pick up where you left off</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {currentlyReading.map((book) => (
                      <div key={book.id} className="flex items-center space-x-4">
                        <img
                          src={book.cover || "/placeholder.svg"}
                          alt={book.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{book.title}</h4>
                          <p className="text-sm text-muted-foreground truncate">by {book.author}</p>
                          <Progress value={book.progress} className="mt-2" />
                          <p className="text-xs text-muted-foreground mt-1">{book.progress}% complete</p>
                        </div>
                        <Button size="sm" asChild>
                          <Link href={`/player/${book.id}`}>
                            <Play className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Recommended for You</span>
                    </CardTitle>
                    <CardDescription>Based on your listening history</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recommendations.map((book) => (
                      <div key={book.id} className="flex items-center space-x-4">
                        <img
                          src={book.cover || "/placeholder.svg"}
                          alt={book.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{book.title}</h4>
                          <p className="text-sm text-muted-foreground truncate">by {book.author}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs">{book.rating}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {book.genre}
                            </Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/player/${book.id}`}>
                            <Play className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="progress" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Reading Progress</CardTitle>
                  <CardDescription>Track your audiobook journey</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {currentlyReading.map((book) => (
                      <div key={book.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <img
                              src={book.cover || "/placeholder.svg"}
                              alt={book.title}
                              className="w-10 h-10 rounded object-cover"
                            />
                            <div>
                              <h4 className="font-medium">{book.title}</h4>
                              <p className="text-sm text-muted-foreground">by {book.author}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{book.progress}%</div>
                            <div className="text-xs text-muted-foreground">{book.duration}</div>
                          </div>
                        </div>
                        <Progress value={book.progress} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Recent Activity</span>
                  </CardTitle>
                  <CardDescription>Your latest audiobook interactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg bg-muted/50">
                        <img
                          src={activity.book.cover || "/placeholder.svg"}
                          alt={activity.book.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {activity.type === "completed" && "Completed"}
                              {activity.type === "started" && "Started"}
                              {activity.type === "bookmarked" && "Bookmarked"}
                            </span>
                            <span className="text-muted-foreground">{activity.book.title}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">by {activity.book.author}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">{activity.timestamp}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  )
}
