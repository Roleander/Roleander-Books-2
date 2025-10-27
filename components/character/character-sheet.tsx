"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import {
  Sword,
  Shield,
  Zap,
  Heart,
  Coins,
  Star,
  Plus,
  Minus,
  Edit,
  Save,
  X,
  Trophy,
  BookOpen,
  Target,
  Users,
  Wand2,
  Package,
  Sparkles
} from "lucide-react"
import { InventoryManager } from "./inventory-manager"
import { CharacterTemplateSelector } from "@/components/ui/character-template-selector"
import { CharacterRoster } from "@/components/ui/character-roster"
import { PartyBuilder } from "@/components/ui/party-builder"
import { CharacterAssignment } from "@/components/ui/character-assignment"

interface CharacterSheet {
  id: string
  name: string
  character_class: string
  level: number
  experience: number
  experience_to_next: number
  health: number
  max_health: number
  mana: number
  max_mana: number
  gold: number
  description?: string
  avatar_url?: string
}

interface CharacterStat {
  id: string
  stat_name: string
  stat_value: number
  max_value: number
  stat_category: string
}

interface CharacterSheetProps {
  userId: string
  audiobookId?: string // Optional - for template selection
  onCharacterSelect?: (character: CharacterSheet) => void
}

export function CharacterSheet({ userId, audiobookId, onCharacterSelect }: CharacterSheetProps) {
  const [characters, setCharacters] = useState<CharacterSheet[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterSheet | null>(null)
  const [characterStats, setCharacterStats] = useState<CharacterStat[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<CharacterSheet>>({})
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [showCharacterRoster, setShowCharacterRoster] = useState(false)
  const [showPartyBuilder, setShowPartyBuilder] = useState(false)
  const [selectedParty, setSelectedParty] = useState<any>(null)
  const [showCharacterAssignment, setShowCharacterAssignment] = useState(false)
  const [assignmentAudiobookId, setAssignmentAudiobookId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchCharacters()
  }, [userId])

  useEffect(() => {
    if (selectedCharacter) {
      fetchCharacterStats(selectedCharacter.id)
      applyItemEffects(selectedCharacter.id)
      onCharacterSelect?.(selectedCharacter)
    }
  }, [selectedCharacter])

  // Listen for inventory changes to update stats
  useEffect(() => {
    const handleInventoryChange = () => {
      if (selectedCharacter) {
        applyItemEffects(selectedCharacter.id)
      }
    }

    window.addEventListener('characterStatsUpdated', handleInventoryChange)
    return () => window.removeEventListener('characterStatsUpdated', handleInventoryChange)
  }, [selectedCharacter])

  const fetchCharacters = async () => {
    try {
      const { data, error } = await supabase
        .from('character_sheets')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) throw error

      setCharacters(data || [])

      // Auto-select first character if available
      if (data && data.length > 0 && !selectedCharacter) {
        setSelectedCharacter(data[0])
      }
    } catch (error) {
      console.error('Error fetching characters:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCharacterStats = async (characterId: string) => {
    try {
      const { data, error } = await supabase
        .from('character_stats')
        .select('*')
        .eq('character_sheet_id', characterId)
        .order('stat_category', { ascending: true })

      if (error) throw error
      setCharacterStats(data || [])
    } catch (error) {
      console.error('Error fetching character stats:', error)
    }
  }

  const createNewCharacter = async () => {
    // If we have an audiobookId, show template selector instead
    if (audiobookId) {
      setShowTemplateSelector(true)
    } else {
      // Fallback to default character creation
      try {
        const { data, error } = await supabase
          .rpc('create_default_character', {
            user_id: userId,
            character_name: 'New Adventurer'
          })

        if (error) throw error

        await fetchCharacters()
      } catch (error) {
        console.error('Error creating character:', error)
      }
    }
  }

  const handleTemplateSelected = async (template: any) => {
    try {
      if (!audiobookId) return

      const { data, error } = await supabase
        .rpc('create_character_from_template', {
          p_user_id: userId,
          p_audiobook_id: audiobookId,
          p_template_id: template.template_id,
          p_character_name: template.template_name
        })

      if (error) throw error

      await fetchCharacters()
      setShowTemplateSelector(false)
    } catch (error) {
      console.error('Error creating character from template:', error)
    }
  }

  const handleCustomCharacter = () => {
    // Fallback to default character creation
    setShowTemplateSelector(false)
    createNewCharacter()
  }

  const updateCharacter = async () => {
    if (!selectedCharacter) return

    try {
      const { error } = await supabase
        .from('character_sheets')
        .update(editForm)
        .eq('id', selectedCharacter.id)

      if (error) throw error

      setEditing(false)
      await fetchCharacters()
    } catch (error) {
      console.error('Error updating character:', error)
    }
  }

  const updateStat = async (statId: string, newValue: number) => {
    try {
      const { error } = await supabase
        .from('character_stats')
        .update({ stat_value: newValue })
        .eq('id', statId)

      if (error) throw error

      await fetchCharacterStats(selectedCharacter!.id)
      // Emit event to refresh inventory effects
      window.dispatchEvent(new CustomEvent('characterStatsUpdated'))
    } catch (error) {
      console.error('Error updating stat:', error)
    }
  }

  // Apply item effects to character stats
  const applyItemEffects = async (characterId: string) => {
    try {
      // Get all equipped items for this character
      const { data: equippedItems, error: inventoryError } = await supabase
        .from('character_inventory')
        .select(`
          item:items(
            item_effects(*)
          )
        `)
        .eq('character_sheet_id', characterId)
        .eq('is_equipped', true)

      if (inventoryError) throw inventoryError

      // Calculate total effects from equipped items
      const effectTotals: { [key: string]: number } = {}

      equippedItems?.forEach((inventoryItem: any) => {
        inventoryItem.item?.item_effects?.forEach((effect: any) => {
          if (effect.effect_type === 'permanent') {
            effectTotals[effect.stat_name] = (effectTotals[effect.stat_name] || 0) + effect.effect_value
          }
        })
      })

      // Update character stats with item bonuses
      const { data: characterStats, error: statsError } = await supabase
        .from('character_stats')
        .select('*')
        .eq('character_sheet_id', characterId)

      if (statsError) throw statsError

      // Apply effects to each stat
      for (const stat of characterStats || []) {
        const baseValue = stat.stat_value - (effectTotals[stat.stat_name] || 0)
        const newValue = baseValue + (effectTotals[stat.stat_name] || 0)

        if (newValue !== stat.stat_value) {
          await supabase
            .from('character_stats')
            .update({ stat_value: newValue })
            .eq('id', stat.id)
        }
      }

      await fetchCharacterStats(characterId)
    } catch (error) {
      console.error('Error applying item effects:', error)
    }
  }

  const getStatIcon = (category: string) => {
    switch (category) {
      case 'core': return <Star className="h-4 w-4" />
      case 'combat': return <Sword className="h-4 w-4" />
      case 'magic': return <Wand2 className="h-4 w-4" />
      case 'social': return <Users className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const getStatColor = (category: string) => {
    switch (category) {
      case 'core': return 'bg-blue-100 text-blue-800'
      case 'combat': return 'bg-red-100 text-red-800'
      case 'magic': return 'bg-purple-100 text-purple-800'
      case 'social': return 'bg-green-100 text-green-800'
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
      {/* Character Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Character Sheets
              </CardTitle>
              <CardDescription>Manage your RPG characters for audiobook adventures</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={createNewCharacter} size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                {audiobookId ? 'Choose Character' : 'New Character'}
              </Button>
              <Button onClick={() => setShowCharacterRoster(true)} size="sm" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Character Roster
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {characters.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Characters Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first character to start your audiobook RPG journey!</p>
              <Button onClick={createNewCharacter}>
                <Plus className="h-4 w-4 mr-2" />
                Create Character
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {characters.map((character) => (
                <Card
                  key={character.id}
                  className={`cursor-pointer transition-all ${
                    selectedCharacter?.id === character.id
                      ? 'ring-2 ring-primary'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedCharacter(character)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {character.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">{character.name}</h3>
                        <p className="text-sm text-muted-foreground">{character.character_class}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Level {character.level}</span>
                        <span>{character.experience}/{character.experience_to_next} XP</span>
                      </div>
                      <Progress
                        value={(character.experience / character.experience_to_next) * 100}
                        className="h-2"
                      />

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3 text-red-500" />
                          <span className="text-xs">{character.health}/{character.max_health}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-blue-500" />
                          <span className="text-xs">{character.mana}/{character.max_mana}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Coins className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs">{character.gold}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Character Template Selector */}
      {audiobookId && (
        <CharacterTemplateSelector
          audiobookId={audiobookId}
          userId={userId}
          onTemplateSelected={handleTemplateSelected}
          onCustomCharacter={handleCustomCharacter}
          isOpen={showTemplateSelector}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}

      {/* Character Roster */}
      <CharacterRoster
        userId={userId}
        onCharacterSelect={(character) => {
          setSelectedCharacter(character)
          setShowCharacterRoster(false)
        }}
        showAudiobookFilter={!!audiobookId}
        audiobookId={audiobookId || undefined}
      />

      {/* Party Builder */}
      {selectedParty && (
        <PartyBuilder
          party={selectedParty}
          availableCharacters={characters}
          onCharacterAdd={async (characterId, role) => {
            // Implementation for adding character to party
            console.log('Adding character to party:', characterId, role)
          }}
          onCharacterRemove={async (characterId) => {
            // Implementation for removing character from party
            console.log('Removing character from party:', characterId)
          }}
        />
      )}

      {/* Character Assignment */}
      {assignmentAudiobookId && (
        <CharacterAssignment
          audiobookId={assignmentAudiobookId}
          userId={userId}
          onAssignmentComplete={(assignments) => {
            console.log('Character assignments completed:', assignments)
            setShowCharacterAssignment(false)
            setAssignmentAudiobookId(null)
          }}
          isOpen={showCharacterAssignment}
          onClose={() => {
            setShowCharacterAssignment(false)
            setAssignmentAudiobookId(null)
          }}
        />
      )}

      {/* Character Details */}
      {selectedCharacter && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl">
                    {selectedCharacter.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{selectedCharacter.name}</CardTitle>
                  <CardDescription>{selectedCharacter.character_class} • Level {selectedCharacter.level}</CardDescription>
                </div>
              </div>

              <div className="flex gap-2">
                {!editing ? (
                  <Button onClick={() => setEditing(true)} size="sm" variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={updateCharacter} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={() => setEditing(false)} size="sm" variant="outline">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="stats" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="stats">Stats</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="achievements">Achievements</TabsTrigger>
              </TabsList>

              <TabsContent value="stats" className="space-y-6">
                {/* Basic Stats */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Core Stats</h3>
                    {characterStats
                      .filter(stat => stat.stat_category === 'core')
                      .map((stat) => (
                        <div key={stat.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            {getStatIcon(stat.stat_category)}
                            <span className="font-medium">{stat.stat_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStat(stat.id, Math.max(0, stat.stat_value - 1))}
                              disabled={stat.stat_value <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-12 text-center font-mono">{stat.stat_value}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStat(stat.id, Math.min(stat.max_value, stat.stat_value + 1))}
                              disabled={stat.stat_value >= stat.max_value}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Combat Stats</h3>
                    {characterStats
                      .filter(stat => stat.stat_category === 'combat')
                      .map((stat) => (
                        <div key={stat.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            {getStatIcon(stat.stat_category)}
                            <span className="font-medium">{stat.stat_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStat(stat.id, Math.max(0, stat.stat_value - 1))}
                              disabled={stat.stat_value <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-12 text-center font-mono">{stat.stat_value}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStat(stat.id, Math.min(stat.max_value, stat.stat_value + 1))}
                              disabled={stat.stat_value >= stat.max_value}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Other Stats */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Magic Stats</h3>
                    {characterStats
                      .filter(stat => stat.stat_category === 'magic')
                      .map((stat) => (
                        <div key={stat.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            {getStatIcon(stat.stat_category)}
                            <span className="font-medium">{stat.stat_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStat(stat.id, Math.max(0, stat.stat_value - 1))}
                              disabled={stat.stat_value <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-12 text-center font-mono">{stat.stat_value}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStat(stat.id, Math.min(stat.max_value, stat.stat_value + 1))}
                              disabled={stat.stat_value >= stat.max_value}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Social Stats</h3>
                    {characterStats
                      .filter(stat => stat.stat_category === 'social')
                      .map((stat) => (
                        <div key={stat.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            {getStatIcon(stat.stat_category)}
                            <span className="font-medium">{stat.stat_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStat(stat.id, Math.max(0, stat.stat_value - 1))}
                              disabled={stat.stat_value <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-12 text-center font-mono">{stat.stat_value}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStat(stat.id, Math.min(stat.max_value, stat.stat_value + 1))}
                              disabled={stat.stat_value >= stat.max_value}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="progress" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Experience Progress</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Level {selectedCharacter.level}</span>
                        <span>{selectedCharacter.experience}/{selectedCharacter.experience_to_next} XP</span>
                      </div>
                      <Progress
                        value={(selectedCharacter.experience / selectedCharacter.experience_to_next) * 100}
                        className="h-3"
                      />
                      <p className="text-xs text-muted-foreground">
                        {selectedCharacter.experience_to_next - selectedCharacter.experience} XP needed for next level
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Resources</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Heart className="h-5 w-5 text-red-500" />
                          <span>Health</span>
                        </div>
                        <span className="font-mono">{selectedCharacter.health}/{selectedCharacter.max_health}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="h-5 w-5 text-blue-500" />
                          <span>Mana</span>
                        </div>
                        <span className="font-mono">{selectedCharacter.mana}/{selectedCharacter.max_mana}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Coins className="h-5 w-5 text-yellow-500" />
                          <span>Gold</span>
                        </div>
                        <span className="font-mono">{selectedCharacter.gold}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="inventory" className="space-y-4">
                <InventoryManager userId={userId} selectedCharacter={selectedCharacter} />
              </TabsContent>

              <TabsContent value="achievements" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Achievements</CardTitle>
                    <CardDescription>Milestones unlocked during your journey</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Trophy className="h-12 w-12 mx-auto mb-4" />
                      <p>Achievement system coming soon!</p>
                      <p className="text-sm">Complete quests and reach milestones to unlock achievements.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}