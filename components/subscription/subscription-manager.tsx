"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ArrowLeft, Crown, Check, Star, Zap } from "lucide-react"
import { PricingPlans } from "./pricing-plans"

interface UserProfile {
  id: string
  full_name: string
  email: string
  subscription_tier: string
  subscription_expires_at: string | null
}

export function SubscriptionManager() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showPricing, setShowPricing] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (error) throw error
      setUserProfile(data)
    } catch (error) {
      console.error("Error fetching user profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = () => {
    setShowPricing(true)
  }

  const handleSubscriptionUpdate = async (tier: string, expiresAt: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_tier: tier,
          subscription_expires_at: expiresAt,
        })
        .eq("id", user.id)

      if (error) throw error

      // Refresh profile data
      await fetchUserProfile()
      setShowPricing(false)
    } catch (error) {
      console.error("Error updating subscription:", error)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const isSubscriptionActive = () => {
    if (!userProfile?.subscription_expires_at) return false
    return new Date(userProfile.subscription_expires_at) > new Date()
  }

  const getDaysUntilExpiry = () => {
    if (!userProfile?.subscription_expires_at) return 0
    const expiryDate = new Date(userProfile.subscription_expires_at)
    const today = new Date()
    const diffTime = expiryDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-32" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (showPricing) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Button variant="ghost" onClick={() => setShowPricing(false)} className="gap-2 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Subscription
        </Button>
        <PricingPlans onSubscriptionSelect={handleSubscriptionUpdate} currentTier={userProfile?.subscription_tier} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </Button>

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-serif font-bold">Subscription Management</h1>
          <p className="text-muted-foreground text-lg">
            Manage your AudioStory subscription and access premium content
          </p>
        </div>

        {/* Current Subscription Status */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif text-2xl">Current Plan</CardTitle>
                <CardDescription>Your subscription details and benefits</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {userProfile?.subscription_tier === "premium" ? (
                  <Badge className="gap-2 bg-gradient-to-r from-accent to-primary">
                    <Crown className="h-4 w-4" />
                    Premium
                  </Badge>
                ) : (
                  <Badge variant="outline">Free</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Plan Type</h3>
                <p className="text-lg font-semibold capitalize">{userProfile?.subscription_tier || "Free"}</p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Status</h3>
                <p className="text-lg font-semibold">
                  {userProfile?.subscription_tier === "premium" && isSubscriptionActive() ? (
                    <span className="text-green-600">Active</span>
                  ) : userProfile?.subscription_tier === "premium" ? (
                    <span className="text-red-600">Expired</span>
                  ) : (
                    <span className="text-muted-foreground">Free Plan</span>
                  )}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">
                  {userProfile?.subscription_tier === "premium" ? "Expires" : "Upgrade Available"}
                </h3>
                <p className="text-lg font-semibold">
                  {userProfile?.subscription_tier === "premium"
                    ? formatDate(userProfile.subscription_expires_at)
                    : "Anytime"}
                </p>
              </div>
            </div>

            {/* Expiry Warning */}
            {userProfile?.subscription_tier === "premium" && isSubscriptionActive() && getDaysUntilExpiry() <= 7 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-800">
                    Your premium subscription expires in {getDaysUntilExpiry()} day
                    {getDaysUntilExpiry() !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            )}

            {/* Plan Benefits */}
            <div className="space-y-4">
              <h3 className="font-serif font-semibold text-lg">
                {userProfile?.subscription_tier === "premium" ? "Premium Benefits" : "Current Benefits"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userProfile?.subscription_tier === "premium" ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-600" />
                      <span>Access to all premium audiobooks</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-600" />
                      <span>Exclusive interactive stories</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-600" />
                      <span>Early access to new releases</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-600" />
                      <span>Advanced voice recognition features</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-600" />
                      <span>Unlimited bookmarks and progress sync</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-600" />
                      <span>Priority customer support</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-600" />
                      <span>Access to free audiobooks</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-600" />
                      <span>Basic voice recognition</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-600" />
                      <span>Limited bookmarks (5 max)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-600" />
                      <span>Community support</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              {userProfile?.subscription_tier === "premium" && isSubscriptionActive() ? (
                <Button variant="outline" onClick={handleUpgrade}>
                  Manage Subscription
                </Button>
              ) : (
                <Button onClick={handleUpgrade} className="gap-2">
                  <Crown className="h-4 w-4" />
                  Upgrade to Premium
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Premium Preview */}
        {userProfile?.subscription_tier !== "premium" && (
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Star className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="font-serif text-xl">Unlock Premium Content</CardTitle>
                  <CardDescription>
                    Get access to exclusive interactive audiobooks and advanced features
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Exclusive Stories</h3>
                  <p className="text-sm text-muted-foreground">
                    Access premium interactive audiobooks with complex branching narratives
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Enhanced Features</h3>
                  <p className="text-sm text-muted-foreground">
                    Advanced voice recognition, unlimited bookmarks, and priority support
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Early Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Be the first to experience new releases and beta features
                  </p>
                </div>
              </div>
              <div className="text-center">
                <Button size="lg" onClick={handleUpgrade} className="gap-2">
                  <Crown className="h-5 w-5" />
                  View Premium Plans
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
