"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Users, Shield, ShieldCheck, Mail, Search } from "lucide-react"

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  subscription_tier: "free" | "premium"
  role: "user" | "admin"
  created_at: string
}

export function UserManager() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentUserEmail, setCurrentUserEmail] = useState("")
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
    getCurrentUser()
  }, [])

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserEmail(user.email || "")
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin"

    try {
      const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId)

      if (error) throw error

      setUsers(users.map((user) => (user.id === userId ? { ...user, role: newRole as "user" | "admin" } : user)))

      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      })
    } catch (error) {
      console.error("Error updating user role:", error)
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      })
    }
  }

  const makeCurrentUserAdmin = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("No authenticated user")

      const { error } = await supabase.from("profiles").update({ role: "admin" }).eq("id", user.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "You are now an admin! Please refresh the page.",
      })

      // Refresh the page to update permissions
      window.location.reload()
    } catch (error) {
      console.error("Error making current user admin:", error)
      toast({
        title: "Error",
        description: "Failed to grant admin permissions",
        variant: "destructive",
      })
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Admin Access */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Shield className="h-5 w-5" />
            Quick Admin Access
          </CardTitle>
          <CardDescription className="text-orange-700">
            If you need admin access immediately, click the button below to grant yourself admin permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-orange-700">
                Current user: <span className="font-medium">{currentUserEmail}</span>
              </p>
            </div>
            <Button onClick={makeCurrentUserAdmin} className="bg-orange-600 hover:bg-orange-700 text-white">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Make Me Admin
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="search">Search Users</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{user.full_name || "No name"}</h3>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                      <Badge variant={user.subscription_tier === "premium" ? "default" : "outline"}>
                        {user.subscription_tier}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={user.role === "admin" ? "destructive" : "default"}
                    size="sm"
                    onClick={() => toggleUserRole(user.id, user.role)}
                    className="gap-2"
                  >
                    {user.role === "admin" ? (
                      <>
                        <Shield className="h-4 w-4" />
                        Remove Admin
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Make Admin
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No users found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Try adjusting your search terms." : "No users have registered yet."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
