"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { Upload, Play, Edit, Trash2, FileAudio, X, ImageIcon } from "lucide-react"

interface Series {
  id: string
  title: string
}

interface Audiobook {
  id: string
  title: string
  description: string
  audio_file_url: string
  image_url?: string
  duration_seconds: number
  chapter_number: number
  is_premium: boolean
  series: { title: string }
}

export function AudiobookUploader() {
  const [series, setSeries] = useState<Series[]>([])
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    series_id: "",
    title: "",
    description: "",
    audio_file_url: "",
    image_url: "",
    duration_seconds: 0,
    chapter_number: 1,
    is_premium: false,
  })
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string>("")
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    fetchSeries()
    fetchAudiobooks()
  }, [])

  const fetchSeries = async () => {
    try {
      const { data, error } = await supabase.from("series").select("id, title").order("title")
      if (error) throw error
      setSeries(data || [])
    } catch (error) {
      console.error("Error fetching series:", error)
    }
  }

  const fetchAudiobooks = async () => {
    try {
      const { data, error } = await supabase
        .from("audiobooks")
        .select(`
          *,
          series:series_id (title)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setAudiobooks(data || [])
    } catch (error) {
      console.error("Error fetching audiobooks:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      let audioFileUrl = formData.audio_file_url
      let imageFileUrl = formData.image_url

      if (selectedFile && !editingId) {
        audioFileUrl = await uploadFileToBlob(selectedFile)
      } else if (selectedFile && editingId) {
        const oldUrl = formData.audio_file_url
        audioFileUrl = await uploadFileToBlob(selectedFile)

        if (oldUrl) {
          try {
            await fetch("/api/delete-audio", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: oldUrl }),
            })
          } catch (error) {
            console.error("Error deleting old file:", error)
          }
        }
      }

      if (selectedImageFile) {
        imageFileUrl = await uploadImageToBlob(selectedImageFile)
      }

      const dataToSave = { ...formData, audio_file_url: audioFileUrl, image_url: imageFileUrl }

      if (editingId) {
        const { error } = await supabase.from("audiobooks").update(dataToSave).eq("id", editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from("audiobooks").insert([dataToSave])
        if (error) throw error
      }

      await fetchAudiobooks()
      resetForm()
    } catch (error) {
      console.error("Error saving audiobook:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (audiobook: Audiobook) => {
    setFormData({
      series_id: audiobook.series_id || "",
      title: audiobook.title,
      description: audiobook.description || "",
      audio_file_url: audiobook.audio_file_url,
      image_url: audiobook.image_url || "",
      duration_seconds: audiobook.duration_seconds,
      chapter_number: audiobook.chapter_number,
      is_premium: audiobook.is_premium,
    })
    setEditingId(audiobook.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this audiobook?")) return

    try {
      const { error } = await supabase.from("audiobooks").delete().eq("id", id)
      if (error) throw error
      await fetchAudiobooks()
    } catch (error) {
      console.error("Error deleting audiobook:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      series_id: "",
      title: "",
      description: "",
      audio_file_url: "",
      image_url: "",
      duration_seconds: 0,
      chapter_number: 1,
      is_premium: false,
    })
    setSelectedFile(null)
    setAudioPreviewUrl("")
    setSelectedImageFile(null)
    setImagePreviewUrl("")
    setImageUploadProgress(0)
    setUploadProgress(0)
    setShowForm(false)
    setEditingId(null)
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("audio/")) {
        alert("Please select an audio file")
        return
      }

      setSelectedFile(file)
      const previewUrl = URL.createObjectURL(file)
      setAudioPreviewUrl(previewUrl)

      const audio = new Audio(previewUrl)
      audio.addEventListener("loadedmetadata", () => {
        setFormData((prev) => ({
          ...prev,
          duration_seconds: Math.floor(audio.duration) || 0,
        }))
      })
    }
  }

  const uploadFileToBlob = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)

    setUploadingFile(true)
    setUploadProgress(0)

    try {
      const response = await fetch("/api/upload-audio", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        let errorMessage = "Upload failed"

        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (parseError) {
            console.error("Failed to parse error response as JSON:", parseError)
          }
        } else {
          try {
            const errorText = await response.text()
            errorMessage = errorText || errorMessage
          } catch (textError) {
            console.error("Failed to read error response as text:", textError)
          }
        }

        throw new Error(errorMessage)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response")
      }

      const result = await response.json()
      setUploadProgress(100)
      return result.url
    } catch (error) {
      console.error("File upload error:", error)
      throw error
    } finally {
      setUploadingFile(false)
    }
  }

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file")
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        alert("Image file size must be less than 10MB")
        return
      }

      setSelectedImageFile(file)
      const previewUrl = URL.createObjectURL(file)
      setImagePreviewUrl(previewUrl)
    }
  }

  const uploadImageToBlob = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)

    setUploadingImage(true)
    setImageUploadProgress(0)

    try {
      const response = await fetch("/api/upload-chapter-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        let errorMessage = "Image upload failed"

        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (parseError) {
            console.error("Failed to parse error response as JSON:", parseError)
          }
        } else {
          try {
            const errorText = await response.text()
            errorMessage = errorText || errorMessage
          } catch (textError) {
            console.error("Failed to read error response as text:", textError)
          }
        }

        throw new Error(errorMessage)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response")
      }

      const result = await response.json()
      setImageUploadProgress(100)
      return result.url
    } catch (error) {
      console.error("Image upload error:", error)
      throw error
    } finally {
      setUploadingImage(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Audiobook Chapters</h3>
        <Button onClick={() => setShowForm(true)} className="gap-2" disabled={showForm || series.length === 0}>
          <Upload className="h-4 w-4" />
          Upload Chapter
        </Button>
      </div>

      {series.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Please create a series first before uploading audiobooks.</p>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">{editingId ? "Edit Chapter" : "Upload New Chapter"}</CardTitle>
            <CardDescription>
              {editingId ? "Update the audiobook chapter details" : "Add a new audiobook chapter to your series"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="series_id">Series *</Label>
                <Select
                  value={formData.series_id}
                  onValueChange={(value) => setFormData({ ...formData, series_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a series" />
                  </SelectTrigger>
                  <SelectContent>
                    {series.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Chapter Title *</Label>
                  <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Chapter 1: The Beginning"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chapter_number">Chapter Number</Label>
                  <Input
                    id="chapter_number"
                    type="number"
                    min="1"
                    value={formData.chapter_number}
                    onChange={(e) => setFormData({ ...formData, chapter_number: Number.parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this chapter"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audio_file">Audio File *</Label>
                {!editingId && (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                    <div className="text-center">
                      <FileAudio className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                      <div className="space-y-2">
                        <Label htmlFor="audio_file" className="cursor-pointer">
                          <div className="text-sm font-medium">Choose audio file</div>
                          <div className="text-xs text-muted-foreground">MP3, WAV, M4A up to 100MB</div>
                        </Label>
                        <Input
                          id="audio_file"
                          type="file"
                          accept="audio/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          required={!editingId}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedFile && (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <FileAudio className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{selectedFile.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null)
                        setAudioPreviewUrl("")
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {uploadingFile && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                {editingId && formData.audio_file_url && (
                  <div className="text-sm text-muted-foreground">
                    Current file:{" "}
                    <a
                      href={formData.audio_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View current audio
                    </a>
                    <div className="mt-2">
                      <Label htmlFor="audio_file_edit" className="cursor-pointer text-primary hover:underline">
                        Upload new file to replace current one
                      </Label>
                      <Input
                        id="audio_file_edit"
                        type="file"
                        accept="audio/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="chapter_image">Chapter Image (Optional)</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <div className="text-center">
                    <ImageIcon className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                    <div className="space-y-2">
                      <Label htmlFor="chapter_image" className="cursor-pointer">
                        <div className="text-sm font-medium">Choose chapter image</div>
                        <div className="text-xs text-muted-foreground">JPG, PNG, WebP up to 10MB</div>
                      </Label>
                      <Input
                        id="chapter_image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileSelect}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {selectedImageFile && (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{selectedImageFile.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(selectedImageFile.size / 1024 / 1024).toFixed(1)} MB
                      </div>
                    </div>
                    {imagePreviewUrl && (
                      <div className="w-12 h-12 rounded overflow-hidden border">
                        <img
                          src={imagePreviewUrl || "/placeholder.svg"}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedImageFile(null)
                        setImagePreviewUrl("")
                        if (imagePreviewUrl) {
                          URL.revokeObjectURL(imagePreviewUrl)
                        }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {uploadingImage && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading image...</span>
                      <span>{imageUploadProgress}%</span>
                    </div>
                    <Progress value={imageUploadProgress} />
                  </div>
                )}

                {editingId && formData.image_url && (
                  <div className="text-sm text-muted-foreground">
                    Current image:{" "}
                    <a
                      href={formData.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View current image
                    </a>
                    <div className="mt-2">
                      <Label htmlFor="chapter_image_edit" className="cursor-pointer text-primary hover:underline">
                        Upload new image to replace current one
                      </Label>
                      <Input
                        id="chapter_image_edit"
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileSelect}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration_seconds">Duration (seconds)</Label>
                <Input
                  id="duration_seconds"
                  type="number"
                  min="0"
                  value={formData.duration_seconds}
                  onChange={(e) => setFormData({ ...formData, duration_seconds: Number.parseInt(e.target.value) || 0 })}
                  placeholder="Auto-calculated from file"
                  readOnly={!!selectedFile}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_premium"
                  checked={formData.is_premium}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_premium: checked })}
                />
                <Label htmlFor="is_premium">Premium Content</Label>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isLoading || uploadingFile || uploadingImage || (!selectedFile && !editingId)}
                >
                  {isLoading || uploadingFile || uploadingImage
                    ? editingId
                      ? "Updating..."
                      : "Uploading..."
                    : editingId
                      ? "Update Chapter"
                      : "Upload Chapter"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {audiobooks.map((audiobook) => (
          <Card key={audiobook.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-serif font-semibold">{audiobook.title}</h4>
                    {audiobook.is_premium && <Badge variant="secondary">Premium</Badge>}
                    <Badge variant="outline">Ch. {audiobook.chapter_number}</Badge>
                    {audiobook.image_url && (
                      <Badge variant="outline" className="gap-1">
                        <ImageIcon className="h-3 w-3" />
                        Image
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Series: {audiobook.series?.title || "Unknown"}</p>
                  {audiobook.description && (
                    <p className="text-sm text-muted-foreground mb-2">{audiobook.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Duration: {formatDuration(audiobook.duration_seconds)}</span>
                    <a
                      href={audiobook.audio_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Play className="h-3 w-3" />
                      Preview
                    </a>
                    {audiobook.image_url && (
                      <a
                        href={audiobook.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <ImageIcon className="h-3 w-3" />
                        View Image
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(audiobook)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(audiobook.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {audiobooks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No audiobooks uploaded yet. Upload your first chapter to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}
