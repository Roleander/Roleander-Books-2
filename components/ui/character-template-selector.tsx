"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sword,
  Brain,
  Heart,
  Zap,
  Shield,
  Eye,
  User,
  Plus,
  Star,
  BookOpen,
  Award,
  Package
} from 'lucide-react'

interface CharacterTemplate {
  template_id: string
  template_name: string
  template_description: string
  genre: string
  difficulty: string
  artwork_url?: string
  base_stats: {
    strength: number
    intelligence: number
    charisma: number
    dexterity: number
    constitution: number
    wisdom: number
  }
  base_skills: Array<{
    name: string
    level: number
    description: string
  }>
  base_inventory: Array<{
    item_name: string
    quantity: number
  }>
  background_story: string
  personality_traits: string[]
  appearance_description: string
  is_default: boolean
}

interface CharacterTemplateSelectorProps {
  audiobookId: string
  userId: string
  onTemplateSelected: (template: CharacterTemplate) => void
  onCustomCharacter: () => void
  isOpen: boolean
  onClose: () => void
}

export function CharacterTemplateSelector({
  audiobookId,
  userId,
  onTemplateSelected,
  onCustomCharacter,
  isOpen,
  onClose
}: CharacterTemplateSelectorProps) {
  const [templates, setTemplates] = useState<CharacterTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<CharacterTemplate | null>(null)
  const [previewMode, setPreviewMode] = useState<'overview' | 'stats' | 'skills' | 'inventory' | 'background'>('overview')
  const supabase = createClient()

  useEffect(() => {
    if (isOpen && audiobookId) {
      fetchTemplates()
    }
  }, [isOpen, audiobookId])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_audiobook_character_templates', {
        audiobook_uuid: audiobookId
      })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching character templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatIcon = (statName: string) => {
    switch (statName.toLowerCase()) {
      case 'strength': return <Sword className="h-4 w-4" />
      case 'intelligence': return <Brain className="h-4 w-4" />
      case 'charisma': return <Heart className="h-4 w-4" />
      case 'dexterity': return <Zap className="h-4 w-4" />
      case 'constitution': return <Shield className="h-4 w-4" />
      case 'wisdom': return <Eye className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'normal': return 'bg-blue-100 text-blue-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getGenreColor = (genre: string) => {
    switch (genre.toLowerCase()) {
      case 'fantasy': return 'bg-purple-100 text-purple-800'
      case 'sci-fi': return 'bg-cyan-100 text-cyan-800'
      case 'mystery': return 'bg-orange-100 text-orange-800'
      case 'horror': return 'bg-gray-100 text-gray-800'
      default: return 'bg-indigo-100 text-indigo-800'
    }
  }

  const renderStatBar = (statName: string, value: number) => {
    const maxStat = 18 // D&D style max
    const percentage = (value / maxStat) * 100

    return (
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-[120px]">
          {getStatIcon(statName)}
          <span className="text-sm font-medium capitalize">{statName}</span>
        </div>
        <div className="flex-1">
          <Progress value={percentage} className="h-2" />
        </div>
        <span className="text-sm font-bold min-w-[30px] text-right">{value}</span>
      </div>
    )
  }

  const renderTemplatePreview = (template: CharacterTemplate) => {
    return (
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback>
                  {template.template_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  {template.template_name}
                  {template.is_default && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getGenreColor(template.genre)}>{template.genre}</Badge>
                  <Badge className={getDifficultyColor(template.difficulty)}>{template.difficulty}</Badge>
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>{template.template_description}</DialogDescription>
          </DialogHeader>

          <Tabs value={previewMode} onValueChange={(value) => setPreviewMode(value as any)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="background">Background</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] mt-4">
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Appearance</h4>
                    <p className="text-sm text-muted-foreground">{template.appearance_description}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Personality</h4>
                    <div className="flex flex-wrap gap-1">
                      {template.personality_traits.map((trait, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Quick Stats</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(template.base_stats).map(([stat, value]) => (
                      <div key={stat} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{stat}:</span>
                        <span className="font-bold">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="stats" className="space-y-4">
                <h4 className="font-semibold">Character Statistics</h4>
                <div className="space-y-2">
                  {Object.entries(template.base_stats).map(([stat, value]) => (
                    renderStatBar(stat, value as number)
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="skills" className="space-y-4">
                <h4 className="font-semibold">Starting Skills</h4>
                <div className="space-y-3">
                  {template.base_skills.map((skill, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">{skill.name}</h5>
                        <Badge variant="secondary">Level {skill.level}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{skill.description}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="inventory" className="space-y-4">
                <h4 className="font-semibold">Starting Inventory</h4>
                <div className="grid grid-cols-2 gap-2">
                  {template.base_inventory.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.item_name}</span>
                      <Badge variant="outline" className="ml-auto">x{item.quantity}</Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="background" className="space-y-4">
                <h4 className="font-semibold">Character Background</h4>
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground leading-relaxed">{template.background_story}</p>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={() => {
                onTemplateSelected(template)
                setSelectedTemplate(null)
                onClose()
              }}
              className="flex-1"
            >
              Choose This Character
            </Button>
            <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!isOpen) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Choose Your Character
            </DialogTitle>
            <DialogDescription>
              Select a character template to begin your audiobook adventure, or create a custom character.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Loading character templates...</p>
                </div>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Character Templates Available</h3>
                <p className="text-muted-foreground mb-4">
                  This audiobook doesn't have predefined character templates yet.
                </p>
                <Button onClick={onCustomCharacter}>
                  Create Custom Character
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card
                    key={template.template_id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      template.is_default ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardHeader className="text-center pb-2">
                      <div className="flex justify-center mb-3">
                        <Avatar className="h-16 w-16">
                          <AvatarFallback className="text-lg">
                            {template.template_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <CardTitle className="text-lg">{template.template_name}</CardTitle>
                        {template.is_default && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                      </div>
                      <div className="flex justify-center gap-2 mb-3">
                        <Badge className={getGenreColor(template.genre)}>{template.genre}</Badge>
                        <Badge className={getDifficultyColor(template.difficulty)}>{template.difficulty}</Badge>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <p className="text-sm text-muted-foreground text-center mb-4 line-clamp-2">
                        {template.template_description}
                      </p>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Strength:</span>
                          <span className="font-bold">{template.base_stats.strength}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Intelligence:</span>
                          <span className="font-bold">{template.base_stats.intelligence}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Skills:</span>
                          <span className="font-bold">{template.base_skills.length}</span>
                        </div>
                      </div>

                      <Button className="w-full mt-4" variant="outline">
                        Preview Character
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                {/* Custom Character Option */}
                <Card
                  className="cursor-pointer transition-all hover:shadow-lg border-dashed"
                  onClick={onCustomCharacter}
                >
                  <CardContent className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                    <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Create Custom Character</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Build your character from scratch with complete customization.
                    </p>
                    <Button variant="outline">
                      Start Custom Creation
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </ScrollArea>

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      {selectedTemplate && renderTemplatePreview(selectedTemplate)}
    </>
  )
}