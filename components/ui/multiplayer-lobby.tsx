"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  Plus,
  Play,
  Pause,
  Crown,
  User,
  Clock,
  Wifi,
  WifiOff,
  MessageCircle,
  Settings,
  Copy,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Gamepad2,
  Vote
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
  created_at: string
}

interface SessionParticipant {
  participant_id: string
  user_id: string
  character_name: string
  participant_role: string
  vote_weight: number
  has_voted: boolean
  is_connected: boolean
  connection_quality: string
}

interface MultiplayerLobbyProps {
  userId: string
  onJoinSession: (sessionId: string, participantId: string) => void
  onCreateSession: () => void
  availableAudiobooks?: Array<{ id: string, title: string }>
}

export function MultiplayerLobby({
  userId,
  onJoinSession,
  onCreateSession,
  availableAudiobooks = []
}: MultiplayerLobbyProps) {
  const [sessions, setSessions] = useState<MultiplayerSession[]>([])
  const [loading, setLoading] = useState(true)
  const [joinCode, setJoinCode] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [selectedSession, setSelectedSession] = useState<MultiplayerSession | null>(null)
  const [sessionParticipants, setSessionParticipants] = useState<SessionParticipant[]>([])
  const [createForm, setCreateForm] = useState({
    audiobook_id: '',
    max_players: 4,
    vote_timeout_seconds: 60,
    majority_threshold: 0.5
  })

  const supabase = createClient()

  useEffect(() => {
    fetchSessions()
    // Set up real-time subscription for session updates
    const subscription = supabase
      .channel('multiplayer_sessions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'multiplayer_sessions'
      }, () => {
        fetchSessions()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('multiplayer_sessions')
        .select(`
          *,
          audiobook:audiobook_id(title)
        `)
        .eq('session_status', 'waiting')
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedSessions: MultiplayerSession[] = data?.map(session => ({
        ...session,
        audiobook_title: session.audiobook?.title || 'Unknown Audiobook'
      })) || []

      setSessions(formattedSessions)
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const createSession = async () => {
    try {
      const { data, error } = await supabase.rpc('create_multiplayer_session', {
        p_host_user_id: userId,
        p_audiobook_id: createForm.audiobook_id,
        p_max_players: createForm.max_players,
        p_vote_timeout_seconds: createForm.vote_timeout_seconds,
        p_majority_threshold: createForm.majority_threshold
      })

      if (error) throw error

      if (data && data.length > 0) {
        const sessionId = data[0].session_id
        const sessionCode = data[0].session_code
        console.log('Created session:', sessionId, 'Code:', sessionCode)
        setShowCreateDialog(false)
        onCreateSession()
      }
    } catch (error) {
      console.error('Error creating session:', error)
    }
  }

  const joinSession = async () => {
    try {
      const { data, error } = await supabase.rpc('join_multiplayer_session', {
        p_session_code: joinCode.toUpperCase(),
        p_user_id: userId
      })

      if (error) throw error

      if (data) {
        console.log('Joined session, participant ID:', data)
        setShowJoinDialog(false)
        onJoinSession(joinCode.toUpperCase(), data)
      }
    } catch (error) {
      console.error('Error joining session:', error)
      alert('Failed to join session. Please check the code and try again.')
    }
  }

  const viewSessionDetails = async (session: MultiplayerSession) => {
    setSelectedSession(session)
    try {
      const { data, error } = await supabase.rpc('get_session_participants', { p_session_id: session.id })
      if (error) throw error
      setSessionParticipants(data || [])
    } catch (error) {
      console.error('Error fetching session participants:', error)
    }
  }

  const copySessionCode = (code: string) => {
    navigator.clipboard.writeText(code)
    // Could add a toast notification here
  }

  const getConnectionIcon = (quality: string, isConnected: boolean) => {
    if (!isConnected) return <WifiOff className="h-4 w-4 text-red-500" />

    switch (quality) {
      case 'excellent': return <Wifi className="h-4 w-4 text-green-500" />
      case 'good': return <Wifi className="h-4 w-4 text-yellow-500" />
      case 'poor': return <Wifi className="h-4 w-4 text-orange-500" />
      default: return <WifiOff className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-orange-100 text-orange-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
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
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5" />
                Multiplayer Sessions
              </CardTitle>
              <CardDescription>
                Join friends for democratic group storytelling experiences
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowJoinDialog(true)} variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Join Session
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Session
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Sessions List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Gamepad2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Sessions</h3>
              <p className="text-muted-foreground text-center mb-4">
                Be the first to create a multiplayer session for democratic storytelling!
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id} className="cursor-pointer transition-all hover:shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(session.session_status)}>
                    {session.session_status}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-mono">{session.session_code}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        copySessionCode(session.session_code)
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg">{session.audiobook_title}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Vote className="h-4 w-4" />
                  {session.voting_enabled ? 'Democratic Voting' : 'Host Controlled'}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Players: {session.current_players}/{session.max_players}</span>
                    <span>Vote Timeout: {session.vote_timeout_seconds}s</span>
                  </div>
                  <Progress
                    value={(session.current_players / session.max_players) * 100}
                    className="h-2"
                  />

                  <div className="flex gap-2">
                    <Button
                      onClick={() => viewSessionDetails(session)}
                      className="flex-1"
                      size="sm"
                    >
                      View Details
                    </Button>
                    <Button
                      onClick={() => joinSessionWithCode(session.session_code)}
                      disabled={session.current_players >= session.max_players}
                      size="sm"
                      variant="outline"
                    >
                      {session.current_players >= session.max_players ? 'Full' : 'Join'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Session Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Multiplayer Session</DialogTitle>
            <DialogDescription>
              Start a new democratic storytelling session for you and your friends
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="audiobook">Select Audiobook</Label>
              <Select
                value={createForm.audiobook_id}
                onValueChange={(value) => setCreateForm(prev => ({ ...prev, audiobook_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an audiobook" />
                </SelectTrigger>
                <SelectContent>
                  {availableAudiobooks.map((book) => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max-players">Max Players</Label>
                <Select
                  value={createForm.max_players.toString()}
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, max_players: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Players</SelectItem>
                    <SelectItem value="3">3 Players</SelectItem>
                    <SelectItem value="4">4 Players</SelectItem>
                    <SelectItem value="6">6 Players</SelectItem>
                    <SelectItem value="8">8 Players</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="vote-timeout">Vote Timeout (seconds)</Label>
                <Select
                  value={createForm.vote_timeout_seconds.toString()}
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, vote_timeout_seconds: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="120">2 minutes</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="majority-threshold">Majority Threshold</Label>
              <Select
                value={createForm.majority_threshold.toString()}
                onValueChange={(value) => setCreateForm(prev => ({ ...prev, majority_threshold: parseFloat(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">Simple Majority (50%)</SelectItem>
                  <SelectItem value="0.6">60% Majority</SelectItem>
                  <SelectItem value="0.66">2/3 Majority</SelectItem>
                  <SelectItem value="0.75">75% Majority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={createSession} className="flex-1">
              Create Session
            </Button>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Session Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Multiplayer Session</DialogTitle>
            <DialogDescription>
              Enter the session code shared by the host
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="session-code">Session Code</Label>
              <Input
                id="session-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code"
                maxLength={6}
                className="font-mono text-center text-lg tracking-wider"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={joinSession} className="flex-1" disabled={joinCode.length !== 6}>
              Join Session
            </Button>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {selectedSession?.audiobook_title}
            </DialogTitle>
            <DialogDescription>
              Session Code: <span className="font-mono font-semibold">{selectedSession?.session_code}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{selectedSession?.current_players}</div>
                  <div className="text-sm text-muted-foreground">Current Players</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{selectedSession?.max_players}</div>
                  <div className="text-sm text-muted-foreground">Max Players</div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Participants</h4>
              <div className="space-y-2">
                {sessionParticipants.map((participant) => (
                  <div key={participant.participant_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {participant.character_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{participant.character_name}</span>
                        {participant.participant_role === 'host' && <Crown className="h-4 w-4 text-yellow-500" />}
                        <Badge variant="outline" className="text-xs">
                          {participant.participant_role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Vote Weight: {participant.vote_weight.toFixed(1)}x</span>
                        {participant.has_voted && <CheckCircle className="h-3 w-3 text-green-500" />}
                      </div>
                    </div>
                    {getConnectionIcon(participant.connection_quality, participant.is_connected)}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Voting:</span> {selectedSession?.voting_enabled ? 'Enabled' : 'Disabled'}
              </div>
              <div>
                <span className="font-medium">Timeout:</span> {selectedSession?.vote_timeout_seconds}s
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={() => joinSessionWithCode(selectedSession!.session_code)} className="flex-1">
              Join Session
            </Button>
            <Button variant="outline" onClick={() => setSelectedSession(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )

  function joinSessionWithCode(code: string) {
    setJoinCode(code)
    setShowJoinDialog(true)
    setSelectedSession(null)
  }
}