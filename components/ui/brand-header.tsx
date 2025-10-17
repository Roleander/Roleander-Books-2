"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import Image from "next/image"

interface BrandHeaderProps {
  fallbackTitle?: string
  subtitle?: string
  logoSize?: "sm" | "md" | "lg"
}

export function BrandHeader({
  fallbackTitle = "Roleander Books",
  subtitle = "Interactive Audiobook Platform",
  logoSize = "md",
}: BrandHeaderProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase.rpc("get_user_profile", { user_id: user.id })

        if (error) {
          console.log("Error fetching logo:", error)
        } else if (data && data.length > 0 && data[0].logo_url) {
          setLogoUrl(data[0].logo_url)
        }
      } catch (error) {
        console.log("No logo found, using fallback:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLogo()
  }, [])

  const sizeClasses = {
    sm: "h-12 max-w-[160px]",
    md: "h-16 max-w-[200px]",
    lg: "h-20 max-w-[240px]",
  }

  const textSizeClasses = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
  }

  if (loading) {
    return (
      <div className="text-center mb-8">
        <div className="animate-pulse">
          <div className="h-16 w-48 bg-muted rounded mx-auto mb-2"></div>
          <div className="h-4 w-64 bg-muted rounded mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center mb-8">
      {logoUrl ? (
        <div className="flex flex-col items-center space-y-3">
          <Image
            src={logoUrl || "/placeholder.svg"}
            alt="Brand Logo"
            width={240}
            height={80}
            className={`${sizeClasses[logoSize]} object-contain`}
            priority
          />
          {subtitle && <p className="text-muted-foreground text-base">{subtitle}</p>}
        </div>
      ) : (
        <>
          <h1 className={`${textSizeClasses[logoSize]} font-serif font-bold text-foreground mb-2`}>{fallbackTitle}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </>
      )}
    </div>
  )
}
