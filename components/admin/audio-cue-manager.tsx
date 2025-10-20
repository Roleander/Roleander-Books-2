"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  Mic,
  Volume2,
  Package,
  Play,
  Pause,
  SkipForward
} from "lucide-react"

interface AudioCue {
  id: string
  audiobook_id: string
  cue_timestamp_seconds: number
  item_id: string
  cue_text?: string
  voice_command?: string
  auto_acquire: boolean
  audiobook?: {
    title: string
    series: { title: string }
  }
  item?: {
    name: string
    item_type: string
    rarity: string
  }
}

interface Audiobook {
  id: string
  title: string
  series: {
    title: string
  }
}

interface Item {
  id: string
  name: string
  item_type: string
  rarity: string
}

export function AudioCueManager() {
  const [audioCues, setAudioCues] = useState<AudioCue[]>([])
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingCue, setEditingCue] = useState<AudioCue | null>(null)
  const [formData, setFormData] = useState({
    audiobook_id: "",
    cue_timestamp_seconds: 0,
    item_id: "",
    cue_text: "",
    voice_command: "",
    auto_acquire: true
  })

  const supabase = createClient()

  useEffect(() => {
    fetchAudioCues()
    fetchAudiobooks()
    fetchItems()
  }, [])

  const fetchAudioCues = async () => {
    try {
      const { data, error } = await supabase
        .from('audio_cues')
        .select(`
          *,
          audiobook:audiobooks(title, series:series(title)),
          item:items(name, item_type, rarity)
        `)
        .order('cue_timestamp_seconds')

      if (error) throw error
      setAudioCues(data || [])
    } catch (error) {
      console.error('Error fetching audio cues:', error)
    }
  }

  const fetchAudiobooks = async () => {
    try {
      const { data, error } = await supabase
        .from('audiobooks')
        .select(`
          id,
          title,
          series:series(title)
        `)
        .order('title')

      if (error) throw error
      setAudiobooks(data || [])
    } catch (error) {
      console.error('Error fetching audiobooks:', error)
    }
  }

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('id, name, item_type, rarity')
        .order('name')

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      audiobook_id: "",
      cue_timestamp_seconds: 0,
      item_id: "",
      cue_text: "",
      voice_command: "",
      auto_acquire: true
    })
    setEditingCue(null)
    setShowDialog(false)
  }

  const handleEdit = (cue: AudioCue) => {
    setEditingCue(cue)
    setFormData({
      audiobook_id: cue.audiobook_id,
      cue_timestamp_seconds: cue.cue_timestamp_seconds,
      item_id: cue.item_id,
      cue_text: cue.cue_text || "",
      voice_command: cue.voice_command || "",
      auto_acquire: cue.auto_acquire
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    try {
      if (editingCue) {
        // Update existing cue
        const { error } = await supabase
          .from('audio_cues')
          .update({
            audiobook_id: formData.audiobook_id,
            cue_timestamp_seconds: formData.cue_timestamp_seconds,
            item_id: formData.item_id,
            cue_text: formData.cue_text || null,
            voice_command: formData.voice_command || null,
            auto_acquire: formData.auto_acquire
          })
          .eq('id', editingCue.id)

        if (error) throw error
      } else {
        // Create new cue
        const { error } = await supabase
          .from('audio_cues')
          .insert([{
            audiobook_id: formData.audiobook_id,
            cue_timestamp_seconds: formData.cue_timestamp_seconds,
            item_id: formData.item_id,
            cue_text: formData.cue_text || null,
            voice_command: formData.voice_command || null,
            auto_acquire: formData.auto_acquire
          }])

        if (error) throw error
      }

      await fetchAudioCues()
      resetForm()
    } catch (error) {
      console.error('Error saving audio cue:', error)
      alert('Error saving audio cue. Please try again.')
    }
  }

  const handleDelete = async (cueId: string) => {
    if (!confirm('Are you sure you want to delete this audio cue?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('audio_cues')
        .delete()
        .eq('id', cueId)

      if (error) throw error

      await fetchAudioCues()
    } catch (error) {
      console.error('Error deleting audio cue:', error)
      alert('Error deleting audio cue. Please try again.')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const parseTime = (timeString: string) => {
    const [mins, secs] = timeString.split(':').map(Number)
    return (mins * 60) + (secs || 0)
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800'
      case 'uncommon': return 'bg-green-100 text-green-800'
      case 'rare': return 'bg-blue-100 text-blue-800'
      case 'epic': return 'bg-purple-100 text-purple-800'
      case 'legendary': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Audio Cue Management
              </CardTitle>
              <CardDescription>Link items to specific moments in your audiobooks for automatic acquisition</CardDescription>
            </div>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setShowDialog(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Audio Cue
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingCue ? 'Edit Audio Cue' : 'Add Audio Cue'}</DialogTitle>
                  <DialogDescription>
                    Configure when and how items are acquired during audiobook playback
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="audiobook">Audiobook</Label>
                      <Select
                        value={formData.audiobook_id}
                        onValueChange={(value) => setFormData({ ...formData, audiobook_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select audiobook" />
                        </SelectTrigger>
                        <SelectContent>
                          {audiobooks.map((book) => (
                            <SelectItem key={book.id} value={book.id}>
                              {book.title} ({book.series?.title})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timestamp">Timestamp (MM:SS)</Label>
                      <Input
                        id="timestamp"
                        type="text"
                        placeholder="5:30"
                        value={formatTime(formData.cue_timestamp_seconds)}
                        onChange={(e) => setFormData({
                          ...formData,
                          cue_timestamp_seconds: parseTime(e.target.value)
                        })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="item">Item to Acquire</Label>
                    <Select
                      value={formData.item_id}
                      onValueChange={(value) => setFormData({ ...formData, item_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              {item.name}
                              <Badge className={`${getRarityColor(item.rarity)} text-xs`}>
                                {item.rarity}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cue_text">Cue Text (Optional)</Label>
                    <Textarea
                      id="cue_text"
                      value={formData.cue_text}
                      onChange={(e) => setFormData({ ...formData, cue_text: e.target.value })}
                      placeholder="You find a magical sword glowing with power!"
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      Text that appears when the item is acquired
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="voice_command">Voice Command (Optional)</Label>
                    <Input
                      id="voice_command"
                      value={formData.voice_command}
                      onChange={(e) => setFormData({ ...formData, voice_command: e.target.value })}
                      placeholder="add sword"
                    />
                    <p className="text-xs text-muted-foreground">
                      Voice command to manually acquire this item
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="auto_acquire"
                      checked={formData.auto_acquire}
                      onChange={(e) => setFormData({ ...formData, auto_acquire: e.target.checked })}
                    />
                    <Label htmlFor="auto_acquire">Automatically acquire when timestamp is reached</Label>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} className="flex-1">
                      {editingCue ? 'Update Cue' : 'Create Cue'}
                    </Button>
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {audioCues.length === 0 ? (
            <div className="text-center py-8">
              <Volume2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Audio Cues Yet</h3>
              <p className="text-muted-foreground mb-4">Create audio cues to automatically give players items during audiobook playback!</p>
              <Button onClick={() => { resetForm(); setShowDialog(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Audio Cue
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Audiobook</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Voice Command</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audioCues.map((cue) => (
                  <TableRow key={cue.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{cue.audiobook?.title}</div>
                        <div className="text-sm text-muted-foreground">{cue.audiobook?.series?.title}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {formatTime(cue.cue_timestamp_seconds)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{cue.item?.name}</div>
                          <Badge className={`${getRarityColor(cue.item?.rarity || 'common')} text-xs`}>
                            {cue.item?.rarity}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {cue.auto_acquire ? (
                          <Play className="h-4 w-4 text-green-600" />
                        ) : (
                          <Mic className="h-4 w-4 text-blue-600" />
                        )}
                        <span className="text-sm">
                          {cue.auto_acquire ? 'Auto' : 'Voice'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cue.voice_command && (
                        <Badge variant="outline" className="font-mono text-xs">
                          "{cue.voice_command}"
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(cue)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(cue.id)} className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}