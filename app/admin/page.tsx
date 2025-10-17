"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react"

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUserAndRole()
  }, [])

  const checkUserAndRole = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("[v0] Starting admin authentication check...")

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("[v0] Session error:", sessionError)
        throw new Error(`Session error: ${sessionError.message}`)
      }

      if (!session?.user) {
        console.log("[v0] No active session found, redirecting to login")
        router.push("/auth/login")
        return
      }

      const user = session.user
      setUser(user)
      console.log("[v0] User session found:", user.email)

      try {
        const { data: adminResult, error: adminError } = await supabase.rpc("check_user_admin_safe", {
          user_id: user.id,
        })

        if (adminError) {
          console.log("[v0] Admin check function error:", adminError)
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()

          if (profileError) {
            console.log("[v0] Profile query error:", profileError)
            throw new Error("Unable to verify admin status. Please ensure the database is properly set up.")
          }

          const isUserAdmin = profileData?.role === "admin" || profileData?.role === "Admin"
          setIsAdmin(isUserAdmin)
          console.log("[v0] Fallback admin check - User role:", profileData?.role, "Is admin:", isUserAdmin)
        } else {
          setIsAdmin(adminResult)
          console.log("[v0] Admin check result:", adminResult)
        }
      } catch (adminCheckError) {
        console.error("[v0] Error during admin check:", adminCheckError)
        throw new Error("Failed to verify admin privileges. Please contact support.")
      }

      if (!isAdmin) {
        setError("Access denied. Admin privileges required.")
        return
      }

      try {
        const { data: profileData, error: profileError } = await supabase.rpc("get_user_profile_safe", {
          user_id: user.id,
        })

        if (profileError) {
          console.log("[v0] Profile function error:", profileError)
          const { data: directProfile, error: directError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()

          if (!directError && directProfile) {
            setUserProfile(directProfile)
            console.log("[v0] Got profile via direct query:", directProfile)
          }
        } else if (profileData && profileData.length > 0) {
          setUserProfile(profileData[0])
          console.log("[v0] Got profile via RPC:", profileData[0])
        }
      } catch (profileError) {
        console.log("[v0] Profile fetch error (non-critical):", profileError)
        // Continue anyway since we verified admin status
      }

      console.log("[v0] Admin access verified successfully")
    } catch (error: any) {
      console.error("[v0] Error in admin authentication:", error)
      setError(error.message || "Failed to verify admin access. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    checkUserAndRole()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <h1 className="text-xl font-bold text-gray-900">Access Issue</h1>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3">
            <Button onClick={handleRetry} className="flex-1 bg-transparent" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button onClick={() => router.push("/library")} className="flex-1" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Button>
          </div>
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <p>
                <strong>Debug Info:</strong>
              </p>
              <p>User: {user?.email || "Not logged in"}</p>
              <p>Is Admin: {isAdmin ? "Yes" : "No"}</p>
              <p>Profile Role: {userProfile?.role || "Unknown"}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (isAdmin || userProfile?.role === "admin" || userProfile?.role === "Admin") {
    return <AdminDashboard />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
        <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">Admin privileges are required to access this page.</p>
        <Button onClick={() => router.push("/library")} className="w-full" variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Library
        </Button>
      </div>
    </div>
  )
}
