import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export const maxDuration = 300 // 5 minutes for large file uploads

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Upload audio API called")

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      console.log("[v0] No file provided in request")
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    console.log("[v0] File received:", file.name, file.type, file.size)

    // Validate file type (audio files only)
    if (!file.type.startsWith("audio/")) {
      console.log("[v0] Invalid file type:", file.type)
      return NextResponse.json({ error: "File must be an audio file" }, { status: 400 })
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB in bytes
    if (file.size > maxSize) {
      console.log("[v0] File too large:", file.size, "max:", maxSize)
      return NextResponse.json({ error: "File size must be less than 100MB" }, { status: 400 })
    }

    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filename = `audiobooks/${timestamp}-${sanitizedName}`

    console.log("[v0] Uploading to Blob with filename:", filename)

    // Upload to Vercel Blob - using the exact pattern from working example
    const blob = await put(filename, file, {
      access: "public",
    })

    console.log("[v0] Upload successful:", blob.url)

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
      duration: 0, // Will be calculated on frontend
    })
  } catch (error) {
    console.error("[v0] Audio upload error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("[v0] Error details:", errorMessage)

    return NextResponse.json(
      {
        error: "Audio upload failed",
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}
