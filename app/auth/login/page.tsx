"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Shield, Headphones } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showBootstrap, setShowBootstrap] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkForAdmins()
  }, [])

  const checkForAdmins = async () => {
    const supabase = createClient()
    try {
      console.log("[v0] Checking for admin users...")
      const { data, error } = await supabase.rpc("has_admin_users")

      if (error) {
        console.log("[v0] Error calling has_admin_users:", error)
        if (error.message.includes("function") && error.message.includes("has_admin_users")) {
          console.log("[v0] Admin functions don't exist, showing bootstrap")
          setShowBootstrap(true)
          setError("Please run the database migration first")
          return
        }
        throw error
      }

      const hasAdmins = data === true
      console.log("[v0] Admin check result:", { hasAdmins })
      setShowBootstrap(!hasAdmins)

      if (hasAdmins) {
        setError(null)
      }
    } catch (error) {
      console.error("[v0] Error checking for admins:", error)
      setShowBootstrap(true)
      setError("Database connection issue. Please check your Supabase configuration.")
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      console.log("[v0] Attempting login...")
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.log("[v0] Login error:", error)
        throw error
      }

      console.log("[v0] Login successful, redirecting to library")

      if (data.user) {
        localStorage.setItem(
          "demo_user",
          JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            role: "user",
            name: data.user.email?.split("@")[0] || "User",
          }),
        )
      }

      router.push("/library")
    } catch (error: unknown) {
      console.error("[v0] Login failed:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBootstrapAdmin = async () => {
    if (!email || !password) {
      setError("Please enter email and password first")
      return
    }

    const supabase = createClient()
    setIsBootstrapping(true)
    setError(null)

    try {
      console.log("[v0] Attempting to sign in for bootstrap")
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.log("[v0] Auth error:", authError)
        throw authError
      }

      if (authData.user) {
        console.log("[v0] User authenticated, using bootstrap function")
        try {
          const { data: bootstrapResult, error: bootstrapError } = await supabase.rpc("bootstrap_first_admin", {
            user_id: authData.user.id,
          })

          if (bootstrapError) {
            console.log("[v0] Bootstrap function error:", bootstrapError)
            if (
              bootstrapError.message.includes("function") &&
              bootstrapError.message.includes("bootstrap_first_admin")
            ) {
              setError("Database migration required. Please check Supabase setup.")
              return
            }
            throw bootstrapError
          }

          if (bootstrapResult === true) {
            console.log("[v0] Successfully made user admin, redirecting")
            await checkForAdmins()
            router.push("/admin")
          } else {
            setError("Bootstrap failed: Admin users already exist or user not found")
          }
        } catch (updateError) {
          console.log("[v0] Database bootstrap failed:", updateError)
          setError("Database migration required. Please check Supabase setup.")
        }
      }
    } catch (error: unknown) {
      console.log("[v0] Bootstrap failed:", error)
      setError(error instanceof Error ? error.message : "Failed to bootstrap admin")
    } finally {
      setIsBootstrapping(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <Headphones className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-serif">AudioStory</h1>
          <p className="text-muted-foreground mt-2">Welcome back to your audio library</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Introduce tus credenciales para acceder a la biblioteca de audiolibros</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {showBootstrap && (
              <div className="mt-6 p-4 border border-border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">First Time Setup</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  No admin users found. You can make yourself an admin to access the admin panel.
                </p>
                <Button
                  onClick={handleBootstrapAdmin}
                  variant="outline"
                  className="w-full bg-transparent"
                  disabled={isBootstrapping}
                >
                  {isBootstrapping ? "Setting up admin..." : "Make Me Admin"}
                </Button>
              </div>
            )}

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/auth/signup" className="text-primary hover:underline font-medium">
                Create one here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
