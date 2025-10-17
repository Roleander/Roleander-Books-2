"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import {
  BookOpen,
  Star,
  Trophy,
  Target,
  Heart,
  Zap,
  Coins,
  CheckCircle,
  Circle,
  Plus
} from "lucide-react"

interface BookCharacterProgressionProps {
  characterId: string
  audiobookId: string
  onProgressUpdate?: (progress: BookProgress) => void
}

interface BookProgress {
  bookLevel: number
  bookExperience: number
  chaptersCompleted: number
  choicesMade: any[]
  achievements: any[]
  currentHealth?: number
  currentMana?: number
}

export function BookCharacterProgression({
  characterId,
  audiobookId,
  onProgressUpdate
}: BookCharacterProgressionProps) {
  const [bookProgress, setBookProgress] = useState<BookProgress | null>(null)
  const [audiobook, setAudiobook] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchBookProgress()
    fetchAudiobook()
  }, [characterId, audiobookId])

  const fetchBookProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('book_characters')
        .select('*')
        .eq('character_sheet_id', characterId)
        .eq('audiobook_id', audiobookId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        const progress: BookProgress = {
          bookLevel: data.book_level,
          bookExperience: data.book_experience,
          chaptersCompleted: data.chapters_completed,
          choicesMade: data.choices_made || [],
          achievements: data.achievements || [],
          currentHealth: data.current_health,
          currentMana: data.current_mana
        }
        setBookProgress(progress)
        onProgressUpdate?.(progress)
      } else {
        // Create initial book progress
        await createBookProgress()
      }
    } catch (error) {
      console.error('Error fetching book progress:', error)
    }
  }

  const createBookProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('book_characters')
        .insert({
          character_sheet_id: characterId,
          audiobook_id: audiobookId,
          book_level: 1,
          book_experience: 0,
          chapters_completed: 0,
          choices_made: [],
          achievements: []
        })
        .select()
        .single()

      if (error) throw error

      const progress: BookProgress = {
        bookLevel: 1,
        bookExperience: 0,
        chaptersCompleted: 0,
        choicesMade: [],
        achievements: []
      }
      setBookProgress(progress)
      onProgressUpdate?.(progress)
    } catch (error) {
      console.error('Error creating book progress:', error)
    }
  }

  const fetchAudiobook = async () => {
    try {
      const { data, error } = await supabase
        .from('audiobooks')
        .select('*, series(*)')
        .eq('id', audiobookId)
        .single()

      if (error) throw error
      setAudiobook(data)
    } catch (error) {
      console.error('Error fetching audiobook:', error)
    } finally {
      setLoading(false)
    }
  }

  const addExperience = async (amount: number) => {
    if (!bookProgress) return

    setUpdating(true)
    try {
      const newExperience = bookProgress.bookExperience + amount

      // Check if character should level up
      const experienceNeeded = bookProgress.bookLevel * 50 // 50 XP per level
      const shouldLevelUp = newExperience >= experienceNeeded

      const updateData: any = {
        book_experience: shouldLevelUp ? 0 : newExperience,
        updated_at: new Date().toISOString()
      }

      if (shouldLevelUp) {
        updateData.book_level = bookProgress.bookLevel + 1
        // Award achievement for leveling up
        const newAchievements = [...bookProgress.achievements]
        newAchievements.push({
          name: `Book Level ${bookProgress.bookLevel + 1}`,
          description: `Reached level ${bookProgress.bookLevel + 1} in this book`,
          type: 'level',
          unlocked_at: new Date().toISOString()
        })
        updateData.achievements = newAchievements
      }

      const { error } = await supabase
        .from('book_characters')
        .update(updateData)
        .eq('character_sheet_id', characterId)
        .eq('audiobook_id', audiobookId)

      if (error) throw error

      // Also add experience to main character
      await supabase.rpc('add_character_experience', {
        character_id: characterId,
        exp_amount: amount
      })

      await fetchBookProgress()
    } catch (error) {
      console.error('Error adding experience:', error)
    } finally {
      setUpdating(false)
    }
  }

  const recordChoice = async (choiceId: string, choiceText: string) => {
    if (!bookProgress) return

    try {
      const newChoices = [...bookProgress.choicesMade, {
        choice_id: choiceId,
        choice_text: choiceText,
        made_at: new Date().toISOString()
      }]

      const { error } = await supabase
        .from('book_characters')
        .update({
          choices_made: newChoices,
          updated_at: new Date().toISOString()
        })
        .eq('character_sheet_id', characterId)
        .eq('audiobook_id', audiobookId)

      if (error) throw error

      // Award experience for making choices
      await addExperience(10)

      await fetchBookProgress()
    } catch (error) {
      console.error('Error recording choice:', error)
    }
  }

  const completeChapter = async () => {
    if (!bookProgress) return

    try {
      const { error } = await supabase
        .from('book_characters')
        .update({
          chapters_completed: bookProgress.chaptersCompleted + 1,
          updated_at: new Date().toISOString()
        })
        .eq('character_sheet_id', characterId)
        .eq('audiobook_id', audiobookId)

      if (error) throw error

      // Award experience for completing chapter
      await addExperience(25)

      await fetchBookProgress()
    } catch (error) {
      console.error('Error completing chapter:', error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-48" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!bookProgress || !audiobook) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4" />
            <p>Loading book progression...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const experienceNeeded = bookProgress.bookLevel * 50
  const progressPercentage = (bookProgress.bookExperience / experienceNeeded) * 100

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Book Progress
            </CardTitle>
            <CardDescription>
              {audiobook.title} - Chapter {audiobook.chapter_number}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            Level {bookProgress.bookLevel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Experience Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Book Experience</span>
            <span>{bookProgress.bookExperience}/{experienceNeeded} XP</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {experienceNeeded - bookProgress.bookExperience} XP needed for next level
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Chapters</span>
            </div>
            <p className="text-2xl font-bold">{bookProgress.chaptersCompleted}</p>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Choices</span>
            </div>
            <p className="text-2xl font-bold">{bookProgress.choicesMade.length}</p>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Achievements</span>
            </div>
            <p className="text-2xl font-bold">{bookProgress.achievements.length}</p>
          </div>
        </div>

        {/* Current Resources */}
        {(bookProgress.currentHealth !== undefined || bookProgress.currentMana !== undefined) && (
          <div className="flex justify-center gap-6">
            {bookProgress.currentHealth !== undefined && (
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-sm">{bookProgress.currentHealth} HP</span>
              </div>
            )}
            {bookProgress.currentMana !== undefined && (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="text-sm">{bookProgress.currentMana} MP</span>
              </div>
            )}
          </div>
        )}

        {/* Recent Choices */}
        {bookProgress.choicesMade.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Choices</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {bookProgress.choicesMade.slice(-3).map((choice: any, index: number) => (
                <div key={index} className="text-xs p-2 bg-muted/30 rounded flex items-center gap-2">
                  <Circle className="h-3 w-3 text-green-500" />
                  <span>{choice.choice_text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        {bookProgress.achievements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Achievements</h4>
            <div className="space-y-1">
              {bookProgress.achievements.slice(-2).map((achievement: any, index: number) => (
                <div key={index} className="text-xs p-2 bg-yellow-50 border border-yellow-200 rounded flex items-center gap-2">
                  <Trophy className="h-3 w-3 text-yellow-600" />
                  <div>
                    <span className="font-medium">{achievement.name}</span>
                    <p className="text-muted-foreground">{achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            size="sm"
            onClick={() => addExperience(10)}
            disabled={updating}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add XP
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={completeChapter}
            disabled={updating}
          >
            Complete Chapter
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}