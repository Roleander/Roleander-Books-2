"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface VoiceChatParticipant {
  participant_id: string
  user_id: string
  character_name: string
  is_muted: boolean
  is_speaking: boolean
  volume_level: number
  connection_quality: 'excellent' | 'good' | 'poor' | 'disconnected'
}

interface VoiceChatManagerProps {
  sessionId: string
  participantId: string
  isHost: boolean
  participants: VoiceChatParticipant[]
  onVoiceActivity?: (participantId: string, isSpeaking: boolean) => void
  onConnectionChange?: (participantId: string, quality: string) => void
}

interface AudioStreamManager {
  voiceChat: MediaStream | null
  voiceCommands: MediaStream | null
  audiobook: MediaStream | null
  microphone: MediaStream | null
}

export class VoiceChatManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map()
  private localStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private streamManager: AudioStreamManager = {
    voiceChat: null,
    voiceCommands: null,
    audiobook: null,
    microphone: null
  }
  private isInitialized = false
  private isVoiceChatActive = false
  private isPushToTalkActive = false
  private voiceActivityDetector: VoiceActivityDetector | null = null

  constructor(
    private sessionId: string,
    private participantId: string,
    private supabase = createClient()
  ) {}

  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) return true

      // Initialize Web Audio API
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Get microphone access with optimized settings
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      })

      // Create separate audio streams
      await this.createAudioStreams()

      // Initialize voice activity detection
      this.voiceActivityDetector = new VoiceActivityDetector(this.audioContext)

      this.isInitialized = true
      return true
    } catch (error) {
      console.error('Failed to initialize voice chat:', error)
      return false
    }
  }

  private async createAudioStreams(): Promise<void> {
    if (!this.localStream || !this.audioContext) return

    // Create voice chat stream (processed for communication)
    this.streamManager.voiceChat = await this.createVoiceChatStream(this.localStream)

    // Create voice commands stream (optimized for recognition)
    this.streamManager.voiceCommands = await this.createVoiceCommandStream(this.localStream)

    // Store raw microphone stream
    this.streamManager.microphone = this.localStream
  }

  private async createVoiceChatStream(input: MediaStream): Promise<MediaStream> {
    if (!this.audioContext) throw new Error('Audio context not initialized')

    const source = this.audioContext.createMediaStreamSource(input)
    const destination = this.audioContext.createMediaStreamDestination()

    // Voice chat processing chain
    const gainNode = this.audioContext.createGain()
    gainNode.gain.value = 1.0

    const compressor = this.audioContext.createDynamicsCompressor()
    compressor.threshold.value = -24
    compressor.knee.value = 30
    compressor.ratio.value = 12
    compressor.attack.value = 0.003
    compressor.release.value = 0.25

    const highPassFilter = this.audioContext.createBiquadFilter()
    highPassFilter.type = 'highpass'
    highPassFilter.frequency.value = 80

    const lowPassFilter = this.audioContext.createBiquadFilter()
    lowPassFilter.type = 'lowpass'
    lowPassFilter.frequency.value = 8000

    // Connect processing chain
    source.connect(highPassFilter)
    highPassFilter.connect(lowPassFilter)
    lowPassFilter.connect(compressor)
    compressor.connect(gainNode)
    gainNode.connect(destination)

    return destination.stream
  }

  private async createVoiceCommandStream(input: MediaStream): Promise<MediaStream> {
    if (!this.audioContext) throw new Error('Audio context not initialized')

    const source = this.audioContext.createMediaStreamSource(input)
    const destination = this.audioContext.createMediaStreamDestination()

    // Voice command processing (optimized for speech recognition)
    const gainNode = this.audioContext.createGain()
    gainNode.gain.value = 2.0 // Boost for better recognition

    const noiseGate = this.audioContext.createDynamicsCompressor()
    noiseGate.threshold.value = -36
    noiseGate.knee.value = 6
    noiseGate.ratio.value = 20
    noiseGate.attack.value = 0.001
    noiseGate.release.value = 0.1

    // Frequency optimization for speech recognition (300-3000Hz)
    const bandPassFilter = this.audioContext.createBiquadFilter()
    bandPassFilter.type = 'bandpass'
    bandPassFilter.frequency.value = 1500
    bandPassFilter.Q.value = 1

    // Connect processing chain
    source.connect(bandPassFilter)
    bandPassFilter.connect(noiseGate)
    noiseGate.connect(gainNode)
    gainNode.connect(destination)

    return destination.stream
  }

  async connectToParticipant(participantId: string): Promise<boolean> {
    try {
      if (!this.streamManager.voiceChat) return false

      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      })

      // Add local voice chat stream
      this.streamManager.voiceChat.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.streamManager.voiceChat!)
      })

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0]
        this.handleRemoteStream(participantId, remoteStream)
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignalingMessage(participantId, 'ice-candidate', event.candidate)
        }
      }

      this.peerConnections.set(participantId, peerConnection)

      // Create and send offer
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      this.sendSignalingMessage(participantId, 'offer', offer)

      return true
    } catch (error) {
      console.error('Failed to connect to participant:', error)
      return false
    }
  }

  private handleRemoteStream(participantId: string, stream: MediaStream) {
    // Handle incoming voice chat stream
    console.log('Received remote stream from:', participantId)

    // Create audio element for playback
    const audioElement = new Audio()
    audioElement.srcObject = stream
    audioElement.autoplay = true
    audioElement.volume = 0.8

    // Store reference for cleanup
    this.remoteAudioElements.set(participantId, audioElement)
  }

  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map()

  private async sendSignalingMessage(participantId: string, type: string, data: any) {
    try {
      await this.supabase
        .from('session_messages')
        .insert({
          session_id: this.sessionId,
          participant_id: this.participantId,
          message_type: 'webrtc_signaling',
          message_text: JSON.stringify({
            target_participant_id: participantId,
            signaling_type: type,
            signaling_data: data
          })
        })
    } catch (error) {
      console.error('Failed to send signaling message:', error)
    }
  }

  async handleSignalingMessage(message: any) {
    const { target_participant_id, signaling_type, signaling_data } = message

    if (target_participant_id !== this.participantId) return

    const peerConnection = this.peerConnections.get(message.participant_id)
    if (!peerConnection) return

    try {
      switch (signaling_type) {
        case 'offer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signaling_data))
          const answer = await peerConnection.createAnswer()
          await peerConnection.setLocalDescription(answer)
          this.sendSignalingMessage(message.participant_id, 'answer', answer)
          break

        case 'answer':
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signaling_data))
          break

        case 'ice-candidate':
          await peerConnection.addIceCandidate(new RTCIceCandidate(signaling_data))
          break
      }
    } catch (error) {
      console.error('Failed to handle signaling message:', error)
    }
  }

  // Audio routing controls
  activateVoiceChat() {
    this.isVoiceChatActive = true
    this.isPushToTalkActive = true
    // Mute voice command stream, activate voice chat
    this.updateAudioRouting()
  }

  deactivateVoiceChat() {
    this.isVoiceChatActive = false
    this.isPushToTalkActive = false
    this.updateAudioRouting()
  }

  activateVoiceCommands() {
    // Temporarily mute voice chat for command recognition
    this.isPushToTalkActive = false
    this.updateAudioRouting()
    // Auto-reactivate voice chat after command timeout
    setTimeout(() => {
      if (this.isVoiceChatActive) {
        this.isPushToTalkActive = true
        this.updateAudioRouting()
      }
    }, 10000) // 10 second command window
  }

  private updateAudioRouting() {
    // Update gain nodes based on current mode
    const voiceChatGain = this.isVoiceChatActive && this.isPushToTalkActive ? 1.0 : 0.0
    const voiceCommandGain = !this.isPushToTalkActive ? 1.0 : 0.0

    // Apply gains to respective streams
    this.setStreamGain('voiceChat', voiceChatGain)
    this.setStreamGain('voiceCommands', voiceCommandGain)
  }

  private setStreamGain(streamType: keyof AudioStreamManager, gain: number) {
    // Implementation would adjust gain nodes in the audio processing chain
    console.log(`Setting ${streamType} gain to ${gain}`)
  }

  getVoiceChatStream(): MediaStream | null {
    return this.streamManager.voiceChat
  }

  getVoiceCommandStream(): MediaStream | null {
    return this.streamManager.voiceCommands
  }

  isActive(): boolean {
    return this.isVoiceChatActive
  }

  isPushToTalk(): boolean {
    return this.isPushToTalkActive
  }

  async cleanup() {
    // Close all peer connections
    this.peerConnections.forEach(pc => pc.close())
    this.peerConnections.clear()

    // Stop all audio tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
    }

    // Clean up remote audio elements
    this.remoteAudioElements.forEach(audio => {
      audio.pause()
      audio.srcObject = null
    })
    this.remoteAudioElements.clear()

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close()
    }

    this.isInitialized = false
    this.isVoiceChatActive = false
    this.isPushToTalkActive = false
  }
}

