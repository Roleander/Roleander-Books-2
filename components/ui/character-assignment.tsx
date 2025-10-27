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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  User,
  Crown,
  Star,
  Shield,
  Sword,
  Wand2,
  Eye,
  Settings,
  Target,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Play,
  Plus
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

interface CharacterAssignment {
  character_id: string
  character_name: string
  level: number
  character_class: string
  specialization?: string
  is_assigned: boolean
  assignment_type: string
  compatibility_score: number
}

interface CharacterAssignmentProps {
  audiobookId: string
  userId: string
  onAssignmentComplete: (assignments: CharacterAssignment[]) => void
  isOpen: boolean
  onClose: () => void
}

export function CharacterAssignment({
  audiobookId,
  userId,
  onAssignmentComplete,
  isOpen,
  onClose
}: CharacterAssignmentProps) {
  const [availableCharacters, setAvailableCharacters] = useState<CharacterAssignment[]>([])
  const [selectedAssignments, setSelectedAssignments] = useState<CharacterAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [assignmentMode, setAssignmentMode] = useState<'single' | 'party'>('single')
  const [showCompatibilityWarning, setShowCompatibilityWarning] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (isOpen && audiobookId) {
      fetchAvailableCharacters()
    }
  }, [isOpen, audiobookId])

  const fetchAvailableCharacters = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_available_characters_for_audiobook', {
        p_user_id: userId,
        p_audiobook_id: audiobookId
      })

      if (error) throw error

      const characters: CharacterAssignment[] = data?.map((char: any) => ({
        character_id: char.character_id,
        character_name: char.character_name,
        level: char.level,
        character_class: char.character_class,
        specialization: char.specialization,
        is_assigned: char.is_assigned,
        assignment_type: char.assignment_type || 'primary',
        compatibility_score: char.compatibility_score
      })) || []

      setAvailableCharacters(characters)

      // Pre-select already assigned characters
      const assigned = characters.filter(char => char.is_assigned)
      setSelectedAssignments(assigned)
    } catch (error) {
      console.error('Error fetching available characters:', error)
    } finally {
      setLoading(false)
    }
  }

  const assignCharacterToAudiobook = async (characterId: string, assignmentType: string = 'primary') => {
    try {
      await supabase.rpc('assign_character_to_audiobook', {
        p_character_id: characterId,
        p_audiobook_id: audiobookId,
        p_assignment_type: assignmentType
      })

      await fetchAvailableCharacters()
    } catch (error) {
      console.error('Error assigning character:', error)
    }
  }

  const removeCharacterAssignment = async (characterId: string) => {
    try {
      await supabase
        .from('character_audiobook_assignments')
        .update({ is_active: false })
        .eq('character_sheet_id', characterId)
        .eq('audiobook_id', audiobookId)

      await fetchAvailableCharacters()
    } catch (error) {
      console.error('Error removing assignment:', error)
    }
  }

  const handleCharacterToggle = (character: CharacterAssignment) => {
    const isSelected = selectedAssignments.some(a => a.character_id === character.character_id)

    if (isSelected) {
      // Remove from selection
      setSelectedAssignments(prev => prev.filter(a => a.character_id !== character.character_id))
      if (character.is_assigned) {
        removeCharacterAssignment(character.character_id)
      }
    } else {
      // Add to selection
      if (assignmentMode === 'single' && selectedAssignments.length >= 1) {
        // Replace single character
        const oldCharacter = selectedAssignments[0]
        if (oldCharacter.is_assigned) {
          removeCharacterAssignment(oldCharacter.character_id)
        }
        setSelectedAssignments([character])
      } else if (assignmentMode === 'party' && selectedAssignments.length >= 4) {
        setShowCompatibilityWarning(true)
        return
      } else {
        setSelectedAssignments(prev => [...prev, character])
      }
    }
  }

  const handleAssignmentComplete = async () => {
    try {
      // Assign all selected characters
      for (const assignment of selectedAssignments) {
        if (!assignment.is_assigned) {
          const assignmentType = assignmentMode === 'single' ? 'primary' : 'companion'
          await assignCharacterToAudiobook(assignment.character_id, assignmentType)
        }
      }

      // Remove assignments for unselected characters that were previously assigned
      const previouslyAssigned = availableCharacters.filter(char =>
        char.is_assigned && !selectedAssignments.some(a => a.character_id === char.character_id)
      )

      for (const char of previouslyAssigned) {
        await removeCharacterAssignment(char.character_id)
      }

      onAssignmentComplete(selectedAssignments)
      onClose()
    } catch (error) {
      console.error('Error completing assignments:', error)
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

  const getCompatibilityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100'
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getCompatibilityLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent'
    if (score >= 0.6) return 'Good'
    return 'Poor'
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Choose Characters for Audiobook
          </DialogTitle>
          <DialogDescription>
            Select characters to use in this audiobook adventure. Higher compatibility scores indicate better matches for the story type.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={assignmentMode} onValueChange={(value) => setAssignmentMode(value as 'single' | 'party')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Character</TabsTrigger>
            <TabsTrigger value="party">Character Party</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Choose one primary character for your audiobook journey.
            </div>
          </TabsContent>

          <TabsContent value="party" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Build a party of up to 4 characters for team-based adventures.
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              <span>Party Size: {selectedAssignments.length}/4</span>
              <Progress value={(selectedAssignments.length / 4) * 100} className="w-20 h-2" />
            </div>
          </TabsContent>
        </Tabs>

        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading characters...</p>
              </div>
            </div>
          ) : availableCharacters.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Characters Available</h3>
              <p className="text-muted-foreground mb-4">
                Create characters first to assign them to audiobooks.
              </p>
              <Button onClick={() => onClose()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Character
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {availableCharacters
                .sort((a, b) => b.compatibility_score - a.compatibility_score)
                .map((character) => {
                  const isSelected = selectedAssignments.some(a => a.character_id === character.character_id)

                  return (
                    <Card
                      key={character.character_id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:border-primary/50'
                      }`}
                      onClick={() => handleCharacterToggle(character)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback>
                              {character.character_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{character.character_name}</h3>
                              {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                              {character.is_assigned && <Star className="h-4 w-4 text-yellow-500" />}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{character.character_class}</span>
                              <Badge variant="outline" className="text-xs">Lv.{character.level}</Badge>
                              {character.specialization && (
                                <>
                                  {getSpecializationIcon(character.specialization)}
                                  <span>{character.specialization}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Compatibility</span>
                            <Badge className={getCompatibilityColor(character.compatibility_score)}>
                              {getCompatibilityLabel(character.compatibility_score)}
                            </Badge>
                          </div>
                          <Progress value={character.compatibility_score * 100} className="h-2" />

                          {character.is_assigned && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Star className="h-3 w-3" />
                              <span>Already assigned to this audiobook</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}
        </ScrollArea>

        {/* Selected Characters Summary */}
        {selectedAssignments.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Selected Characters</h4>
            <div className="flex flex-wrap gap-2">
              {selectedAssignments.map((assignment) => (
                <Badge key={assignment.character_id} variant="secondary" className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-xs">
                      {assignment.character_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {assignment.character_name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCharacterToggle(assignment)
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Compatibility Warning */}
        <Dialog open={showCompatibilityWarning} onOpenChange={setShowCompatibilityWarning}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Party Size Limit
              </DialogTitle>
              <DialogDescription>
                You can select a maximum of 4 characters for a party. Remove some characters or switch to single character mode.
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={() => setShowCompatibilityWarning(false)} className="flex-1">
                Continue
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleAssignmentComplete}
            className="flex-1"
            disabled={selectedAssignments.length === 0}
          >
            <Play className="h-4 w-4 mr-2" />
            Start Adventure
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}