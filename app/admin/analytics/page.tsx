"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserProfileMenu } from "@/components/user-profile-menu"
import { AuthGuard } from "@/components/auth-guard"
import { ArrowLeft, TrendingUp, Users, BookOpen, Clock, Download } from "lucide-react"

// Mock analytics data
const analyticsData = {
  userGrowth: [
    { month: "Jan", users: 850, newUsers: 120 },
    { month: "Feb", users: 920, newUsers: 70 },
    { month: "Mar", users: 1050, newUsers: 130 },
    { month: "Apr", users: 1180, newUsers: 130 },
    { month: "May", users: 1247, newUsers: 67 },
  ],
  listeningStats: {
    totalHours: 45678,
    averageSession: "2h 15m",
    topGenres: [
      { genre: "Science Fiction", hours: 8945, percentage: 19.6 },
      { genre: "Self-Help", hours: 7234, percentage: 15.8 },
      { genre: "Fiction", hours: 6789, percentage: 14.9 },
      { genre: "Biography", hours: 5432, percentage: 11.9 },
      { genre: "Romance", hours: 4567, percentage: 10.0 },
    ],
    deviceBreakdown: [
      { device: "Mobile", percentage: 68 },
      { device: "Desktop", percentage: 22 },
      { device: "Tablet", percentage: 10 },
    ],
  },
  contentStats: {
    totalBooks: 3456,
    mostPopular: [
      { title: "Atomic Habits", author: "James Clear", listens: 1247 },
      { title: "The Midnight Library", author: "Matt Haig", listens: 1089 },
      { title: "Project Hail Mary", author: "Andy Weir", listens: 967 },
    ],
    completionRates: {
      overall: 73,
      byGenre: [
        { genre: "Self-Help", rate: 85 },
        { genre: "Biography", rate: 78 },
        { genre: "Fiction", rate: 71 },
        { genre: "Science Fiction", rate: 69 },
      ],
    },
  },
}

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-2xl font-bold text-gradient-red">
                SoundBook Admin
              </Link>
              <nav className="hidden md:flex items-center space-x-6">
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                  Dashboard
                </Link>
                <Link href="/admin" className="text-muted-foreground hover:text-foreground">
                  Admin
                </Link>
                <UserProfileMenu />
              </nav>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin Dashboard
              </Link>
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
                <p className="text-muted-foreground">Detailed insights into platform performance</p>
              </div>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold">1,247</div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                    <div className="text-xs text-green-600 mt-1">+5.7% this month</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold">45,678h</div>
                    <div className="text-sm text-muted-foreground">Total Listening</div>
                    <div className="text-xs text-green-600 mt-1">+12.3% this month</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <BookOpen className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold">3,456</div>
                    <div className="text-sm text-muted-foreground">Total Books</div>
                    <div className="text-xs text-blue-600 mt-1">+23 this month</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold">73%</div>
                    <div className="text-sm text-muted-foreground">Completion Rate</div>
                    <div className="text-xs text-green-600 mt-1">+2.1% this month</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Genres by Listening Hours</CardTitle>
                    <CardDescription>Most popular content categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.listeningStats.topGenres.map((genre, index) => (
                        <div key={genre.genre} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{genre.genre}</div>
                              <div className="text-sm text-muted-foreground">{genre.hours.toLocaleString()}h</div>
                            </div>
                          </div>
                          <div className="text-sm font-medium">{genre.percentage}%</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Device Usage</CardTitle>
                    <CardDescription>How users access the platform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.listeningStats.deviceBreakdown.map((device) => (
                        <div key={device.device} className="flex items-center justify-between">
                          <div className="font-medium">{device.device}</div>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-muted rounded-full h-2">
                              <div className="bg-primary h-2 rounded-full" style={{ width: `${device.percentage}%` }} />
                            </div>
                            <div className="text-sm font-medium w-12 text-right">{device.percentage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Growth Trends</CardTitle>
                  <CardDescription>Monthly user acquisition and growth</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.userGrowth.map((month) => (
                      <div key={month.month} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="font-medium">{month.month}</div>
                        <div className="flex items-center space-x-4">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Total: </span>
                            <span className="font-medium">{month.users.toLocaleString()}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">New: </span>
                            <span className="font-medium text-green-600">+{month.newUsers}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Most Popular Books</CardTitle>
                    <CardDescription>Top books by total listens</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.contentStats.mostPopular.map((book, index) => (
                        <div key={book.title} className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{book.title}</div>
                            <div className="text-sm text-muted-foreground">by {book.author}</div>
                          </div>
                          <div className="text-sm font-medium">{book.listens.toLocaleString()} listens</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Completion Rates by Genre</CardTitle>
                    <CardDescription>How often users finish books by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.contentStats.completionRates.byGenre.map((genre) => (
                        <div key={genre.genre} className="flex items-center justify-between">
                          <div className="font-medium">{genre.genre}</div>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-muted rounded-full h-2">
                              <div className="bg-primary h-2 rounded-full" style={{ width: `${genre.rate}%` }} />
                            </div>
                            <div className="text-sm font-medium w-12 text-right">{genre.rate}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  )
}
