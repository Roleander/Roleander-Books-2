"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Users, BookOpen, Play, TrendingUp } from "lucide-react"

interface AnalyticsData {
  totalUsers: number
  totalSeries: number
  totalAudiobooks: number
  totalListeningTime: number
  popularSeries: Array<{
    title: string
    listens: number
  }>
  recentActivity: Array<{
    user_email: string
    audiobook_title: string
    series_title: string
    last_listened: string
  }>
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalSeries: 0,
    totalAudiobooks: 0,
    totalListeningTime: 0,
    popularSeries: [],
    recentActivity: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      // Fetch basic counts
      const [usersResult, seriesResult, audiobooksResult, progressResult] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("series").select("id", { count: "exact", head: true }),
        supabase.from("audiobooks").select("id", { count: "exact", head: true }),
        supabase.from("listening_progress").select("progress_seconds"),
      ])

      // Calculate total listening time
      const totalListeningTime =
        progressResult.data?.reduce((sum, record) => sum + (record.progress_seconds || 0), 0) || 0

      // Fetch popular series (simplified - in real app you'd have more complex analytics)
      const { data: popularData } = await supabase.from("listening_progress").select(`
          audiobook:audiobook_id (
            series:series_id (title)
          )
        `)

      // Process popular series data
      const seriesCount: Record<string, number> = {}
      popularData?.forEach((record) => {
        const seriesTitle = record.audiobook?.series?.title
        if (seriesTitle) {
          seriesCount[seriesTitle] = (seriesCount[seriesTitle] || 0) + 1
        }
      })

      const popularSeries = Object.entries(seriesCount)
        .map(([title, listens]) => ({ title, listens }))
        .sort((a, b) => b.listens - a.listens)
        .slice(0, 5)

      // Fetch recent activity
      const { data: recentData } = await supabase
        .from("listening_progress")
        .select(`
          last_listened_at,
          profiles:user_id (email),
          audiobook:audiobook_id (
            title,
            series:series_id (title)
          )
        `)
        .order("last_listened_at", { ascending: false })
        .limit(10)

      const recentActivity =
        recentData?.map((record) => ({
          user_email: record.profiles?.email || "Unknown",
          audiobook_title: record.audiobook?.title || "Unknown",
          series_title: record.audiobook?.series?.title || "Unknown",
          last_listened: record.last_listened_at,
        })) || []

      setAnalytics({
        totalUsers: usersResult.count || 0,
        totalSeries: seriesResult.count || 0,
        totalAudiobooks: audiobooksResult.count || 0,
        totalListeningTime,
        popularSeries,
        recentActivity,
      })
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading analytics...</div>
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{analytics.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Series</p>
                <p className="text-2xl font-bold">{analytics.totalSeries}</p>
              </div>
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Chapters</p>
                <p className="text-2xl font-bold">{analytics.totalAudiobooks}</p>
              </div>
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Listening Time</p>
                <p className="text-2xl font-bold">{formatTime(analytics.totalListeningTime)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Series */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Popular Series</CardTitle>
            <CardDescription>Most listened to series by user engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.popularSeries.length > 0 ? (
                analytics.popularSeries.map((series, index) => (
                  <div key={series.title} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="font-medium">{series.title}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{series.listens} listens</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No listening data yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Recent Activity</CardTitle>
            <CardDescription>Latest user listening activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.recentActivity.length > 0 ? (
                analytics.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{activity.series_title}</p>
                      <p className="text-xs text-muted-foreground">{activity.audiobook_title}</p>
                      <p className="text-xs text-muted-foreground">{activity.user_email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {formatDate(activity.last_listened)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
