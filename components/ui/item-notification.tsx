"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Package,
  Sword,
  Shield,
  Pill,
  Star,
  Crown,
  Gem,
  Sparkles,
  X,
  CheckCircle
} from "lucide-react"

interface ItemNotificationProps {
  item: {
    name: string
    description: string
    item_type: string
    rarity: string
    effects?: Array<{
      stat_name: string
      effect_value: number
    }>
  }
  acquisitionMethod: string
  onClose: () => void
  autoClose?: boolean
  duration?: number
}

export function ItemNotification({
  item,
  acquisitionMethod,
  onClose,
  autoClose = true,
  duration = 5000
}: ItemNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [animationClass, setAnimationClass] = useState('animate-in slide-in-from-right-5 fade-in duration-500')

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [autoClose, duration])

  const handleClose = () => {
    setAnimationClass('animate-out slide-out-to-right-5 fade-out duration-300')
    setTimeout(() => {
      setIsVisible(false)
      onClose()
    }, 300)
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'weapon': return <Sword className="h-8 w-8" />
      case 'armor': return <Shield className="h-8 w-8" />
      case 'consumable': return <Pill className="h-8 w-8" />
      case 'quest_item': return <Star className="h-8 w-8" />
      default: return <Package className="h-8 w-8" />
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'uncommon': return 'bg-green-100 text-green-800 border-green-200'
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'legendary': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'rare': return <Gem className="h-4 w-4" />
      case 'epic': return <Crown className="h-4 w-4" />
      case 'legendary': return <Sparkles className="h-4 w-4" />
      default: return null
    }
  }

  const getAcquisitionIcon = (method: string) => {
    switch (method) {
      case 'audio_cue': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'voice_command': return <Sparkles className="h-5 w-5 text-blue-600" />
      default: return <Package className="h-5 w-5 text-purple-600" />
    }
  }

  const getAcquisitionMessage = (method: string) => {
    switch (method) {
      case 'audio_cue': return 'Discovered during adventure!'
      case 'voice_command': return 'Summoned by your voice!'
      default: return 'Added to your inventory!'
    }
  }

  if (!isVisible) return null

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm ${animationClass}`}>
      <Card className="border-2 shadow-lg bg-gradient-to-br from-background to-accent/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="p-2 bg-primary/10 rounded-lg">
                {getItemIcon(item.item_type)}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getAcquisitionIcon(acquisitionMethod)}
                  <span className="text-sm font-medium text-green-600">
                    Item Acquired!
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-6 w-6 p-0 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <h3 className="font-bold text-lg mb-1">{item.name}</h3>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {item.description}
              </p>

              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${getRarityColor(item.rarity)} flex items-center gap-1`}>
                  {getRarityIcon(item.rarity)}
                  {item.rarity}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {item.item_type.replace('_', ' ')}
                </Badge>
              </div>

              {item.effects && item.effects.length > 0 && (
                <div className="mb-2">
                  <div className="flex flex-wrap gap-1">
                    {item.effects.slice(0, 3).map((effect, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {effect.stat_name} {effect.effect_value > 0 ? '+' : ''}{effect.effect_value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground italic">
                {getAcquisitionMessage(acquisitionMethod)}
              </p>
            </div>
          </div>

          {/* Progress bar for auto-close */}
          {autoClose && (
            <div className="mt-3">
              <div className="w-full bg-muted rounded-full h-1">
                <div
                  className="bg-primary h-1 rounded-full transition-all duration-100 ease-linear"
                  style={{
                    width: `${((duration - 100) / duration) * 100}%`,
                    animation: `shrink ${duration}ms linear forwards`
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

// Notification Manager Component
interface NotificationManagerProps {
  children: React.ReactNode
}

export function NotificationManager({ children }: NotificationManagerProps) {
  const [notifications, setNotifications] = useState<Array<{
    id: string
    item: any
    acquisitionMethod: string
  }>>([])

  useEffect(() => {
    const handleItemAcquired = (event: CustomEvent) => {
      const { item, acquisitionMethod } = event.detail
      const notificationId = `notification-${Date.now()}-${Math.random()}`

      setNotifications(prev => [...prev, {
        id: notificationId,
        item,
        acquisitionMethod
      }])

      // Auto-remove after animation
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
      }, 5500) // Slightly longer than animation duration
    }

    window.addEventListener('itemAcquired', handleItemAcquired as EventListener)
    return () => window.removeEventListener('itemAcquired', handleItemAcquired as EventListener)
  }, [])

  return (
    <>
      {children}
      {notifications.map((notification) => (
        <ItemNotification
          key={notification.id}
          item={notification.item}
          acquisitionMethod={notification.acquisitionMethod}
          onClose={() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id))
          }}
        />
      ))}
    </>
  )
}