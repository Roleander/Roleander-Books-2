"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Users,
  Radio,
  Radio as PushToTalkIcon,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  X,
  Volume1
} from 'lucide-react'
import { useVoiceChat } from './voice-chat-manager'

interface VoiceChatParticipant {
  participant_id: string
  user_id: string
  character_name: string
  is_muted: boolean
  is_speaking: boolean
  volume_level: number
  connection_quality: 'excellent' | 'good' | 'poor' | 'disconnected'
}

interface VoiceChatControlsProps {
  sessionId: string
  participantId: string
  isHost: boolean
  participants: VoiceChatParticipant[]
  isVotingActive?: boolean
  onVoiceChatToggle?: (active: boolean) => void
}

export function VoiceChatControls({
  sessionId,
  participantId,
  isHost,
  participants,
  isVotingActive = false,
  onVoiceChatToggle
}: VoiceChatControlsProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [volume, setVolume] = useState([0.8])
  const [isMuted, setIsMuted] = useState(false)
  const [voiceChatEnabled, setVoiceChatEnabled] = useState(false)
  const [pushToTalkMode, setPushToTalkMode] = useState(true)
  const [voiceActivationEnabled, setVoiceActivationEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    isInitialized,
    isActive,
    isPushToTalk,
    initialize,
    activateVoiceChat,
    deactivateVoiceChat,
    activateVoiceCommands
  } = useVoiceChat(sessionId, participantId, isHost)

  useEffect(() => {
    // Auto-initialize when component mounts
    if (!isInitialized && sessionId && participantId) {
      initialize().catch(err => {
        console.error('Failed to initialize voice chat:', err)
        setError('Failed to initialize voice chat. Check microphone permissions.')
      })
    }
  }, [sessionId, participantId, isInitialized, initialize])

  useEffect(() => {
    // Notify parent component of voice chat state changes
    onVoiceChatToggle?.(isActive)
  }, [isActive, onVoiceChatToggle])

  const handleVoiceChatToggle = async () => {
    if (!isInitialized) {
      const success = await initialize()
      if (!success) return
    }

    if (isActive) {
      deactivateVoiceChat()
      setVoiceChatEnabled(false)
    } else {
      activateVoiceChat()
      setVoiceChatEnabled(true)
    }
  }

  const handlePushToTalk = () => {
    if (pushToTalkMode) {
      if (isPushToTalk) {
        // Release push-to-talk
        activateVoiceCommands()
      } else {
        // Activate push-to-talk
        activateVoiceChat()
      }
    }
  }

  const handleMuteToggle = () => {
    setIsMuted(!isMuted)
    // Implementation would mute/unmute local audio stream
  }

  const getConnectionIcon = (quality: string) => {
    switch (quality) {
      case 'excellent': return <Wifi className="h-4 w-4 text-green-500" />
      case 'good': return <Wifi className="h-4 w-4 text-yellow-500" />
      case 'poor': return <Wifi className="h-4 w-4 text-orange-500" />
      default: return <WifiOff className="h-4 w-4 text-red-500" />
    }
  }

  const getVoiceIcon = () => {
    if (error) return <AlertTriangle className="h-5 w-5 text-red-500" />
    if (isMuted) return <MicOff className="h-5 w-5 text-red-500" />
    if (isActive && isPushToTalk) return <Mic className="h-5 w-5 text-green-500" />
    if (isActive) return <Volume1 className="h-5 w-5 text-blue-500" />
    return <Mic className="h-5 w-5 text-muted-foreground" />
  }

  const connectedParticipants = participants.filter(p => p.connection_quality !== 'disconnected')
  const speakingParticipants = participants.filter(p => p.is_speaking)

  return (
    <>
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getVoiceIcon()}
              <div>
                <CardTitle className="text-lg">Voice Chat</CardTitle>
                <CardDescription>
                  {isActive ? 'Connected' : 'Disconnected'} • {connectedParticipants.length} participants
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={handleVoiceChatToggle}
                disabled={!isInitialized && !error}
              >
                {isActive ? 'Leave' : 'Join'}
              </Button>
            </div>
          </div>
        </CardHeader>

        {isActive && (
          <CardContent className="space-y-4">
            {/* Push-to-Talk / Voice Activation Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="push-to-talk" className="text-sm">
                  {pushToTalkMode ? 'Push-to-Talk' : 'Voice Activation'}
                </Label>
                <Badge variant="outline" className="text-xs">
                  {isPushToTalk ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <Button
                variant={isPushToTalk ? "default" : "outline"}
                size="sm"
                onMouseDown={handlePushToTalk}
                onMouseUp={handlePushToTalk}
                onTouchStart={handlePushToTalk}
                onTouchEnd={handlePushToTalk}
                disabled={!pushToTalkMode}
                className={isPushToTalk ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <PushToTalkIcon className="h-4 w-4 mr-1" />
                {isPushToTalk ? 'Talking' : 'Hold to Talk'}
              </Button>
            </div>

            {/* Volume Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Volume</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMuteToggle}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
              <Slider
                value={volume}
                onValueChange={setVolume}
                max={1}
                step={0.1}
                className="w-full"
                disabled={isMuted}
              />
            </div>

            {/* Participants List */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Participants ({connectedParticipants.length})</Label>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {connectedParticipants.map((participant) => (
                    <div key={participant.participant_id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {participant.character_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{participant.character_name}</span>
                          {participant.is_speaking && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <span className="text-xs text-green-600">Speaking</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {getConnectionIcon(participant.connection_quality)}
                          <div className="flex-1">
                            <Progress
                              value={participant.volume_level * 100}
                              className="h-1"
                            />
                          </div>
                          {participant.is_muted && <MicOff className="h-3 w-3 text-red-500" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Status Messages */}
            {isVotingActive && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <Radio className="h-4 w-4" />
                  <span className="text-sm font-medium">Voting Round Active</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Voice chat optimized for discussion. Voice commands temporarily muted.
                </p>
              </div>
            )}

            {speakingParticipants.length > 1 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">Multiple speakers detected</span>
                </div>
                <p className="text-xs text-yellow-600 mt-1">
                  Consider taking turns or using push-to-talk mode.
                </p>
              </div>
            )}
          </CardContent>
        )}

        {error && (
          <CardContent className="pt-0">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Voice Chat Error</span>
              </div>
              <p className="text-xs text-red-600 mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null)
                  initialize()
                }}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Voice Chat Settings</DialogTitle>
            <DialogDescription>
              Configure voice chat behavior and audio preferences
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Input Mode */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Input Mode</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="push-to-talk-mode" className="text-sm">
                    Push-to-Talk Mode
                  </Label>
                  <Switch
                    id="push-to-talk-mode"
                    checked={pushToTalkMode}
                    onCheckedChange={setPushToTalkMode}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Hold button to speak. More reliable in noisy environments.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="voice-activation" className="text-sm">
                    Voice Activation
                  </Label>
                  <Switch
                    id="voice-activation"
                    checked={voiceActivationEnabled}
                    onCheckedChange={setVoiceActivationEnabled}
                    disabled={pushToTalkMode}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically detect when you start speaking. May pick up background noise.
                </p>
              </div>
            </div>

            {/* Audio Quality */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Audio Quality</Label>
              <div className="space-y-2">
                <Label htmlFor="voice-volume" className="text-sm">Voice Volume</Label>
                <Slider
                  id="voice-volume"
                  value={volume}
                  onValueChange={setVolume}
                  max={1}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>

            {/* Host Settings */}
            {isHost && (
              <div className="space-y-3">
                <Label className="text-base font-medium">Host Controls</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="force-mute-all" className="text-sm">
                      Allow Force Mute All
                    </Label>
                    <Switch id="force-mute-all" defaultChecked={false} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="voice-chat-required" className="text-sm">
                      Voice Chat Required
                    </Label>
                    <Switch id="voice-chat-required" defaultChecked={false} />
                  </div>
                </div>
              </div>
            )}

            {/* Device Info */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Device Status</Label>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Microphone: {isInitialized ? 'Available' : 'Not initialized'}</div>
                <div>WebRTC: {typeof RTCPeerConnection !== 'undefined' ? 'Supported' : 'Not supported'}</div>
                <div>Audio Context: {typeof AudioContext !== 'undefined' ? 'Available' : 'Not available'}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={() => setShowSettings(false)} className="flex-1">
              Save Settings
            </Button>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}