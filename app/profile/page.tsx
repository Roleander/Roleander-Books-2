"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, Crown, User, Calendar, CreditCard, Settings, Palette, Shield, LogOut, Key, Trophy } from "lucide-react"
import { CharacterSheet } from "@/components/character/character-sheet"
import { NotificationManager } from "@/components/ui/item-notification"
import { useRouter } from "next/navigation"

interface UserProfile {
  id: string
  full_name: string
  email: string
  subscription_tier: string
  subscription_expires_at: string | null
  created_at: string
  role?: string
  logo_url?: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState("")
  const [subscriptionTier, setSubscriptionTier] = useState("")
  const [theme, setTheme] = useState("light")
  const [notifications, setNotifications] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // For demo mode, create a mock user
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl === 'https://demo.supabase.co') {
      console.log("[Demo] Creating mock user for testing")
      const mockUser = {
        id: 'demo-user-123',
        email: 'demo@example.com',
        user_metadata: { full_name: 'Demo User' }
      }
      setUser(mockUser)
      setProfile({
        id: mockUser.id,
        full_name: 'Demo User',
        email: mockUser.email,
        subscription_tier: 'free',
        subscription_expires_at: null,
        created_at: new Date().toISOString(),
        role: 'user'
      })
      setFullName('Demo User')
      setSubscriptionTier('free')
      setLoading(false)
    } else {
      checkUser()
    }
  }, [])

  const checkUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)
      await fetchProfile(user.id)
    } catch (error) {
      console.error("Error checking user:", error)
      router.push("/auth/login")
    } finally {
      setLoading(false)
    }
  }

  const fetchProfile = async (userId: string) => {
    try {
      console.log("[v0] Fetching profile for user:", userId)

      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found" error
        console.log("[v0] Error fetching profile:", error)
        throw error
      }

      if (data) {
        console.log("[v0] Profile found:", data)
        setProfile(data)
        setFullName(data.full_name || "")
        setSubscriptionTier(data.subscription_tier || "free")
        console.log("[v0] Profile loaded successfully")
      } else {
        console.log("[v0] No profile found, creating new profile")
        await createProfile(userId)
      }
    } catch (error) {
      console.error("[v0] Error fetching profile:", error)
      await createProfile(userId)
    }
  }

  const createProfile = async (userId: string) => {
    try {
      console.log("[v0] Creating new profile for user:", userId)

      // Check if any admin exists
      const { data: adminCheck } = await supabase.from("profiles").select("id").eq("role", "admin").limit(1)

      const isFirstUser = !adminCheck || adminCheck.length === 0

      const newProfile = {
        id: userId,
        full_name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User",
        email: user?.email || "",
        subscription_tier: "free",
        role: isFirstUser ? "admin" : "user",
        created_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("profiles").insert([newProfile]).select().single()

      if (error) {
        console.error("[v0] Error creating profile:", error)
        setProfile({
          id: userId,
          full_name: newProfile.full_name,
          email: newProfile.email,
          subscription_tier: "free",
          subscription_expires_at: null,
          created_at: new Date().toISOString(),
          role: newProfile.role,
        })
        setFullName(newProfile.full_name)
        setSubscriptionTier("free")
      } else {
        console.log("[v0] Profile created successfully:", data)
        setProfile(data)
        setFullName(data.full_name || "")
      }
    } catch (error) {
      console.error("[v0] Error in createProfile:", error)
      const fallbackProfile = {
        id: userId,
        full_name: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User",
        email: user?.email || "",
        subscription_tier: "free",
        subscription_expires_at: null,
        created_at: new Date().toISOString(),
        role: "user",
      }
      setProfile(fallbackProfile)
      setFullName(fallbackProfile.full_name)
      setSubscriptionTier(fallbackProfile.subscription_tier)
    }
  }

  const handleSaveProfile = async () => {
    if (!user || !profile) return

    setSaving(true)
    try {
      console.log("[v0] Updating profile for user:", user.id)

      const { data, error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, subscription_tier: subscriptionTier })
        .eq("id", user.id)
        .select()
        .single()

      if (error) throw error

      if (data) {
        setProfile({ ...profile, full_name: fullName, subscription_tier: subscriptionTier })
        alert("Profile updated successfully!")
        console.log("[v0] Profile updated successfully")
      } else {
        throw new Error("Failed to update profile")
      }
    } catch (error) {
      console.error("[v0] Error updating profile:", error)
      alert("Error updating profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleSubscriptionChange = (value: string) => {
    setSubscriptionTier(value)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Setting up your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <NotificationManager>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="sm" onClick={() => router.push("/library")} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Library
            </Button>
          </div>

          <div className="grid gap-6">
            {/* Character Sheet Section */}
            <div className="w-full">
              <CharacterSheet userId={user.id} />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Profile Overview */}
              <div className="md:col-span-1">
                <Card>
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                      <Avatar className="h-20 w-20">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                          {getInitials(profile.full_name || "User")}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <CardTitle className="text-xl">{profile.full_name || "User"}</CardTitle>
                    <CardDescription>{profile.email}</CardDescription>
                    <div className="flex justify-center mt-4">
                      {profile.subscription_tier === "premium" ? (
                        <Badge className="bg-accent text-accent-foreground">
                          <Crown className="h-3 w-3 mr-1" />
                          Premium Member
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Free Member</Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {formatDate(profile.created_at)}</span>
                    </div>

                    {profile.subscription_tier === "premium" && profile.subscription_expires_at && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <CreditCard className="h-4 w-4" />
                        <span>Premium until {formatDate(profile.subscription_expires_at)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Profile Settings */}
              <div className="md:col-span-1 lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Profile Information
                    </CardTitle>
                    <CardDescription>Update your personal information and preferences</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" value={profile.email} disabled className="bg-muted" />
                      <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support if needed.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subscriptionTier">Subscription Tier</Label>
                      <Select value={subscriptionTier} onValueChange={handleSubscriptionChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subscription tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving || (fullName === profile.full_name && subscriptionTier === profile.subscription_tier)}
                      className="w-full sm:w-auto"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Preferences Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Preferences
                    </CardTitle>
                    <CardDescription>Customize your experience</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <Select value={theme} onValueChange={setTheme}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notifications">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive updates about new content</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNotifications(!notifications)}
                      >
                        {notifications ? "Enabled" : "Disabled"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Settings Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Account Settings
                    </CardTitle>
                    <CardDescription>Manage your account and security</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <Key className="mr-2 h-4 w-4" />
                          Security Options
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <DropdownMenuLabel>Account Security</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => alert("Password change coming soon!")}>
                          <Key className="mr-2 h-4 w-4" />
                          Change Password
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alert("Two-factor auth coming soon!")}>
                          <Shield className="mr-2 h-4 w-4" />
                          Two-Factor Authentication
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign Out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {profile.role === "admin" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <Crown className="mr-2 h-4 w-4" />
                            Admin Panel
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuLabel>Administration</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => router.push("/admin")}>
                            <Shield className="mr-2 h-4 w-4" />
                            Admin Dashboard
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => alert("User management coming soon!")}>
                            <User className="mr-2 h-4 w-4" />
                            Manage Users
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NotificationManager>
  )

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Profile Overview */}
            <div className="md:col-span-1">
              <Card>
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                        {getInitials(profile.full_name || "User")}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <CardTitle className="text-xl">{profile.full_name || "User"}</CardTitle>
                  <CardDescription>{profile.email}</CardDescription>
                  <div className="flex justify-center mt-4">
                    {profile.subscription_tier === "premium" ? (
                      <Badge className="bg-accent text-accent-foreground">
                        <Crown className="h-3 w-3 mr-1" />
                        Premium Member
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Free Member</Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {formatDate(profile.created_at)}</span>
                  </div>

                  {profile.subscription_tier === "premium" && profile.subscription_expires_at && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                      <span>Premium until {formatDate(profile.subscription_expires_at)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Profile Settings */}
            <div className="md:col-span-1 lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>Update your personal information and preferences</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={profile.email} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support if needed.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subscriptionTier">Subscription Tier</Label>
                    <Select value={subscriptionTier} onValueChange={handleSubscriptionChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subscription tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving || (fullName === profile.full_name && subscriptionTier === profile.subscription_tier)}
                    className="w-full sm:w-auto"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>

              {/* Preferences Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Preferences
                  </CardTitle>
                  <CardDescription>Customize your experience</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive updates about new content</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNotifications(!notifications)}
                    >
                      {notifications ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Settings Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Account Settings
                  </CardTitle>
                  <CardDescription>Manage your account and security</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Key className="mr-2 h-4 w-4" />
                        Security Options
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuLabel>Account Security</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => alert("Password change coming soon!")}>
                        <Key className="mr-2 h-4 w-4" />
                        Change Password
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => alert("Two-factor auth coming soon!")}>
                        <Shield className="mr-2 h-4 w-4" />
                        Two-Factor Authentication
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {profile.role === "admin" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <Crown className="mr-2 h-4 w-4" />
                          Admin Panel
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <DropdownMenuLabel>Administration</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push("/admin")}>
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alert("User management coming soon!")}>
                          <User className="mr-2 h-4 w-4" />
                          Manage Users
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => router.push("/library")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Character Sheet Section */}
          <div className="w-full">
            <CharacterSheet userId={user.id} />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Profile Overview */}
            <div className="md:col-span-1">
              <Card>
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                        {getInitials(profile.full_name || "User")}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <CardTitle className="text-xl">{profile.full_name || "User"}</CardTitle>
                  <CardDescription>{profile.email}</CardDescription>
                  <div className="flex justify-center mt-4">
                    {profile.subscription_tier === "premium" ? (
                      <Badge className="bg-accent text-accent-foreground">
                        <Crown className="h-3 w-3 mr-1" />
                        Premium Member
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Free Member</Badge>
                    )}
                  </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {formatDate(profile.created_at)}</span>
                </div>

                {profile.subscription_tier === "premium" && profile.subscription_expires_at && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>Premium until {formatDate(profile.subscription_expires_at)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Profile Settings */}
          <div className="md:col-span-1 lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>Update your personal information and preferences</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={profile.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support if needed.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subscriptionTier">Subscription Tier</Label>
                  <Select value={subscriptionTier} onValueChange={handleSubscriptionChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subscription tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={saving || (fullName === profile.full_name && subscriptionTier === profile.subscription_tier)}
                  className="w-full sm:w-auto"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            {/* Preferences Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Preferences
                </CardTitle>
                <CardDescription>Customize your experience</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive updates about new content</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNotifications(!notifications)}
                  >
                    {notifications ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Account Settings
                </CardTitle>
                <CardDescription>Manage your account and security</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Key className="mr-2 h-4 w-4" />
                      Security Options
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Account Security</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => alert("Password change coming soon!")}>
                      <Key className="mr-2 h-4 w-4" />
                      Change Password
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => alert("Two-factor auth coming soon!")}>
                      <Shield className="mr-2 h-4 w-4" />
                      Two-Factor Authentication
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {profile.role === "admin" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <Crown className="mr-2 h-4 w-4" />
                        Admin Panel
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuLabel>Administration</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => router.push("/admin")}>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => alert("User management coming soon!")}>
                        <User className="mr-2 h-4 w-4" />
                        Manage Users
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