class VoiceActivityDetector {
  private analyser: AnalyserNode
  private dataArray: Uint8Array
  private isSpeaking = false
  private speakingThreshold = 15 // Adjust based on testing
  private silenceThreshold = 10
  private speakingFrames = 0
  private silenceFrames = 0
  private readonly SPEAKING_FRAMES_THRESHOLD = 3
  private readonly SILENCE_FRAMES_THRESHOLD = 10

  constructor(audioContext: AudioContext) {
    this.analyser = audioContext.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.3
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount)
  }

  connect(source: MediaStreamAudioSourceNode) {
    source.connect(this.analyser)
  }

  getVolumeLevel(): number {
    this.analyser.getByteFrequencyData(this.dataArray as any)

    // Calculate RMS volume
    let sum = 0
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i] * this.dataArray[i]
    }
    const rms = Math.sqrt(sum / this.dataArray.length)
    return rms
  }

  detectVoiceActivity(): boolean {
    const volume = this.getVolumeLevel()

    if (volume > this.speakingThreshold) {
      this.speakingFrames++
      this.silenceFrames = 0

      if (this.speakingFrames >= this.SPEAKING_FRAMES_THRESHOLD && !this.isSpeaking) {
        this.isSpeaking = true
        return true // Started speaking
      }
    } else {
      this.silenceFrames++
      this.speakingFrames = 0

      if (this.silenceFrames >= this.SILENCE_FRAMES_THRESHOLD && this.isSpeaking) {
        this.isSpeaking = false
        return false // Stopped speaking
      }
    }

    return this.isSpeaking // No change
  }

  isCurrentlySpeaking(): boolean {
    return this.isSpeaking
  }
}

