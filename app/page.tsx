import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, BookOpen, Headphones, Users } from "lucide-react"
import { redirect } from "next/navigation"

export default async function HomePage() {
  // Show library with free content instead of requiring login
  redirect("/library")

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden bg-gradient-red">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 container mx-auto px-4 py-24 text-center">
          <h1 className="text-6xl font-bold text-white mb-6 text-balance">SoundBox</h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto text-pretty">
            Your personal audiobook library. Discover, listen, and immerse yourself in stories that transport you to new
            worlds.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/auth/login">
                <Play className="mr-2 h-5 w-5" />
                Start Listening
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 bg-transparent"
              asChild
            >
              <Link href="/library">
                <BookOpen className="mr-2 h-5 w-5" />
                Browse Library
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Why Choose SoundBook?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Experience audiobooks like never before with our premium features designed for book lovers.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Headphones className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Premium Audio Quality</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Crystal clear audio with advanced playback controls, bookmarks, and speed adjustment.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Vast Library</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Access thousands of audiobooks across all genres, from bestsellers to hidden gems.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Social Features</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Share your favorite books, create reading lists, and connect with fellow book enthusiasts.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="bg-muted/50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Audio Journey?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of listeners who have discovered their next favorite book with SoundBook.
          </p>
          <Button size="lg" asChild>
            <Link href="/auth/signup">Get Started Free</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
