"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { Upload, ImageIcon, Trash2, Eye } from "lucide-react"

interface LogoUploaderProps {
  currentLogo?: string
  onLogoUpdate?: (logoUrl: string) => void
}

export function LogoUploader({ currentLogo, onLogoUpdate }: LogoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(currentLogo || "")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const supabase = createClient()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB")
      return
    }

    setIsUploading(true)
    setSaveSuccess(false)

    try {
      // Create preview
      const preview = URL.createObjectURL(file)
      setPreviewUrl(preview)

      // Upload to Blob storage
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-logo", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload logo")
      }

      const { url } = await response.json()
      setLogoUrl(url)

      // Save to database
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { error } = await supabase.from("profiles").update({ logo_url: url }).eq("id", user.id)

        if (error) throw error
      }

      onLogoUpdate?.(url)

      // Clean up preview
      URL.revokeObjectURL(preview)
      setPreviewUrl(null)

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error("Error uploading logo:", error)
      alert(`Failed to upload logo: ${error instanceof Error ? error.message : "Please try again."}`)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    try {
      setSaveSuccess(false)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { error } = await supabase.from("profiles").update({ logo_url: null }).eq("id", user.id)

        if (error) throw error
      }

      setLogoUrl("")
      onLogoUpdate?.("")

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error("Error removing logo:", error)
      alert(`Failed to remove logo: ${error instanceof Error ? error.message : "Please try again."}`)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Brand Logo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {saveSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium">✓ Logo settings saved successfully!</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="logo-upload">Upload Logo</Label>
          <div className="flex items-center gap-4">
            <Input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => document.getElementById("logo-upload")?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Uploading..." : "Browse"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Recommended: PNG or SVG format, max 5MB. Ideal size: 200x60px
            <br />
            <span className="text-green-600">Settings are saved automatically when you upload or remove a logo.</span>
          </p>
        </div>

        {(logoUrl || previewUrl) && (
          <div className="space-y-3">
            <Label>Current Logo</Label>
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
              <div className="w-32 h-16 bg-white rounded border flex items-center justify-center overflow-hidden">
                <img src={previewUrl || logoUrl} alt="Brand Logo" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{previewUrl ? "Preview (uploading...)" : "Current Logo"}</p>
                <p className="text-xs text-muted-foreground">This logo will appear in the app header</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(previewUrl || logoUrl, "_blank")}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleRemoveLogo} disabled={isUploading}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
