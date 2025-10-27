"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MultiplayerLobby } from '@/components/ui/multiplayer-lobby'
import { VotingInterface } from '@/components/ui/voting-interface'
import { SessionManager } from '@/components/ui/session-manager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  Vote,
  Settings,
  Play,
  Pause,
  BookOpen,
  Crown,
  Wifi,
  WifiOff,
  Clock,
  ArrowLeft
} from 'lucide-react'

interface MultiplayerSession {
  id: string
  session_code: string
  host_user_id: string
  audiobook_id: string
  audiobook_title?: string
  max_players: number
  current_players: number
  session_status: string
  voting_enabled: boolean
  vote_timeout_seconds: number
  majority_threshold: number
}

interface VotingChoice {
  choice_id: string
  choice_text: string
  total_votes: number
  total_weight: number
  percentage: number
}

interface VotingParticipant {
  participant_id: string
  user_id: string
  character_name: string
  participant_role: string
  vote_weight: number
  has_voted: boolean
  last_vote_at?: string
  is_connected: boolean
  connection_quality: string
}

export default function MultiplayerPage() {
  const [user, setUser] = useState<any>(null)
  const [currentView, setCurrentView] = useState<'lobby' | 'session'>('lobby')
  const [currentSession, setCurrentSession] = useState<MultiplayerSession | null>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [participants, setParticipants] = useState<VotingParticipant[]>([])
  const [votingChoices, setVotingChoices] = useState<VotingChoice[]>([])
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [userVote, setUserVote] = useState<string | undefined>(undefined)
  const [showResults, setShowResults] = useState(false)
  const [winnerChoiceId, setWinnerChoiceId] = useState<string | undefined>(undefined)
  const [audiobooks, setAudiobooks] = useState<Array<{ id: string, title: string }>>([])

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    fetchAudiobooks()
  }, [])

  useEffect(() => {
    if (currentSession && participantId) {
      // Set up real-time subscriptions
      setupRealtimeSubscriptions()

      // Start voting timer if active
      if (timeRemaining > 0) {
        const timer = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev <= 1) {
              // Auto-resolve voting round
              resolveCurrentVotingRound()
              return 0
            }
            return prev - 1
          })
        }, 1000)

        return () => clearInterval(timer)
      }
    }
  }, [currentSession, participantId, timeRemaining])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }
    setUser(user)
  }

  const fetchAudiobooks = async () => {
    try {
      const { data, error } = await supabase
        .from('audiobooks')
        .select('id, title')
        .order('title')

      if (error) throw error
      setAudiobooks(data || [])
    } catch (error) {
      console.error('Error fetching audiobooks:', error)
    }
  }

  const setupRealtimeSubscriptions = () => {
    if (!currentSession) return

    // Subscribe to session updates
    const sessionSubscription = supabase
      .channel(`session_${currentSession.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'multiplayer_sessions',
        filter: `id=eq.${currentSession.id}`
      }, (payload) => {
        const updatedSession = payload.new as MultiplayerSession
        setCurrentSession(updatedSession)
      })
      .subscribe()

    // Subscribe to participant updates
    const participantSubscription = supabase
      .channel(`session_participants_${currentSession.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_participants',
        filter: `session_id=eq.${currentSession.id}`
      }, () => {
        fetchSessionParticipants()
      })
      .subscribe()

    // Subscribe to voting rounds
    const votingSubscription = supabase
      .channel(`voting_rounds_${currentSession.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'voting_rounds',
        filter: `session_id=eq.${currentSession.id}`
      }, (payload) => {
        handleVotingRoundUpdate(payload.new)
      })
      .subscribe()

    return () => {
      sessionSubscription.unsubscribe()
      participantSubscription.unsubscribe()
      votingSubscription.unsubscribe()
    }
  }

  const fetchSessionParticipants = async () => {
    if (!currentSession) return

    try {
      const { data, error } = await supabase.rpc('get_session_participants', {
        p_session_id: currentSession.id
      })

      if (error) throw error

      const formattedParticipants: VotingParticipant[] = data?.map((p: any) => ({
        participant_id: p.participant_id,
        user_id: p.user_id,
        character_name: p.character_name,
        participant_role: p.participant_role,
        vote_weight: p.vote_weight,
        has_voted: p.has_voted,
        last_vote_at: p.last_vote_at,
        is_connected: p.is_connected,
        connection_quality: p.connection_quality
      })) || []

      setParticipants(formattedParticipants)
    } catch (error) {
      console.error('Error fetching participants:', error)
    }
  }

  const handleVotingRoundUpdate = async (votingRound: any) => {
    if (votingRound.round_status === 'active') {
      // Start new voting round
      setTimeRemaining(currentSession?.vote_timeout_seconds || 60)
      setUserVote(undefined)
      setShowResults(false)
      setWinnerChoiceId(undefined)

      // Fetch voting choices
      await fetchVotingChoices()
    } else if (votingRound.round_status === 'completed') {
      // Voting round completed
      setTimeRemaining(0)
      setShowResults(true)
      setWinnerChoiceId(votingRound.winning_choice_id)

      // Fetch final results
      await fetchVotingChoices()
    }
  }

  const fetchVotingChoices = async () => {
    if (!currentSession) return

    try {
      const { data, error } = await supabase.rpc('get_voting_results', {
        p_session_id: currentSession.id
      })

      if (error) throw error

      const formattedChoices: VotingChoice[] = data?.map((c: any) => ({
        choice_id: c.choice_id,
        choice_text: c.choice_text,
        total_votes: c.total_votes,
        total_weight: c.total_weight,
        percentage: c.percentage
      })) || []

      setVotingChoices(formattedChoices)
    } catch (error) {
      console.error('Error fetching voting choices:', error)
    }
  }

  const handleJoinSession = async (sessionId: string, newParticipantId: string) => {
    try {
      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('multiplayer_sessions')
        .select(`
          *,
          audiobook:audiobook_id(title)
        `)
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError

      const session: MultiplayerSession = {
        ...sessionData,
        audiobook_title: sessionData.audiobook?.title || 'Unknown Audiobook'
      }

      setCurrentSession(session)
      setParticipantId(newParticipantId)
      setIsHost(session.host_user_id === user?.id)
      setCurrentView('session')

      // Fetch initial data
      await fetchSessionParticipants()
    } catch (error) {
      console.error('Error joining session:', error)
    }
  }

  const handleCreateSession = () => {
    // Refresh the lobby to show the new session
    setCurrentView('lobby')
  }

  const handleVote = async (choiceId: string) => {
    if (!currentSession || !participantId) return

    try {
      await supabase.rpc('cast_vote', {
        p_session_id: currentSession.id,
        p_participant_id: participantId,
        p_choice_id: choiceId
      })

      setUserVote(choiceId)
    } catch (error) {
      console.error('Error casting vote:', error)
    }
  }

  const resolveCurrentVotingRound = async () => {
    if (!currentSession) return

    try {
      await supabase.rpc('resolve_voting_round', {
        p_voting_round_id: null, // Will resolve the active round
        p_force_resolution: true
      })
    } catch (error) {
      console.error('Error resolving voting round:', error)
    }
  }

  const handleKickPlayer = async (participantId: string) => {
    // Implementation for kicking players
    console.log('Kicking player:', participantId)
  }

  const handleEndSession = async () => {
    if (!currentSession) return

    try {
      await supabase
        .from('multiplayer_sessions')
        .update({
          session_status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', currentSession.id)

      setCurrentView('lobby')
      setCurrentSession(null)
      setParticipantId(null)
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }

  const handlePauseSession = async () => {
    if (!currentSession) return

    try {
      await supabase
        .from('multiplayer_sessions')
        .update({ session_status: 'paused' })
        .eq('id', currentSession.id)
    } catch (error) {
      console.error('Error pausing session:', error)
    }
  }

  const handleResumeSession = async () => {
    if (!currentSession) return

    try {
      await supabase
        .from('multiplayer_sessions')
        .update({ session_status: 'active' })
        .eq('id', currentSession.id)
    } catch (error) {
      console.error('Error resuming session:', error)
    }
  }

  const handleUpdateSettings = async (settings: any) => {
    // Settings are updated in the SessionManager component
    console.log('Settings updated:', settings)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Multiplayer Sessions</h1>
              <p className="text-muted-foreground">
                Experience democratic storytelling with friends
              </p>
            </div>
          </div>

          {currentSession && (
            <div className="flex items-center gap-4">
              <Badge className={`${
                currentSession.session_status === 'active' ? 'bg-green-100 text-green-800' :
                currentSession.session_status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {currentSession.session_status}
              </Badge>
              <div className="text-sm text-muted-foreground">
                Code: <span className="font-mono font-semibold">{currentSession.session_code}</span>
              </div>
            </div>
          )}
        </div>

        {currentView === 'lobby' ? (
          <MultiplayerLobby
            userId={user.id}
            onJoinSession={handleJoinSession}
            onCreateSession={handleCreateSession}
            availableAudiobooks={audiobooks}
          />
        ) : (
          <Tabs defaultValue="voting" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="voting">Democratic Voting</TabsTrigger>
              <TabsTrigger value="session">Session Management</TabsTrigger>
              <TabsTrigger value="story">Story Progress</TabsTrigger>
            </TabsList>

            <TabsContent value="voting" className="space-y-6">
              {votingChoices.length > 0 ? (
                <VotingInterface
                  sessionId={currentSession!.id}
                  participantId={participantId!}
                  audiobookId={currentSession!.audiobook_id}
                  timeRemaining={timeRemaining}
                  choices={votingChoices}
                  participants={participants}
                  userVote={userVote}
                  onVote={handleVote}
                  showResults={showResults}
                  winnerChoiceId={winnerChoiceId}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Vote className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Active Voting</h3>
                    <p className="text-muted-foreground text-center">
                      Waiting for the next story choice point. The session will automatically
                      start voting when choices become available.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="session" className="space-y-6">
              <SessionManager
                sessionId={currentSession!.id}
                participantId={participantId!}
                isHost={isHost}
                participants={participants}
                sessionStatus={currentSession!.session_status}
                onKickPlayer={handleKickPlayer}
                onEndSession={handleEndSession}
                onPauseSession={handlePauseSession}
                onResumeSession={handleResumeSession}
                onUpdateSettings={handleUpdateSettings}
              />
            </TabsContent>

            <TabsContent value="story" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Story Progress
                  </CardTitle>
                  <CardDescription>
                    Current audiobook: {currentSession?.audiobook_title}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Story progress tracking will be implemented here.
                      This will show the current chapter, completed choices,
                      and overall story progression.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}