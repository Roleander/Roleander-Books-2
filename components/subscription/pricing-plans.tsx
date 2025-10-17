"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Check, Crown, Star, Zap } from "lucide-react"

interface PricingPlansProps {
  onSubscriptionSelect: (tier: string, expiresAt: string) => void
  currentTier?: string
}

export function PricingPlans({ onSubscriptionSelect, currentTier }: PricingPlansProps) {
  const [isYearly, setIsYearly] = useState(false)
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleSubscribe = async (planType: string) => {
    setIsLoading(planType)

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Calculate expiry date
    const expiryDate = new Date()
    if (planType === "monthly") {
      expiryDate.setMonth(expiryDate.getMonth() + 1)
    } else if (planType === "yearly") {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
    }

    onSubscriptionSelect("premium", expiryDate.toISOString())
    setIsLoading(null)
  }

  const plans = [
    {
      id: "free",
      name: "Free",
      description: "Perfect for getting started",
      price: { monthly: 0, yearly: 0 },
      features: [
        "Access to free audiobooks",
        "Basic voice recognition",
        "Limited bookmarks (5 max)",
        "Community support",
        "Standard audio quality",
      ],
      limitations: ["No premium content access", "Limited interactive features", "Ads between chapters"],
      buttonText: "Current Plan",
      disabled: true,
      icon: <Star className="h-5 w-5" />,
    },
    {
      id: "premium",
      name: "Premium",
      description: "Full access to all features",
      price: { monthly: 9.99, yearly: 99.99 },
      yearlyDiscount: "Save 17%",
      features: [
        "Access to ALL audiobooks",
        "Exclusive premium interactive stories",
        "Advanced voice recognition",
        "Unlimited bookmarks & sync",
        "Early access to new releases",
        "Priority customer support",
        "High-quality audio streaming",
        "Offline downloads",
        "Ad-free experience",
        "Custom voice commands",
      ],
      buttonText: currentTier === "premium" ? "Current Plan" : "Upgrade Now",
      disabled: false,
      popular: true,
      icon: <Crown className="h-5 w-5" />,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-serif font-bold">Choose Your Plan</h1>
        <p className="text-muted-foreground text-lg">Unlock the full potential of interactive audiobook storytelling</p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4">
          <Label htmlFor="billing-toggle" className={!isYearly ? "font-medium" : "text-muted-foreground"}>
            Monthly
          </Label>
          <Switch id="billing-toggle" checked={isYearly} onCheckedChange={setIsYearly} />
          <Label htmlFor="billing-toggle" className={isYearly ? "font-medium" : "text-muted-foreground"}>
            Yearly
          </Label>
          {isYearly && <Badge variant="secondary">Save 17%</Badge>}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative ${
              plan.popular
                ? "border-2 border-primary shadow-xl scale-105"
                : "border-border/50 hover:shadow-lg transition-shadow"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="gap-2 bg-gradient-to-r from-accent to-primary px-4 py-1">
                  <Zap className="h-3 w-3" />
                  Most Popular
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-8">
              <div className="flex items-center justify-center gap-2 mb-2">
                {plan.icon}
                <CardTitle className="font-serif text-2xl">{plan.name}</CardTitle>
              </div>
              <CardDescription className="text-base">{plan.description}</CardDescription>

              <div className="pt-4">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">${isYearly ? plan.price.yearly : plan.price.monthly}</span>
                  {plan.price.monthly > 0 && (
                    <span className="text-muted-foreground">/{isYearly ? "year" : "month"}</span>
                  )}
                </div>
                {isYearly && plan.yearlyDiscount && plan.price.monthly > 0 && (
                  <p className="text-sm text-green-600 font-medium mt-1">{plan.yearlyDiscount}</p>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Features */}
              <div className="space-y-3">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Limitations (for free plan) */}
              {plan.limitations && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <p className="text-sm font-medium text-muted-foreground">Limitations:</p>
                  {plan.limitations.map((limitation, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="h-4 w-4 mt-0.5 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
                        <div className="h-1 w-1 bg-muted-foreground rounded-full" />
                      </div>
                      <span className="text-sm text-muted-foreground">{limitation}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Button */}
              <Button
                className="w-full h-12"
                variant={plan.popular ? "default" : "outline"}
                disabled={plan.disabled || currentTier === "premium"}
                onClick={() => handleSubscribe(isYearly ? "yearly" : "monthly")}
              >
                {isLoading === (isYearly ? "yearly" : "monthly")
                  ? "Processing..."
                  : currentTier === "premium" && plan.id === "premium"
                    ? "Current Plan"
                    : plan.buttonText}
              </Button>

              {plan.id === "premium" && (
                <p className="text-xs text-center text-muted-foreground">
                  Cancel anytime. No hidden fees. 7-day free trial included.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="max-w-2xl mx-auto space-y-6 pt-12">
        <h2 className="text-2xl font-serif font-bold text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Can I cancel my subscription anytime?</h3>
              <p className="text-sm text-muted-foreground">
                Yes, you can cancel your subscription at any time. You'll continue to have access to premium features
                until the end of your billing period.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">What happens to my progress if I downgrade?</h3>
              <p className="text-sm text-muted-foreground">
                Your listening progress and bookmarks are always saved. If you downgrade, you'll lose access to premium
                content but can upgrade again anytime to restore full access.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-sm text-muted-foreground">
                We offer a 7-day money-back guarantee for new subscribers. If you're not satisfied, contact our support
                team for a full refund.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
