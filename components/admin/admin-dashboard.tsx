"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SeriesManager } from "./series-manager"
import { AudiobookUploader } from "./audiobook-uploader"
import { ChoicesManager } from "./choices-manager"
import { AnalyticsDashboard } from "./analytics-dashboard"
import { LogoUploader } from "./logo-uploader"
import { UserManager } from "./user-manager"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { LogOut, BookOpen, Upload, GitBranch, BarChart3, Settings, Users } from "lucide-react"

export function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-serif font-bold text-foreground">AudioStory Admin</h1>
              <p className="text-sm text-muted-foreground">Content Management Dashboard</p>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="gap-2 bg-transparent">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-8">
        <Tabs defaultValue="series" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-fit lg:grid-cols-6">
            <TabsTrigger value="series" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Series
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="choices" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Choices
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="series" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Manage Series</CardTitle>
                <CardDescription>Create and organize your audiobook series</CardDescription>
              </CardHeader>
              <CardContent>
                <SeriesManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Upload Audiobooks</CardTitle>
                <CardDescription>Add new chapters and episodes to your series</CardDescription>
              </CardHeader>
              <CardContent>
                <AudiobookUploader />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="choices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Interactive Choices</CardTitle>
                <CardDescription>Set up branching narratives and voice commands</CardDescription>
              </CardHeader>
              <CardContent>
                <ChoicesManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">User Management</CardTitle>
                <CardDescription>Manage user roles and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <UserManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Analytics</CardTitle>
                <CardDescription>Track user engagement and listening patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsDashboard />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">App Settings</CardTitle>
                <CardDescription>Customize your AudioStory platform branding and configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <LogoUploader />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
