"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SeriesGrid } from "./series-grid"
import { FavoritesGrid } from "./favorites-grid"
import { ListeningProgress } from "./listening-progress"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Search, LogOut, Crown, CreditCard, LogIn, User } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface UserProfile {
  full_name: string
  email: string
  subscription_tier: string
  logo_url?: string
  role?: string
}

interface LibraryDashboardProps {
  user?: any
}

export function LibraryDashboard({ user }: LibraryDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const initializeUser = async () => {
      setIsLoading(true)

      try {
        // Always check for current session first
        const {
          data: { user: sessionUser },
        } = await supabase.auth.getUser()

        if (sessionUser) {
          console.log("[v0] Found authenticated user:", sessionUser.email)
          setCurrentUser(sessionUser)
          await fetchUserProfileForUser(sessionUser)
        } else {
          console.log("[v0] No authenticated user found")
          setCurrentUser(null)
        }
      } catch (error) {
        console.error("[v0] Error checking authentication:", error)
      }

      setIsLoading(false)
    }

    initializeUser()
  }, [])

  const fetchUserProfileForUser = async (targetUser: any) => {
    try {
      console.log("[v0] Fetching user profile for user ID:", targetUser.id)
      console.log("[v0] User email:", targetUser.email)

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetUser.id)
        .single()

      console.log("[v0] Profile query result:", profileData)
      console.log("[v0] Profile query error:", profileError)

      if (profileData) {
        console.log("[v0] Found existing profile with role:", profileData.role)
        setUserProfile(profileData)
        return
      }

      console.log("[v0] No profile found, creating fallback profile...")

      const fallbackProfile = {
        id: targetUser.id,
        email: targetUser.email,
        role: "user",
        full_name: targetUser.email?.split("@")[0] || targetUser.user_metadata?.full_name || "User",
        subscription_tier: "free",
      }

      setUserProfile(fallbackProfile)

      // Try to create profile in background
      try {
        const { data: adminCheck } = await supabase.from("profiles").select("id").eq("role", "admin").limit(1)

        const shouldBeAdmin = !adminCheck || adminCheck.length === 0
        const newRole = shouldBeAdmin ? "admin" : "user"
        const newTier = shouldBeAdmin ? "premium" : "free"

        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .upsert({
            id: targetUser.id,
            email: targetUser.email,
            role: newRole,
            full_name: targetUser.email?.split("@")[0] || targetUser.user_metadata?.full_name || "User",
            subscription_tier: newTier,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (!createError && newProfile) {
          console.log("[v0] Profile created successfully:", newProfile)
          setUserProfile(newProfile)
        }
      } catch (bgError) {
        console.error("[v0] Background profile creation failed:", bgError)
      }
    } catch (error) {
      console.error("[v0] Unexpected error in fetchUserProfileForUser:", error)
      // Always provide a fallback profile
      const fallbackProfile = {
        id: targetUser.id,
        email: targetUser.email,
        role: "user",
        full_name: targetUser.email?.split("@")[0] || targetUser.user_metadata?.full_name || "User",
        subscription_tier: "free",
      }
      setUserProfile(fallbackProfile)
    }
  }

  const fetchUserProfile = async () => {
    if (!user) return
    await fetchUserProfileForUser(user)
  }

  const promoteToAdmin = async () => {
    const targetUser = user || (await supabase.auth.getUser()).data.user
    if (!targetUser) return

    try {
      console.log("[v0] Manually promoting user to admin...")

      const { data: updatedProfile, error } = await supabase
        .from("profiles")
        .update({
          role: "admin",
          subscription_tier: "premium",
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetUser.id)
        .select()
        .single()

      if (error) {
        console.error("[v0] Failed to promote to admin:", error)
      } else {
        console.log("[v0] Successfully promoted to admin:", updatedProfile)
        setUserProfile(updatedProfile)
      }
    } catch (error) {
      console.error("[v0] Error promoting to admin:", error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const [currentUser, setCurrentUser] = useState<any>(null)
  const isAuthenticated = !!currentUser

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-3">
                {userProfile?.logo_url ? (
                  <img
                    src={userProfile.logo_url || "/placeholder.svg"}
                    alt="Brand Logo"
                    className="h-16 w-auto max-w-[200px] object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-lg">RB</span>
                    </div>
                  </div>
                )}
                <div className="hidden sm:block">
                  <h1 className="text-xl sm:text-2xl font-serif font-bold text-foreground">Roleander Books</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">Bienvenido a tu viaje literario </p>
                </div>
              </div>

              {/* Search - Hidden on mobile, shown in separate row */}
              <div className="relative hidden lg:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search series, authors, narrators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 xl:w-80 bg-background/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {!isAuthenticated && !isLoading && (
                <Badge variant="secondary" className="hidden sm:flex">
                  Guest Mode
                </Badge>
              )}

              {userProfile?.subscription_tier === "premium" && (
                <div className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-accent/20 rounded-full">
                  <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-accent" />
                  <span className="text-xs sm:text-sm font-medium text-accent hidden sm:inline">Premium</span>
                </div>
              )}

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                          {userProfile?.full_name
                            ? getInitials(userProfile.full_name)
                            : currentUser?.email
                              ? getInitials(currentUser.email.split("@")[0])
                              : "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">
                          {userProfile?.full_name || currentUser?.email?.split("@")[0] || "User"}
                        </p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {userProfile?.email || currentUser?.email}
                        </p>
                        {userProfile?.subscription_tier && (
                          <Badge
                            variant={userProfile.subscription_tier === "premium" ? "default" : "secondary"}
                            className="text-xs w-fit"
                          >
                            {userProfile.subscription_tier === "premium" ? "Premium" : "Free"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/subscription")} className="cursor-pointer">
                      <CreditCard className="mr-2 h-4 w-4 text-blue-600" />
                      <div className="flex flex-col">
                        <span>Subscription</span>
                        <span className="text-xs text-muted-foreground">
                          {userProfile?.subscription_tier === "premium" ? "Manage Premium" : "Upgrade to Premium"}
                        </span>
                      </div>
                    </DropdownMenuItem>
                    {/* Admin menu - show if user has admin role */}
                    {userProfile?.role === "admin" || userProfile?.role === "Admin" ? (
                      <DropdownMenuItem onClick={() => router.push("/admin")} className="cursor-pointer">
                        <Crown className="mr-2 h-4 w-4 text-amber-600" />
                        <div className="flex flex-col">
                          <span>Admin Panel</span>
                          <span className="text-xs text-muted-foreground">Manage platform</span>
                        </div>
                      </DropdownMenuItem>
                    ) : null}
                    {/* Profile menu - show for all authenticated users */}
                    <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4 text-gray-600" />
                      <div className="flex flex-col">
                        <span>Profile Settings</span>
                        <span className="text-xs text-muted-foreground">Edit your information</span>
                      </div>
                    </DropdownMenuItem>
                    {process.env.NODE_ENV === "development" && (
                      <DropdownMenuItem onClick={promoteToAdmin} className="cursor-pointer">
                        <Crown className="mr-2 h-4 w-4 text-orange-600" />
                        <div className="flex flex-col">
                          <span>Make Admin (Dev)</span>
                          <span className="text-xs text-muted-foreground">Promote to admin role</span>
                        </div>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => router.push("/auth/login")} size="sm" className="text-xs sm:text-sm">
                  <LogIn className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Search */}
          <div className="relative lg:hidden mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search series, authors, narrators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>

          {!isAuthenticated && !isLoading && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Welcome!</strong> You're browsing as a guest.
                <Button
                  variant="link"
                  className="p-0 h-auto text-blue-600 underline ml-1"
                  onClick={() => router.push("/auth/signup")}
                >
                  Create an account
                </Button>{" "}
                to save your progress and access premium content.
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <Tabs defaultValue="browse" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-fit">
            <TabsTrigger value="browse" className="text-xs sm:text-sm">
              Browse
            </TabsTrigger>
            <TabsTrigger value="progress" className="text-xs sm:text-sm" disabled={!isAuthenticated}>
              <span className="hidden sm:inline">Continue Listening</span>
              <span className="sm:hidden">Progress</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="text-xs sm:text-sm" disabled={!isAuthenticated}>
              Favorites
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4 sm:space-y-6">
            <SeriesGrid searchQuery={searchQuery} />
          </TabsContent>

          <TabsContent value="progress" className="space-y-4 sm:space-y-6">
            {isAuthenticated ? (
              <ListeningProgress />
            ) : (
              <div className="text-center text-muted-foreground">Sign in to view your progress</div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4 sm:space-y-6">
            {isAuthenticated ? (
              <FavoritesGrid />
            ) : (
              <div className="text-center text-muted-foreground">Sign in to view your favorites</div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
