import { Card, CardContent } from "@/components/ui/card"
import { Clock, BookOpen, Award, Star } from "lucide-react"

interface DashboardStatsProps {
  totalListeningTime: string
  booksCompleted: number
  currentStreak: number
  favoriteGenre: string
}

export function DashboardStats({
  totalListeningTime,
  booksCompleted,
  currentStreak,
  favoriteGenre,
}: DashboardStatsProps) {
  const stats = [
    {
      icon: Clock,
      value: totalListeningTime,
      label: "Total Listening",
    },
    {
      icon: BookOpen,
      value: booksCompleted.toString(),
      label: "Books Completed",
    },
    {
      icon: Award,
      value: currentStreak.toString(),
      label: "Day Streak",
    },
    {
      icon: Star,
      value: favoriteGenre,
      label: "Favorite Genre",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4 text-center">
            <stat.icon className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
