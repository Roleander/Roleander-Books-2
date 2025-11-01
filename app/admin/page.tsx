"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserProfileMenu } from "@/components/user-profile-menu"
import { AuthGuard } from "@/components/auth-guard"
import {
  Users,
  BookOpen,
  Activity,
  Shield,
  Settings,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
} from "lucide-react"

// Mock admin data
const adminStats = {
  totalUsers: 1247,
  activeUsers: 892,
  totalBooks: 3456,
  totalListeningHours: 45678,
  newUsersToday: 23,
  booksAddedToday: 5,
  systemStatus: "healthy",
  serverUptime: "99.9%",
}

const recentActivity = [
  { id: 1, type: "user_signup", user: "John Doe", timestamp: "2 minutes ago" },
  { id: 2, type: "book_added", book: "The Psychology of Money", timestamp: "15 minutes ago" },
  { id: 3, type: "user_completed", user: "Jane Smith", book: "Atomic Habits", timestamp: "1 hour ago" },
  { id: 4, type: "system_update", message: "Database backup completed", timestamp: "2 hours ago" },
]

const systemAlerts = [
  { id: 1, type: "warning", message: "High server load detected", timestamp: "30 minutes ago" },
  { id: 2, type: "info", message: "Scheduled maintenance in 2 days", timestamp: "1 hour ago" },
  { id: 3, type: "success", message: "Security scan completed successfully", timestamp: "3 hours ago" },
]

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview")

  // Simple admin check - in real app this would be more robust
  const isAdmin = true // This would come from auth context

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-red-500" />
              <span>Access Denied</span>
            </CardTitle>
            <CardDescription>You don't have permission to access the admin panel.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

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
                <Link href="/admin" className="text-primary font-medium">
                  Admin
                </Link>
                <UserProfileMenu />
              </nav>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your SoundBook platform</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{adminStats.totalUsers.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
                <Badge variant="secondary" className="mt-1 text-xs">
                  +{adminStats.newUsersToday} today
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{adminStats.totalBooks.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Books</div>
                <Badge variant="secondary" className="mt-1 text-xs">
                  +{adminStats.booksAddedToday} today
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{adminStats.totalListeningHours.toLocaleString()}h</div>
                <div className="text-sm text-muted-foreground">Listening Hours</div>
                <Badge variant="secondary" className="mt-1 text-xs">
                  This month
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Activity className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{adminStats.activeUsers}</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
                <Badge variant="secondary" className="mt-1 text-xs">
                  Last 30 days
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Admin Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>Recent Activity</span>
                    </CardTitle>
                    <CardDescription>Latest platform activity</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg bg-muted/50">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm">
                            {activity.type === "user_signup" && (
                              <>
                                New user <span className="font-medium">{activity.user}</span> signed up
                              </>
                            )}
                            {activity.type === "book_added" && (
                              <>
                                Book <span className="font-medium">"{activity.book}"</span> was added
                              </>
                            )}
                            {activity.type === "user_completed" && (
                              <>
                                <span className="font-medium">{activity.user}</span> completed "{activity.book}"
                              </>
                            )}
                            {activity.type === "system_update" && activity.message}
                          </p>
                          <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span>System Alerts</span>
                    </CardTitle>
                    <CardDescription>Important system notifications</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {systemAlerts.map((alert) => (
                      <div key={alert.id} className="flex items-center space-x-4 p-3 rounded-lg bg-muted/50">
                        {alert.type === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        {alert.type === "info" && <Activity className="h-4 w-4 text-blue-500" />}
                        {alert.type === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
                        <div className="flex-1">
                          <p className="text-sm">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">{alert.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">User Management</h3>
                <div className="space-x-2">
                  <Button variant="outline" asChild>
                    <Link href="/admin/users">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Users
                    </Link>
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>User Statistics</CardTitle>
                  <CardDescription>Overview of user activity and engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{adminStats.activeUsers}</div>
                      <div className="text-sm text-muted-foreground">Active Users</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{adminStats.newUsersToday}</div>
                      <div className="text-sm text-muted-foreground">New Today</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{adminStats.serverUptime}</div>
                      <div className="text-sm text-muted-foreground">Uptime</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Content Management</h3>
                <div className="space-x-2">
                  <Button variant="outline">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Add Book
                  </Button>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Categories
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Content Statistics</CardTitle>
                  <CardDescription>Overview of audiobook library and content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{adminStats.totalBooks}</div>
                      <div className="text-sm text-muted-foreground">Total Books</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{adminStats.booksAddedToday}</div>
                      <div className="text-sm text-muted-foreground">Added Today</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">15</div>
                      <div className="text-sm text-muted-foreground">Categories</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">System Management</h3>
                <div className="space-x-2">
                  <Button variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    System Settings
                  </Button>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Monitor system performance and status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      </div>
                      <div className="text-sm font-medium">System Status</div>
                      <div className="text-xs text-muted-foreground capitalize">{adminStats.systemStatus}</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{adminStats.serverUptime}</div>
                      <div className="text-sm text-muted-foreground">Server Uptime</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">2.1GB</div>
                      <div className="text-sm text-muted-foreground">Memory Usage</div>
                    </div>
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
