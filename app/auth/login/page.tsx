"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BrandHeader } from "@/components/ui/brand-header"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Shield } from "lucide-react"

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
          setError("Please run the database migration first: scripts/012_complete_system_fix.sql")
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
      setError("Database connection issue. Please run: scripts/012_complete_system_fix.sql")
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push("/library")
    } catch (error: unknown) {
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
              setError("Database migration required. Please run: scripts/013_emergency_system_fix.sql")
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
          setError("Database migration required. Please run: scripts/013_emergency_system_fix.sql")
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <BrandHeader fallbackTitle="Roleander Books" subtitle="Bienvenido a tu viaje literario" logoSize="md" />

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-serif">Sign In</CardTitle>
            <CardDescription>Introduce tus credenciales para acceder a la biblioteca de audiolibros </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>
              {error && (
                <div className="text-red-800 bg-red-50 border border-red-200 p-3 rounded-md text-sm font-medium">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {showBootstrap && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">First Time Setup</span>
                </div>
                <p className="text-xs text-amber-700 mb-3">
                  No admin users found. You can make yourself an admin to access the admin panel.
                </p>
                <Button
                  onClick={handleBootstrapAdmin}
                  disabled={isBootstrapping || !email || !password}
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 bg-transparent"
                >
                  {isBootstrapping ? "Setting up admin..." : "Make Me Admin"}
                </Button>
              </div>
            )}

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link
                href="/auth/signup"
                className="text-primary hover:text-primary/80 font-medium underline underline-offset-4"
              >
                Create one here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