// React Hook for using VoiceChatManager
export function useVoiceChat(sessionId: string, participantId: string, isHost: boolean) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [isPushToTalk, setIsPushToTalk] = useState(false)
  const [participants, setParticipants] = useState<VoiceChatParticipant[]>([])
  const [error, setError] = useState<string | null>(null)

  const voiceChatManagerRef = useRef<VoiceChatManager | null>(null)

  useEffect(() => {
    if (!sessionId || !participantId) return

    const manager = new VoiceChatManager(sessionId, participantId)
    voiceChatManagerRef.current = manager

    return () => {
      manager.cleanup()
    }
  }, [sessionId, participantId])

  const initialize = useCallback(async () => {
    if (!voiceChatManagerRef.current) return false

    try {
      const success = await voiceChatManagerRef.current.initialize()
      setIsInitialized(success)
      if (!success) {
        setError('Failed to initialize voice chat')
      }
      return success
    } catch (err) {
      setError('Voice chat initialization failed')
      return false
    }
  }, [])

  const activateVoiceChat = useCallback(() => {
    if (!voiceChatManagerRef.current) return
    voiceChatManagerRef.current.activateVoiceChat()
    setIsActive(true)
    setIsPushToTalk(true)
  }, [])

  const deactivateVoiceChat = useCallback(() => {
    if (!voiceChatManagerRef.current) return
    voiceChatManagerRef.current.deactivateVoiceChat()
    setIsActive(false)
    setIsPushToTalk(false)
  }, [])

  const activateVoiceCommands = useCallback(() => {
    if (!voiceChatManagerRef.current) return
    voiceChatManagerRef.current.activateVoiceCommands()
    setIsPushToTalk(false)
    // Auto-reactivate after timeout
    setTimeout(() => setIsPushToTalk(true), 10000)
  }, [])

  return {
    isInitialized,
    isActive,
    isPushToTalk,
    participants,
    error,
    initialize,
    activateVoiceChat,
    deactivateVoiceChat,
    activateVoiceCommands,
    getVoiceChatStream: () => voiceChatManagerRef.current?.getVoiceChatStream(),
    getVoiceCommandStream: () => voiceChatManagerRef.current?.getVoiceCommandStream()
  }
}