"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Plus, Edit, Trash2, BookOpen } from "lucide-react"

interface Series {
  id: string
  title: string
  description: string
  author: string
  narrator: string
  genre: string
  is_premium: boolean
  cover_image_url: string
  created_at: string
}

export function SeriesManager() {
  const [series, setSeries] = useState<Series[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSeries, setEditingSeries] = useState<Series | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    author: "",
    narrator: "",
    genre: "",
    is_premium: false,
    cover_image_url: "",
  })

  const supabase = createClient()

  useEffect(() => {
    fetchSeries()
  }, [])

  const fetchSeries = async () => {
    try {
      const { data, error } = await supabase.from("series").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setSeries(data || [])
    } catch (error) {
      console.error("Error fetching series:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (editingSeries) {
        const { error } = await supabase.from("series").update(formData).eq("id", editingSeries.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("series").insert([formData])
        if (error) throw error
      }

      await fetchSeries()
      resetForm()
    } catch (error) {
      console.error("Error saving series:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this series?")) return

    try {
      const { error } = await supabase.from("series").delete().eq("id", id)
      if (error) throw error
      await fetchSeries()
    } catch (error) {
      console.error("Error deleting series:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      author: "",
      narrator: "",
      genre: "",
      is_premium: false,
      cover_image_url: "",
    })
    setEditingSeries(null)
    setShowForm(false)
  }

  const startEdit = (seriesItem: Series) => {
    setFormData({
      title: seriesItem.title,
      description: seriesItem.description || "",
      author: seriesItem.author || "",
      narrator: seriesItem.narrator || "",
      genre: seriesItem.genre || "",
      is_premium: seriesItem.is_premium,
      cover_image_url: seriesItem.cover_image_url || "",
    })
    setEditingSeries(seriesItem)
    setShowForm(true)
  }

  if (isLoading && series.length === 0) {
    return <div className="text-center py-8">Loading series...</div>
  }

  return (
    <div className="space-y-6">
      {/* Add New Series Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Your Series</h3>
        <Button onClick={() => setShowForm(true)} className="gap-2" disabled={showForm}>
          <Plus className="h-4 w-4" />
          Add Series
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">{editingSeries ? "Edit Series" : "Create New Series"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter series title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genre">Genre</Label>
                  <Select value={formData.genre} onValueChange={(value) => setFormData({ ...formData, genre: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fantasy">Fantasy</SelectItem>
                      <SelectItem value="mystery">Mystery</SelectItem>
                      <SelectItem value="romance">Romance</SelectItem>
                      <SelectItem value="sci-fi">Science Fiction</SelectItem>
                      <SelectItem value="thriller">Thriller</SelectItem>
                      <SelectItem value="adventure">Adventure</SelectItem>
                      <SelectItem value="drama">Drama</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="Author name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="narrator">Narrator</Label>
                  <Input
                    id="narrator"
                    value={formData.narrator}
                    onChange={(e) => setFormData({ ...formData, narrator: e.target.value })}
                    placeholder="Narrator name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter series description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover_image_url">Cover Image URL</Label>
                <Input
                  id="cover_image_url"
                  value={formData.cover_image_url}
                  onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                  placeholder="https://example.com/cover.jpg"
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
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : editingSeries ? "Update Series" : "Create Series"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Series List */}
      <div className="grid gap-4">
        {series.map((seriesItem) => (
          <Card key={seriesItem.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-serif font-semibold text-lg">{seriesItem.title}</h4>
                    {seriesItem.is_premium && <Badge variant="secondary">Premium</Badge>}
                  </div>
                  <p className="text-muted-foreground text-sm mb-2">{seriesItem.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {seriesItem.author && <span>Author: {seriesItem.author}</span>}
                    {seriesItem.narrator && <span>Narrator: {seriesItem.narrator}</span>}
                    {seriesItem.genre && <span>Genre: {seriesItem.genre}</span>}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm" onClick={() => startEdit(seriesItem)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(seriesItem.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {series.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No series created yet. Add your first series to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}
