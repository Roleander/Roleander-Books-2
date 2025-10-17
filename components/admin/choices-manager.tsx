"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
import { Plus, GitBranch, Trash2, Edit, X } from "lucide-react"

interface Audiobook {
  id: string
  title: string
  series: { title: string }
}

interface Choice {
  id: string
  choice_text: string
  choice_number: number
  voice_command: string
  audiobook: { title: string; series: { title: string } }
  next_audiobook: { title: string } | null
  source_audiobooks?: { id: string; title: string; series: { title: string } }[]
}

export function ChoicesManager() {
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([])
  const [choices, setChoices] = useState<Choice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingChoice, setEditingChoice] = useState<Choice | null>(null)
  const [formData, setFormData] = useState({
    source_audiobook_ids: [] as string[],
    choice_text: "",
    choice_number: 1,
    voice_command: "",
    next_audiobook_id: "",
  })

  const supabase = createClient()

  useEffect(() => {
    fetchAudiobooks()
    fetchChoices()
  }, [])

  const fetchAudiobooks = async () => {
    try {
      const { data, error } = await supabase
        .from("audiobooks")
        .select(`
          id,
          title,
          series:series_id (title)
        `)
        .order("title")

      if (error) throw error
      setAudiobooks(data || [])
    } catch (error) {
      console.error("Error fetching audiobooks:", error)
    }
  }

  const fetchChoices = async () => {
    try {
      const { data, error } = await supabase
        .from("audio_choices")
        .select(`
          *,
          audiobook:audiobook_id (
            title,
            series:series_id (title)
          ),
          next_audiobook:next_audiobook_id (title),
          choice_sources (
            audiobook:audiobook_id (
              id,
              title,
              series:series_id (title)
            )
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      const transformedChoices = (data || []).map((choice) => ({
        ...choice,
        source_audiobooks:
          choice.choice_sources?.map((cs: any) => cs.audiobook) || (choice.audiobook ? [choice.audiobook] : []),
      }))

      setChoices(transformedChoices)
    } catch (error) {
      console.error("Error fetching choices:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (editingChoice) {
        const { error: updateError } = await supabase
          .from("audio_choices")
          .update({
            choice_text: formData.choice_text,
            choice_number: formData.choice_number,
            voice_command: formData.voice_command,
            next_audiobook_id: formData.next_audiobook_id || null,
          })
          .eq("id", editingChoice.id)

        if (updateError) throw updateError

        await supabase.from("choice_sources").delete().eq("choice_id", editingChoice.id)

        if (formData.source_audiobook_ids.length > 0) {
          const sourcesToInsert = formData.source_audiobook_ids.map((audiobook_id) => ({
            choice_id: editingChoice.id,
            audiobook_id,
          }))

          const { error: sourcesError } = await supabase.from("choice_sources").insert(sourcesToInsert)

          if (sourcesError) throw sourcesError
        }
      } else {
        const { data: newChoice, error: insertError } = await supabase
          .from("audio_choices")
          .insert([
            {
              choice_text: formData.choice_text,
              choice_number: formData.choice_number,
              voice_command: formData.voice_command,
              next_audiobook_id: formData.next_audiobook_id || null,
              audiobook_id: formData.source_audiobook_ids[0] || null,
            },
          ])
          .select()
          .single()

        if (insertError) throw insertError

        if (formData.source_audiobook_ids.length > 0) {
          const sourcesToInsert = formData.source_audiobook_ids.map((audiobook_id) => ({
            choice_id: newChoice.id,
            audiobook_id,
          }))

          const { error: sourcesError } = await supabase.from("choice_sources").insert(sourcesToInsert)

          if (sourcesError) throw sourcesError
        }
      }

      await fetchChoices()
      resetForm()
    } catch (error) {
      console.error("Error saving choice:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (choice: Choice) => {
    setEditingChoice(choice)
    setFormData({
      source_audiobook_ids: choice.source_audiobooks?.map((ab) => ab.id) || [],
      choice_text: choice.choice_text,
      choice_number: choice.choice_number,
      voice_command: choice.voice_command,
      next_audiobook_id: choice.next_audiobook_id || "",
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this choice?")) return

    try {
      const { error } = await supabase.from("audio_choices").delete().eq("id", id)
      if (error) throw error
      await fetchChoices()
    } catch (error) {
      console.error("Error deleting choice:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      source_audiobook_ids: [],
      choice_text: "",
      choice_number: 1,
      voice_command: "",
      next_audiobook_id: "",
    })
    setShowForm(false)
    setEditingChoice(null)
  }

  const toggleAudiobook = (audiobookId: string) => {
    setFormData((prev) => ({
      ...prev,
      source_audiobook_ids: prev.source_audiobook_ids.includes(audiobookId)
        ? prev.source_audiobook_ids.filter((id) => id !== audiobookId)
        : [...prev.source_audiobook_ids, audiobookId],
    }))
  }

  const removeAudiobook = (audiobookId: string) => {
    setFormData((prev) => ({
      ...prev,
      source_audiobook_ids: prev.source_audiobook_ids.filter((id) => id !== audiobookId),
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Interactive Choices</h3>
        <Button onClick={() => setShowForm(true)} className="gap-2" disabled={showForm || audiobooks.length === 0}>
          <Plus className="h-4 w-4" />
          Add Choice
        </Button>
      </div>

      {audiobooks.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Please upload audiobooks first before creating choices.</p>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">
              {editingChoice ? "Edit Interactive Choice" : "Create Interactive Choice"}
            </CardTitle>
            <CardDescription>Set up branching narrative options with voice commands</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Source Audiobooks *</Label>
                <p className="text-sm text-muted-foreground">
                  Select all audiobooks that can present this choice to the user
                </p>

                {formData.source_audiobook_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
                    {formData.source_audiobook_ids.map((id) => {
                      const audiobook = audiobooks.find((ab) => ab.id === id)
                      return audiobook ? (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {audiobook.series?.title} - {audiobook.title}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 ml-1"
                            onClick={() => removeAudiobook(id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ) : null
                    })}
                  </div>
                )}

                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                  {audiobooks.map((audiobook) => (
                    <div key={audiobook.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`audiobook-${audiobook.id}`}
                        checked={formData.source_audiobook_ids.includes(audiobook.id)}
                        onCheckedChange={() => toggleAudiobook(audiobook.id)}
                      />
                      <Label htmlFor={`audiobook-${audiobook.id}`} className="text-sm cursor-pointer flex-1">
                        {audiobook.series?.title} - {audiobook.title}
                      </Label>
                    </div>
                  ))}
                </div>

                {formData.source_audiobook_ids.length === 0 && (
                  <p className="text-sm text-destructive">Please select at least one source audiobook</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="choice_text">Choice Text *</Label>
                  <Input
                    id="choice_text"
                    required
                    value={formData.choice_text}
                    onChange={(e) => setFormData({ ...formData, choice_text: e.target.value })}
                    placeholder="Go to the mysterious door"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="choice_number">Choice Number</Label>
                  <Input
                    id="choice_number"
                    type="number"
                    min="1"
                    max="9"
                    value={formData.choice_number}
                    onChange={(e) => setFormData({ ...formData, choice_number: Number.parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice_command">Voice Command *</Label>
                <Input
                  id="voice_command"
                  required
                  value={formData.voice_command}
                  onChange={(e) => setFormData({ ...formData, voice_command: e.target.value.toLowerCase() })}
                  placeholder="door, one, option one"
                />
                <p className="text-xs text-muted-foreground">
                  What the user should say to select this choice (automatically converted to lowercase)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="next_audiobook_id">Next Audiobook</Label>
                <Select
                  value={formData.next_audiobook_id}
                  onValueChange={(value) => setFormData({ ...formData, next_audiobook_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select where this choice leads (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No next audiobook (end story)</SelectItem>
                    {audiobooks.map((audiobook) => (
                      <SelectItem key={audiobook.id} value={audiobook.id}>
                        {audiobook.series?.title} - {audiobook.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading || formData.source_audiobook_ids.length === 0}>
                  {isLoading
                    ? editingChoice
                      ? "Updating..."
                      : "Creating..."
                    : editingChoice
                      ? "Update Choice"
                      : "Create Choice"}
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
        {choices.map((choice) => (
          <Card key={choice.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{choice.choice_text}</h4>
                    <Badge variant="outline">#{choice.choice_number}</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>
                      <strong>From:</strong>
                      <div className="ml-4 mt-1">
                        {choice.source_audiobooks && choice.source_audiobooks.length > 0 ? (
                          choice.source_audiobooks.map((audiobook, index) => (
                            <div key={audiobook.id}>
                              • {audiobook.series?.title} - {audiobook.title}
                            </div>
                          ))
                        ) : choice.audiobook ? (
                          <div>
                            • {choice.audiobook.series?.title} - {choice.audiobook.title}
                          </div>
                        ) : (
                          <div className="italic">No source audiobooks</div>
                        )}
                      </div>
                    </div>
                    <p>
                      <strong>Voice Command:</strong> "{choice.voice_command}"
                    </p>
                    <p>
                      <strong>Leads to:</strong>{" "}
                      {choice.next_audiobook?.title || <span className="italic">End of story</span>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(choice)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(choice.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {choices.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No interactive choices created yet. Add choices to create branching narratives!</p>
          </div>
        )}
      </div>
    </div>
  )
}
