"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import {
  Package,
  Sword,
  Shield,
  Pill,
  Star,
  Crown,
  Gem,
  Sparkles,
  Zap,
  Heart,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  AlertCircle
} from "lucide-react"

interface InventoryItem {
  id: string
  item_id: string
  quantity: number
  acquired_at: string
  acquired_method: string
  is_equipped: boolean
  item: {
    id: string
    name: string
    description: string
    item_type: string
    rarity: string
    icon_url?: string
    is_consumable: boolean
    effects: ItemEffect[]
  }
}

interface ItemEffect {
  id: string
  stat_name: string
  effect_value: number
  effect_type: string
  duration_seconds?: number
}

interface InventoryManagerProps {
  userId: string
  selectedCharacter: any
}

export function InventoryManager({ userId, selectedCharacter }: InventoryManagerProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [showItemDialog, setShowItemDialog] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (selectedCharacter) {
      fetchInventory()
    }
  }, [selectedCharacter])

  const fetchInventory = async () => {
    if (!selectedCharacter) return

    try {
      const { data, error } = await supabase
        .from('character_inventory')
        .select(`
          *,
          item:items(
            id,
            name,
            description,
            item_type,
            rarity,
            icon_url,
            is_consumable,
            item_effects(*)
          )
        `)
        .eq('character_sheet_id', selectedCharacter.id)
        .order('acquired_at', { ascending: false })

      if (error) throw error

      const transformedInventory = (data || []).map(item => ({
        ...item,
        item: {
          ...item.item,
          effects: item.item.item_effects || []
        }
      }))

      setInventory(transformedInventory)
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const useItem = async (inventoryItem: InventoryItem) => {
    try {
      const { data, error } = await supabase.rpc('use_item', {
        p_inventory_id: inventoryItem.id,
        p_character_id: selectedCharacter.id
      })

      if (error) throw error

      if (data) {
        // Refresh inventory and emit event to update character stats
        await fetchInventory()
        window.dispatchEvent(new CustomEvent('inventoryChanged'))
        alert(`Used ${inventoryItem.item.name}!`)
      } else {
        alert('Failed to use item')
      }
    } catch (error) {
      console.error('Error using item:', error)
      alert('Error using item. Please try again.')
    }
  }

  const toggleEquip = async (inventoryItem: InventoryItem) => {
    try {
      const { data, error } = await supabase.rpc('toggle_equip_item', {
        p_inventory_id: inventoryItem.id,
        p_character_id: selectedCharacter.id
      })

      if (error) throw error

      if (data) {
        await fetchInventory()
        window.dispatchEvent(new CustomEvent('inventoryChanged'))
        const action = inventoryItem.is_equipped ? 'unequipped' : 'equipped'
        alert(`${action} ${inventoryItem.item.name}!`)
      } else {
        alert('Failed to toggle equipment')
      }
    } catch (error) {
      console.error('Error toggling equipment:', error)
      alert('Error toggling equipment. Please try again.')
    }
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'weapon': return <Sword className="h-5 w-5" />
      case 'armor': return <Shield className="h-5 w-5" />
      case 'consumable': return <Pill className="h-5 w-5" />
      case 'quest_item': return <Star className="h-5 w-5" />
      default: return <Package className="h-5 w-5" />
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
      case 'rare': return <Gem className="h-3 w-3" />
      case 'epic': return <Crown className="h-3 w-3" />
      case 'legendary': return <Sparkles className="h-3 w-3" />
      default: return null
    }
  }

  const getAcquisitionIcon = (method: string) => {
    switch (method) {
      case 'audio_cue': return <Play className="h-3 w-3" />
      case 'voice_command': return <Zap className="h-3 w-3" />
      case 'choice_reward': return <CheckCircle className="h-3 w-3" />
      default: return <Package className="h-3 w-3" />
    }
  }

  const getAcquisitionLabel = (method: string) => {
    switch (method) {
      case 'audio_cue': return 'Audio Cue'
      case 'voice_command': return 'Voice Command'
      case 'choice_reward': return 'Choice Reward'
      default: return 'Manual'
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

  if (!selectedCharacter) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Character Inventory
          </CardTitle>
          <CardDescription>Select a character to view their inventory</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Character Inventory
          </CardTitle>
          <CardDescription>
            Items collected during {selectedCharacter.name}'s audiobook adventures
          </CardDescription>
        </CardHeader>

        <CardContent>
          {inventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Items Yet</h3>
              <p className="text-sm">Items will appear here as you discover them during audiobook playback!</p>
              <p className="text-xs mt-2">Try saying "add health potion" or listening for audio cues.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inventory.map((inventoryItem) => (
                <Card
                  key={inventoryItem.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    inventoryItem.is_equipped ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedItem(inventoryItem)
                    setShowItemDialog(true)
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-muted rounded-lg">
                        {getItemIcon(inventoryItem.item.item_type)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{inventoryItem.item.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {inventoryItem.item.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className={`${getRarityColor(inventoryItem.item.rarity)} text-xs flex items-center gap-1`}>
                          {getRarityIcon(inventoryItem.item.rarity)}
                          {inventoryItem.item.rarity}
                        </Badge>
                        {inventoryItem.quantity > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            x{inventoryItem.quantity}
                          </Badge>
                        )}
                      </div>

                      {inventoryItem.is_equipped && (
                        <Badge className="bg-primary text-primary-foreground text-xs w-full justify-center">
                          Equipped
                        </Badge>
                      )}

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {getAcquisitionIcon(inventoryItem.acquired_method)}
                        <span>{getAcquisitionLabel(inventoryItem.acquired_method)}</span>
                      </div>

                      {inventoryItem.item.effects.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {inventoryItem.item.effects.slice(0, 2).map((effect) => (
                            <Badge key={effect.id} variant="outline" className="text-xs">
                              {effect.stat_name} {effect.effect_value > 0 ? '+' : ''}{effect.effect_value}
                            </Badge>
                          ))}
                          {inventoryItem.item.effects.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{inventoryItem.item.effects.length - 2} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item Detail Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem && getItemIcon(selectedItem.item.item_type)}
              {selectedItem?.item.name}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.item.description}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={`${getRarityColor(selectedItem.item.rarity)} flex items-center gap-1`}>
                  {getRarityIcon(selectedItem.item.rarity)}
                  {selectedItem.item.rarity}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {selectedItem.item.item_type.replace('_', ' ')}
                </Badge>
                {selectedItem.item.is_consumable && (
                  <Badge variant="secondary">Consumable</Badge>
                )}
              </div>

              {selectedItem.quantity > 1 && (
                <div className="flex items-center gap-2 text-sm">
                  <span>Quantity:</span>
                  <Badge variant="secondary">x{selectedItem.quantity}</Badge>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getAcquisitionIcon(selectedItem.acquired_method)}
                <span>Acquired via {getAcquisitionLabel(selectedItem.acquired_method).toLowerCase()}</span>
              </div>

              <div className="text-sm text-muted-foreground">
                Acquired: {new Date(selectedItem.acquired_at).toLocaleDateString()}
              </div>

              {selectedItem.item.effects.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Item Effects:</h4>
                  <div className="space-y-1">
                    {selectedItem.item.effects.map((effect) => (
                      <div key={effect.id} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{effect.stat_name.replace('_', ' ')}</span>
                        <Badge variant="outline" className="text-xs">
                          {effect.effect_value > 0 ? '+' : ''}{effect.effect_value}
                          {effect.effect_type === 'temporary' && effect.duration_seconds &&
                            ` (${effect.duration_seconds}s)`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {selectedItem.item.is_consumable ? (
                  <Button
                    onClick={() => useItem(selectedItem)}
                    className="flex-1"
                    disabled={selectedItem.quantity <= 0}
                  >
                    Use Item
                  </Button>
                ) : (
                  <Button
                    onClick={() => toggleEquip(selectedItem)}
                    className="flex-1"
                    variant={selectedItem.is_equipped ? "outline" : "default"}
                  >
                    {selectedItem.is_equipped ? 'Unequip' : 'Equip'}
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowItemDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}