"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Star,
  Shield,
  Sword,
  Heart,
  Zap,
  User,
  Crown,
  BookOpen,
  Trophy,
  Target,
  Wand2,
  Eye,
  Settings,
  PartyPopper
} from 'lucide-react'

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
  specialization?: string
  character_role?: string
  party_id?: string
  is_primary?: boolean
  avatar_url?: string
}

interface CharacterParty {
  party_id: string
  party_name: string
  party_description?: string
  max_size: number
  current_size: number
  party_theme?: string
  members: Array<{
    character_id: string
    character_name: string
    level: number
    character_class: string
    specialization?: string
    member_role: string
  }>
  synergy_effects?: Array<{
    effect_type: string
    effect_name: string
    effect_description: string
    effect_value: any
  }>
}

interface CharacterRosterProps {
  userId: string
  onCharacterSelect?: (character: CharacterSheet) => void
  onPartyCreate?: () => void
  showAudiobookFilter?: boolean
  audiobookId?: string
}

export function CharacterRoster({
  userId,
  onCharacterSelect,
  onPartyCreate,
  showAudiobookFilter = false,
  audiobookId
}: CharacterRosterProps) {
  const [characters, setCharacters] = useState<CharacterSheet[]>([])
  const [parties, setParties] = useState<CharacterParty[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterSheet | null>(null)
  const [selectedParty, setSelectedParty] = useState<CharacterParty | null>(null)
  const [showPartyDialog, setShowPartyDialog] = useState(false)
  const [showCreatePartyDialog, setShowCreatePartyDialog] = useState(false)
  const [newPartyForm, setNewPartyForm] = useState({
    name: '',
    description: '',
    max_size: 4,
    party_theme: 'mixed'
  })

  const supabase = createClient()

  useEffect(() => {
    fetchCharacters()
    fetchParties()
  }, [userId])

  const fetchCharacters = async () => {
    try {
      const { data, error } = await supabase
        .from('character_sheets')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setCharacters(data || [])
    } catch (error) {
      console.error('Error fetching characters:', error)
    }
  }

  const fetchParties = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_parties', { p_user_id: userId })
      if (error) throw error
      setParties(data || [])
    } catch (error) {
      console.error('Error fetching parties:', error)
    } finally {
      setLoading(false)
    }
  }

  const createNewParty = async () => {
    try {
      const { data, error } = await supabase.rpc('create_character_party', {
        p_user_id: userId,
        p_party_name: newPartyForm.name,
        p_description: newPartyForm.description,
        p_max_size: newPartyForm.max_size,
        p_party_theme: newPartyForm.party_theme
      })

      if (error) throw error

      setShowCreatePartyDialog(false)
      setNewPartyForm({ name: '', description: '', max_size: 4, party_theme: 'mixed' })
      await fetchParties()
    } catch (error) {
      console.error('Error creating party:', error)
    }
  }

  const addCharacterToParty = async (characterId: string, partyId: string) => {
    try {
      const { error } = await supabase.rpc('add_character_to_party', {
        p_party_id: partyId,
        p_character_id: characterId
      })

      if (error) throw error

      await fetchCharacters()
      await fetchParties()
    } catch (error) {
      console.error('Error adding character to party:', error)
    }
  }

  const getSpecializationIcon = (specialization?: string) => {
    switch (specialization?.toLowerCase()) {
      case 'combat': return <Sword className="h-4 w-4" />
      case 'magic': return <Wand2 className="h-4 w-4" />
      case 'stealth': return <Eye className="h-4 w-4" />
      case 'social': return <Users className="h-4 w-4" />
      case 'technical': return <Settings className="h-4 w-4" />
      case 'survival': return <Shield className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getRoleIcon = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'leader': return <Crown className="h-4 w-4" />
      case 'primary': return <Star className="h-4 w-4" />
      case 'companion': return <Users className="h-4 w-4" />
      case 'specialist': return <Target className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getPartyThemeColor = (theme?: string) => {
    switch (theme?.toLowerCase()) {
      case 'fantasy': return 'bg-purple-100 text-purple-800'
      case 'sci-fi': return 'bg-cyan-100 text-cyan-800'
      case 'mixed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-blue-100 text-blue-800'
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
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Character Roster
              </CardTitle>
              <CardDescription>Manage your characters and form parties for team-based adventures</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowCreatePartyDialog(true)} size="sm" variant="outline">
                <PartyPopper className="h-4 w-4 mr-2" />
                Create Party
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="characters" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="characters">Characters ({characters.length})</TabsTrigger>
          <TabsTrigger value="parties">Parties ({parties.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="characters" className="space-y-4">
          {characters.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Characters Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first character to begin your RPG journey
                </p>
                <Button onClick={() => onCharacterSelect?.({} as CharacterSheet)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Character
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {characters.map((character) => (
                <Card
                  key={character.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedCharacter?.id === character.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedCharacter(character)
                    onCharacterSelect?.(character)
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {character.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{character.name}</h3>
                          {character.is_primary && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                          {getRoleIcon(character.character_role)}
                        </div>
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
                          <Trophy className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs">{character.gold}</span>
                        </div>
                      </div>

                      {character.specialization && (
                        <div className="flex items-center gap-2">
                          {getSpecializationIcon(character.specialization)}
                          <Badge variant="outline" className="text-xs">
                            {character.specialization}
                          </Badge>
                        </div>
                      )}

                      {character.party_id && (
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">In Party</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="parties" className="space-y-4">
          {parties.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <PartyPopper className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Parties Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create a party to bring your characters together for team-based adventures
                </p>
                <Button onClick={() => setShowCreatePartyDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Party
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {parties.map((party) => (
                <Card
                  key={party.party_id}
                  className="cursor-pointer transition-all hover:shadow-lg"
                  onClick={() => setSelectedParty(party)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{party.party_name}</CardTitle>
                      <Badge className={getPartyThemeColor(party.party_theme)}>
                        {party.party_theme}
                      </Badge>
                    </div>
                    <CardDescription>{party.party_description}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Members: {party.current_size}/{party.max_size}</span>
                        <Progress value={(party.current_size / party.max_size) * 100} className="w-20 h-2" />
                      </div>

                      <div className="space-y-2">
                        {party.members?.slice(0, 3).map((member, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {member.character_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{member.character_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  Lv.{member.level}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{member.character_class}</span>
                                {member.specialization && (
                                  <>
                                    {getSpecializationIcon(member.specialization)}
                                    <span className="text-xs text-muted-foreground">{member.specialization}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {party.members && party.members.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{party.members.length - 3} more members
                          </div>
                        )}
                      </div>

                      {party.synergy_effects && party.synergy_effects.length > 0 && (
                        <div className="pt-2 border-t">
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            Party Synergy ({party.synergy_effects.length} effects)
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Party Dialog */}
      <Dialog open={showCreatePartyDialog} onOpenChange={setShowCreatePartyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Party</DialogTitle>
            <DialogDescription>
              Form a party to bring your characters together for team-based adventures
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="party-name">Party Name</Label>
              <Input
                id="party-name"
                value={newPartyForm.name}
                onChange={(e) => setNewPartyForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter party name"
              />
            </div>

            <div>
              <Label htmlFor="party-description">Description</Label>
              <Textarea
                id="party-description"
                value={newPartyForm.description}
                onChange={(e) => setNewPartyForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your party"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="party-size">Max Size</Label>
                <Select
                  value={newPartyForm.max_size.toString()}
                  onValueChange={(value) => setNewPartyForm(prev => ({ ...prev, max_size: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Members</SelectItem>
                    <SelectItem value="3">3 Members</SelectItem>
                    <SelectItem value="4">4 Members</SelectItem>
                    <SelectItem value="5">5 Members</SelectItem>
                    <SelectItem value="6">6 Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="party-theme">Theme</Label>
                <Select
                  value={newPartyForm.party_theme}
                  onValueChange={(value) => setNewPartyForm(prev => ({ ...prev, party_theme: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fantasy">Fantasy</SelectItem>
                    <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="horror">Horror</SelectItem>
                    <SelectItem value="mystery">Mystery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={createNewParty} className="flex-1">
              Create Party
            </Button>
            <Button variant="outline" onClick={() => setShowCreatePartyDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Party Details Dialog */}
      <Dialog open={!!selectedParty} onOpenChange={() => setSelectedParty(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5" />
              {selectedParty?.party_name}
            </DialogTitle>
            <DialogDescription>{selectedParty?.party_description}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px]">
            <div className="space-y-6">
              {/* Party Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedParty?.current_size}</div>
                      <div className="text-sm text-muted-foreground">Members</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedParty?.max_size}</div>
                      <div className="text-sm text-muted-foreground">Max Size</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Party Members */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Party Members</h3>
                <div className="space-y-3">
                  {selectedParty?.members?.map((member, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback>
                              {member.character_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{member.character_name}</h4>
                              <Badge variant="outline">Lv.{member.level}</Badge>
                              <Badge className="capitalize">{member.member_role}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{member.character_class}</span>
                              {member.specialization && (
                                <>
                                  <Separator orientation="vertical" className="h-4" />
                                  <div className="flex items-center gap-1">
                                    {getSpecializationIcon(member.specialization)}
                                    <span>{member.specialization}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Party Synergy Effects */}
              {selectedParty?.synergy_effects && selectedParty.synergy_effects.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Party Synergy</h3>
                  <div className="space-y-3">
                    {selectedParty.synergy_effects.map((effect, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded">
                              <Star className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold">{effect.effect_name}</h4>
                              <p className="text-sm text-muted-foreground mb-2">{effect.effect_description}</p>
                              <div className="text-xs text-muted-foreground">
                                Type: {effect.effect_type}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setSelectedParty(null)} className="flex-1">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}