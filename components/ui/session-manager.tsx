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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Settings,
  Users,
  Crown,
  Play,
  Pause,
  Square,
  MessageCircle,
  Wifi,
  WifiOff,
  Vote,
  Clock,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Copy,
  Send,
  Mic,
  MicOff
} from 'lucide-react'

interface SessionParticipant {
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

interface SessionMessage {
  id: string
  participant_id: string
  character_name: string
  message_type: string
  message_text?: string
  emoji?: string
  created_at: string
}

interface SessionManagerProps {
  sessionId: string
  participantId: string
  isHost: boolean
  participants: SessionParticipant[]
  sessionStatus: string
  onKickPlayer?: (participantId: string) => void
  onEndSession?: () => void
  onPauseSession?: () => void
  onResumeSession?: () => void
  onUpdateSettings?: (settings: any) => void
}

export function SessionManager({
  sessionId,
  participantId,
  isHost,
  participants,
  sessionStatus,
  onKickPlayer,
  onEndSession,
  onPauseSession,
  onResumeSession,
  onUpdateSettings
}: SessionManagerProps) {
  const [messages, setMessages] = useState<SessionMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showKickDialog, setShowKickDialog] = useState<string | null>(null)
  const [settings, setSettings] = useState({
    vote_timeout_seconds: 60,
    majority_threshold: 0.5,
    allow_vote_changes: true,
    anonymous_voting: false,
    voice_chat_enabled: false
  })

  const supabase = createClient()

