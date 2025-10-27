"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Vote,
  Clock,
  Users,
  CheckCircle,
  Crown,
  Star,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Laugh,
  Angry,
  Trophy
} from 'lucide-react'

interface VotingChoice {
  choice_id: string
  choice_text: string
  total_votes: number
  total_weight: number
  percentage: number
}

interface VotingParticipant {
  participant_id: string
  character_name: string
  participant_role: string
  vote_weight: number
  has_voted: boolean
  is_connected: boolean
}

interface VotingInterfaceProps {
  sessionId: string
  participantId: string
  audiobookId: string
  timeRemaining: number
  choices: VotingChoice[]
  participants: VotingParticipant[]
  userVote?: string
  onVote: (choiceId: string) => void
  onChangeVote?: (choiceId: string) => void
  allowVoteChanges?: boolean
  showResults?: boolean
  winnerChoiceId?: string
}

export function VotingInterface({
  sessionId,
  participantId,
  audiobookId,
  timeRemaining,
  choices,
  participants,
  userVote,
  onVote,
  onChangeVote,
  allowVoteChanges = true,
  showResults = false,
  winnerChoiceId
}: VotingInterfaceProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(userVote || null)
  const [isVoting, setIsVoting] = useState(false)
  const [showReactions, setShowReactions] = useState(false)

  const supabase = createClient()

  const handleVote = async (choiceId: string) => {
    if (isVoting) return

    setIsVoting(true)
    try {
      setSelectedChoice(choiceId)
      await onVote(choiceId)
    } catch (error) {
      console.error('Error casting vote:', error)
      setSelectedChoice(null)
    } finally {
      setIsVoting(false)
    }
  }

  const handleChangeVote = async (choiceId: string) => {
    if (!allowVoteChanges || !onChangeVote) return

    setIsVoting(true)
    try {
      setSelectedChoice(choiceId)
      await onChangeVote(choiceId)
    } catch (error) {
      console.error('Error changing vote:', error)
    } finally {
      setIsVoting(false)
    }
  }

  const sendReaction = async (emoji: string) => {
    try {
      await supabase
        .from('session_messages')
        .insert({
          session_id: sessionId,
          participant_id: participantId,
          message_type: 'reaction',
          emoji: emoji
        })
    } catch (error) {
      console.error('Error sending reaction:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getVoteWeightIcon = (weight: number) => {
    if (weight >= 2.0) return <Crown className="h-4 w-4 text-yellow-500" />
    if (weight >= 1.5) return <Star className="h-4 w-4 text-blue-500" />
    return <Vote className="h-4 w-4 text-gray-500" />
  }

  const getReactionIcon = (reaction: string) => {
    switch (reaction) {
      case '👍': return <ThumbsUp className="h-4 w-4" />
      case '👎': return <ThumbsDown className="h-4 w-4" />
      case '❤️': return <Heart className="h-4 w-4" />
      case '😂': return <Laugh className="h-4 w-4" />
      case '😠': return <Angry className="h-4 w-4" />
      default: return <MessageCircle className="h-4 w-4" />
    }
  }

  const reactions = ['👍', '👎', '❤️', '😂', '😠']

  const totalVotes = choices.reduce((sum, choice) => sum + choice.total_votes, 0)
  const totalWeight = choices.reduce((sum, choice) => sum + choice.total_weight, 0)

  return (
    <div className="space-y-6">
      {/* Voting Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Vote className="h-5 w-5" />
                Democratic Choice
              </CardTitle>
              <CardDescription>
                Cast your vote to influence the story direction
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-lg font-mono">
                <Clock className="h-5 w-5" />
                {formatTime(timeRemaining)}
              </div>
              <div className="text-sm text-muted-foreground">
                {totalVotes} votes cast
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Progress
            value={((60 - timeRemaining) / 60) * 100}
            className="h-2"
          />
        </CardContent>
      </Card>

      {/* Participants Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Session Participants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32">
            <div className="space-y-2">
              {participants.map((participant) => (
                <div key={participant.participant_id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {participant.character_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{participant.character_name}</span>
                      {participant.participant_role === 'host' && <Crown className="h-3 w-3 text-yellow-500" />}
                      <Badge variant="outline" className="text-xs">
                        {participant.participant_role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {getVoteWeightIcon(participant.vote_weight)}
                      <span>{participant.vote_weight.toFixed(1)}x vote weight</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {participant.has_voted ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-muted-foreground/30 rounded-full" />
                    )}
                    <div className={`w-2 h-2 rounded-full ${
                      participant.is_connected ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Voting Choices */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Choose Your Path</h3>
        <div className="grid gap-4">
          {choices.map((choice) => {
            const isSelected = selectedChoice === choice.choice_id
            const isWinner = winnerChoiceId === choice.choice_id
            const canVote = !userVote || (allowVoteChanges && !showResults)

            return (
              <Card
                key={choice.choice_id}
                className={`cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'
                } ${isWinner ? 'ring-2 ring-yellow-500 bg-yellow-50' : ''}`}
                onClick={() => {
                  if (canVote) {
                    if (!userVote) {
                      handleVote(choice.choice_id)
                    } else if (allowVoteChanges) {
                      handleChangeVote(choice.choice_id)
                    }
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-medium mb-2">{choice.choice_text}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{choice.total_votes} votes</span>
                        <span>{choice.total_weight.toFixed(1)} weight</span>
                        <span>{choice.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    {isWinner && (
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    )}
                  </div>

                  <Progress value={choice.percentage} className="h-2" />

                  {isSelected && (
                    <div className="mt-2 text-sm text-primary font-medium">
                      ✓ Your choice {userVote && allowVoteChanges ? '(changed)' : ''}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Reactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Quick Reactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {reactions.map((reaction) => (
              <Button
                key={reaction}
                variant="outline"
                size="sm"
                onClick={() => sendReaction(reaction)}
                className="flex items-center gap-1"
              >
                {getReactionIcon(reaction)}
                <span className="text-lg">{reaction}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Voting Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vote className="h-4 w-4" />
              <span className="text-sm">
                {userVote ? 'Vote cast' : 'No vote yet'}
              </span>
              {userVote && allowVoteChanges && !showResults && (
                <Badge variant="outline" className="text-xs">
                  Can change vote
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Total voting weight: {totalWeight.toFixed(1)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}