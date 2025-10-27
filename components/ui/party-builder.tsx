"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd' // Temporarily disabled due to dependency conflicts
import {
  Users,
  Plus,
  Minus,
  Crown,
  Star,
  Shield,
  Sword,
  Wand2,
  Eye,
  Settings,
  Target,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Heart,
  Trophy
} from 'lucide-react'

interface CharacterSheet {
  id: string
  name: string
  character_class: string
  level: number
  specialization?: string
  character_role?: string
  health: number
  max_health: number
  mana: number
  max_mana: number
}

interface PartyMember {
  character_id: string
  character: CharacterSheet
  member_role: 'leader' | 'member' | 'reserve'
  joined_at: string
}

interface PartyBuilderProps {
  party: {
    id: string
    name: string
    description?: string
    max_size: number
    party_theme?: string
  }
  availableCharacters: CharacterSheet[]
  onCharacterAdd: (characterId: string, role?: string) => void
  onCharacterRemove: (characterId: string) => void
  onPartyUpdate?: (updates: any) => void
  maxPartySize?: number
}

export function PartyBuilder({
  party,
  availableCharacters,
  onCharacterAdd,
  onCharacterRemove,
  onPartyUpdate,
  maxPartySize = 4
}: PartyBuilderProps) {
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>([])
  const [availableChars, setAvailableChars] = useState<CharacterSheet[]>(availableCharacters)
  const [draggedCharacter, setDraggedCharacter] = useState<CharacterSheet | null>(null)
  const [showCompatibilityWarning, setShowCompatibilityWarning] = useState(false)
  const [compatibilityIssues, setCompatibilityIssues] = useState<string[]>([])

  const supabase = createClient()

  useEffect(() => {
    fetchPartyMembers()
  }, [party.id])

  useEffect(() => {
    setAvailableChars(availableCharacters.filter(char =>
      !partyMembers.some(member => member.character_id === char.id)
    ))
  }, [availableCharacters, partyMembers])

  const fetchPartyMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('character_party_members')
        .select(`
          character_id,
          member_role,
          joined_at,
          character:character_sheets(*)
        `)
        .eq('party_id', party.id)
        .eq('is_active', true)

      if (error) throw error

      const members: PartyMember[] = data?.map(item => ({
        character_id: item.character_id,
        character: item.character as CharacterSheet,
        member_role: item.member_role as 'leader' | 'member' | 'reserve',
        joined_at: item.joined_at
      })) || []

      setPartyMembers(members)
    } catch (error) {
      console.error('Error fetching party members:', error)
    }
  }

  // Simplified drag and drop without external library
  const handleCharacterClick = (character: CharacterSheet, action: 'add' | 'remove') => {
    if (action === 'add') {
      if (partyMembers.length >= maxPartySize) {
        setCompatibilityIssues(['Party is already at maximum size'])
        setShowCompatibilityWarning(true)
        return
      }
      addCharacterToParty(character, 'member')
    } else {
      removeCharacterFromParty(character.id)
    }
  }

  const addCharacterToParty = async (character: CharacterSheet, role: string = 'member') => {
    try {
      // Check compatibility
      const issues = checkPartyCompatibility([...partyMembers, { character, member_role: role as any }])
      if (issues.length > 0) {
        setCompatibilityIssues(issues)
        setShowCompatibilityWarning(true)
        return
      }

      await onCharacterAdd(character.id, role)
      await fetchPartyMembers()
    } catch (error) {
      console.error('Error adding character to party:', error)
    }
  }

  const removeCharacterFromParty = async (characterId: string) => {
    try {
      await onCharacterRemove(characterId)
      await fetchPartyMembers()
    } catch (error) {
      console.error('Error removing character from party:', error)
    }
  }

  const updateMemberRole = async (characterId: string, newRole: 'leader' | 'member' | 'reserve') => {
    try {
      // If setting as leader, remove leader status from others
      if (newRole === 'leader') {
        const currentLeader = partyMembers.find(m => m.member_role === 'leader')
        if (currentLeader && currentLeader.character_id !== characterId) {
          // Update current leader to member
          await supabase
            .from('character_party_members')
            .update({ member_role: 'member' })
            .eq('party_id', party.id)
            .eq('character_id', currentLeader.character_id)
        }
      }

      await supabase
        .from('character_party_members')
        .update({ member_role: newRole })
        .eq('party_id', party.id)
        .eq('character_id', characterId)

      await fetchPartyMembers()
    } catch (error) {
      console.error('Error updating member role:', error)
    }
  }

  const checkPartyCompatibility = (members: PartyMember[]): string[] => {
    const issues: string[] = []

    // Check for multiple leaders
    const leaders = members.filter(m => m.member_role === 'leader')
    if (leaders.length > 1) {
      issues.push('Only one character can be the party leader')
    }

    // Check for party size
    if (members.length > maxPartySize) {
      issues.push(`Party size exceeds maximum of ${maxPartySize} members`)
    }

    // Check for specialization balance
    const specializations = members.map(m => m.character.specialization).filter(Boolean)
    const uniqueSpecs = [...new Set(specializations)]
    if (uniqueSpecs.length < Math.min(members.length, 3)) {
      issues.push('Consider diversifying party specializations for better synergy')
    }

    return issues
  }

  const calculatePartyStats = () => {
    const totalLevel = partyMembers.reduce((sum, member) => sum + member.character.level, 0)
    const avgLevel = partyMembers.length > 0 ? Math.round(totalLevel / partyMembers.length) : 0

    const totalHealth = partyMembers.reduce((sum, member) => sum + member.character.max_health, 0)
    const totalMana = partyMembers.reduce((sum, member) => sum + member.character.max_mana, 0)

    const specializations = partyMembers
      .map(m => m.character.specialization)
      .filter(Boolean)
      .reduce((acc, spec) => {
        acc[spec] = (acc[spec] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    return {
      totalMembers: partyMembers.length,
      avgLevel,
      totalHealth,
      totalMana,
      specializations,
      synergyBonus: calculateSynergyBonus()
    }
  }

  const calculateSynergyBonus = (): number => {
    let bonus = 0

    // Size bonus
    if (partyMembers.length >= 3) bonus += 10
    if (partyMembers.length >= 4) bonus += 10

    // Specialization diversity bonus
    const uniqueSpecs = new Set(partyMembers.map(m => m.character.specialization).filter(Boolean))
    bonus += uniqueSpecs.size * 5

    // Level harmony bonus
    const levels = partyMembers.map(m => m.character.level)
    const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length
    const variance = levels.reduce((sum, level) => sum + Math.pow(level - avgLevel, 2), 0) / levels.length
    if (variance < 4) bonus += 15 // Well-balanced levels

    return Math.min(bonus, 50) // Cap at 50% bonus
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'leader': return <Crown className="h-4 w-4 text-yellow-500" />
      case 'member': return <Star className="h-4 w-4 text-blue-500" />
      case 'reserve': return <Minus className="h-4 w-4 text-gray-500" />
      default: return <User className="h-4 w-4" />
    }
  }

  const partyStats = calculatePartyStats()

  return (
    <div className="space-y-6">
      {/* Party Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {party.name}
              </CardTitle>
              <CardDescription>{party.description}</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{partyMembers.length}/{party.max_size}</div>
              <div className="text-sm text-muted-foreground">Members</div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-semibold">{partyStats.avgLevel}</div>
              <div className="text-xs text-muted-foreground">Avg Level</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{partyStats.totalHealth}</div>
              <div className="text-xs text-muted-foreground">Total HP</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{partyStats.totalMana}</div>
              <div className="text-xs text-muted-foreground">Total MP</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">+{partyStats.synergyBonus}%</div>
              <div className="text-xs text-muted-foreground">Synergy</div>
            </div>
          </div>

          <Progress value={(partyMembers.length / party.max_size) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Character Management Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Characters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Characters</CardTitle>
            <CardDescription>Click characters to add them to your party</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2 p-2 rounded-lg min-h-[200px] bg-muted/30">
                {availableChars.map((character) => (
                  <Card
                    key={character.id}
                    className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                    onClick={() => handleCharacterClick(character, 'add')}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {character.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm">{character.name}</h4>
                            <Badge variant="outline" className="text-xs">Lv.{character.level}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{character.character_class}</span>
                            {character.specialization && (
                              <>
                                {getSpecializationIcon(character.specialization)}
                                <span>{character.specialization}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {availableChars.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2" />
                    <p>No available characters</p>
                    <p className="text-xs">Create more characters to add to parties</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Party Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Party Members</CardTitle>
            <CardDescription>Manage your party composition and roles</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2 p-2 rounded-lg min-h-[200px] bg-muted/30">
                {partyMembers.map((member) => (
                  <Card key={member.character_id} className="transition-all hover:shadow-md">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {member.character.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm">{member.character.name}</h4>
                            {getRoleIcon(member.member_role)}
                            <Badge variant="outline" className="text-xs capitalize">
                              {member.member_role}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{member.character.character_class}</span>
                            {member.character.specialization && (
                              <>
                                {getSpecializationIcon(member.character.specialization)}
                                <span>{member.character.specialization}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Select
                            value={member.member_role}
                            onValueChange={(value) => updateMemberRole(member.character_id, value as any)}
                          >
                            <SelectTrigger className="w-20 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="leader">Leader</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="reserve">Reserve</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCharacterClick(member.character, 'remove')}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {partyMembers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2" />
                    <p>No party members yet</p>
                    <p className="text-xs">Add characters from the left panel</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Compatibility Warning Dialog */}
      <Dialog open={showCompatibilityWarning} onOpenChange={setShowCompatibilityWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Party Compatibility Issues
            </DialogTitle>
            <DialogDescription>
              The following issues were found with your party composition:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {compatibilityIssues.map((issue, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <XCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">{issue}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={() => setShowCompatibilityWarning(false)} className="flex-1">
              Continue Anyway
            </Button>
            <Button variant="outline" onClick={() => setShowCompatibilityWarning(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}