  useEffect(() => {
    fetchMessages()
    // Set up real-time subscription for messages
    const subscription = supabase
      .channel(`session_messages_${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_messages',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        const newMessage = payload.new as any
        // Get participant info
        const participant = participants.find(p => p.participant_id === newMessage.participant_id)
        if (participant) {
          setMessages(prev => [...prev, {
            ...newMessage,
            character_name: participant.character_name
          }])
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [sessionId, participants])

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('session_messages')
        .select(`
          *,
          participant:session_participants(character_name)
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const formattedMessages: SessionMessage[] = data?.map(msg => ({
        ...msg,
        character_name: msg.participant?.character_name || 'Unknown'
      })) || []

      setMessages(formattedMessages.reverse())
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      await supabase
        .from('session_messages')
        .insert({
          session_id: sessionId,
          participant_id: participantId,
          message_type: 'chat',
          message_text: newMessage.trim()
        })

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const kickPlayer = async (participantId: string) => {
    if (!isHost) return

    try {
      // Remove participant from session
      await supabase
        .from('session_participants')
        .update({ is_connected: false })
        .eq('id', participantId)

      // Update session player count
      const { data: session } = await supabase
        .from('multiplayer_sessions')
        .select('current_players')
        .eq('id', sessionId)
        .single()

      if (session) {
        await supabase
          .from('multiplayer_sessions')
          .update({ current_players: session.current_players - 1 })
          .eq('id', sessionId)
      }

      onKickPlayer?.(participantId)
      setShowKickDialog(null)
    } catch (error) {
      console.error('Error kicking player:', error)
    }
  }

  const updateSessionSettings = async () => {
    try {
      await supabase
        .from('multiplayer_sessions')
        .update({
          vote_timeout_seconds: settings.vote_timeout_seconds,
          majority_threshold: settings.majority_threshold,
          allow_vote_changes: settings.allow_vote_changes,
          anonymous_voting: settings.anonymous_voting,
          voice_chat_enabled: settings.voice_chat_enabled
        })
        .eq('id', sessionId)

      onUpdateSettings?.(settings)
      setShowSettings(false)
    } catch (error) {
      console.error('Error updating settings:', error)
    }
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

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'reaction': return <MessageCircle className="h-4 w-4" />
      case 'system': return <Settings className="h-4 w-4" />
      case 'vote': return <Vote className="h-4 w-4" />
      default: return <MessageCircle className="h-4 w-4" />
    }
  }

  const connectedParticipants = participants.filter(p => p.is_connected)
  const votingParticipants = participants.filter(p => p.has_voted)

  return (
    <div className="space-y-6">
      {/* Session Controls (Host Only) */}
      {isHost && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Session Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={sessionStatus === 'active' ? onPauseSession : onResumeSession}
                variant="outline"
              >
                {sessionStatus === 'active' ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Session
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume Session
                  </>
                )}
              </Button>

              <Button onClick={() => setShowSettings(true)} variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>

              <Button onClick={onEndSession} variant="destructive">
                <Square className="h-4 w-4 mr-2" />
                End Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{connectedParticipants.length}</div>
            <div className="text-sm text-muted-foreground">Connected</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{votingParticipants.length}</div>
            <div className="text-sm text-muted-foreground">Voted</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {connectedParticipants.length > 0
                ? Math.round((votingParticipants.length / connectedParticipants.length) * 100)
                : 0}%
            </div>
            <div className="text-sm text-muted-foreground">Participation</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Badge className={`${
              sessionStatus === 'active' ? 'bg-green-100 text-green-800' :
              sessionStatus === 'paused' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {sessionStatus}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Participants Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants ({participants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.participant_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {participant.character_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{participant.character_name}</span>
                      {participant.participant_role === 'host' && <Crown className="h-4 w-4 text-yellow-500" />}
                      <Badge variant="outline" className="text-xs capitalize">
                        {participant.participant_role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Vote Weight: {participant.vote_weight.toFixed(1)}x</span>
                      {participant.has_voted && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Voted
                        </span>
                      )}
                      {participant.last_vote_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(participant.last_vote_at).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getConnectionIcon(participant.connection_quality, participant.is_connected)}
                    {isHost && participant.participant_role !== 'host' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowKickDialog(participant.participant_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat/Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Session Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 mb-4">
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="flex items-start gap-3">
                  <Avatar className="h-6 w-6 mt-1">
                    <AvatarFallback className="text-xs">
                      {message.character_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{message.character_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    {message.message_type === 'reaction' ? (
                      <div className="text-2xl">{message.emoji}</div>
                    ) : (
                      <p className="text-sm">{message.message_text}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button onClick={sendMessage} size="sm">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Settings</DialogTitle>
            <DialogDescription>
              Configure voting and session preferences
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vote-timeout">Vote Timeout (seconds)</Label>
                <Select
                  value={settings.vote_timeout_seconds.toString()}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, vote_timeout_seconds: parseInt(value) }))}
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

              <div>
                <Label htmlFor="majority-threshold">Majority Threshold</Label>
                <Select
                  value={settings.majority_threshold.toString()}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, majority_threshold: parseFloat(value) }))}
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="allow-changes">Allow Vote Changes</Label>
                <Button
                  variant={settings.allow_vote_changes ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, allow_vote_changes: !prev.allow_vote_changes }))}
                >
                  {settings.allow_vote_changes ? "Yes" : "No"}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="anonymous-voting">Anonymous Voting</Label>
                <Button
                  variant={settings.anonymous_voting ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, anonymous_voting: !prev.anonymous_voting }))}
                >
                  {settings.anonymous_voting ? "Yes" : "No"}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="voice-chat">Voice Chat</Label>
                <Button
                  variant={settings.voice_chat_enabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSettings(prev => ({ ...prev, voice_chat_enabled: !prev.voice_chat_enabled }))}
                >
                  {settings.voice_chat_enabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={updateSessionSettings} className="flex-1">
              Save Settings
            </Button>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kick Player Dialog */}
      <Dialog open={!!showKickDialog} onOpenChange={() => setShowKickDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Kick Player
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this player from the session?
              They will be disconnected and unable to rejoin.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={() => kickPlayer(showKickDialog!)} variant="destructive">
              Kick Player
            </Button>
            <Button variant="outline" onClick={() => setShowKickDialog(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}