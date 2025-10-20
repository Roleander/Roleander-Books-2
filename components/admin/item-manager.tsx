"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import {
  Plus,
  Edit,
  Trash2,
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
  Minus,
  Plus as PlusIcon
} from "lucide-react"

interface Item {
  id: string
  name: string
  description: string
  item_type: string
  rarity: string
  icon_url?: string
  max_quantity: number
  is_consumable: boolean
  effects: ItemEffect[]
}

interface ItemEffect {
  id: string
  stat_name: string
  effect_value: number
  effect_type: string
  duration_seconds?: number
}

export function ItemManager() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    item_type: "misc",
    rarity: "common",
    icon_url: "",
    max_quantity: 1,
    is_consumable: false,
    effects: [] as ItemEffect[]
  })

  const supabase = createClient()

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          item_effects (*)
        `)
        .order('name')

      if (error) throw error

      const transformedItems = (data || []).map(item => ({
        ...item,
        effects: item.item_effects || []
      }))

      setItems(transformedItems)
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      item_type: "misc",
      rarity: "common",
      icon_url: "",
      max_quantity: 1,
      is_consumable: false,
      effects: []
    })
    setEditingItem(null)
    setShowDialog(false)
  }

  const handleEdit = (item: Item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description,
      item_type: item.item_type,
      rarity: item.rarity,
      icon_url: item.icon_url || "",
      max_quantity: item.max_quantity,
      is_consumable: item.is_consumable,
      effects: item.effects
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    try {
      if (editingItem) {
        // Update existing item
        const { error: itemError } = await supabase
          .from('items')
          .update({
            name: formData.name,
            description: formData.description,
            item_type: formData.item_type,
            rarity: formData.rarity,
            icon_url: formData.icon_url || null,
            max_quantity: formData.max_quantity,
            is_consumable: formData.is_consumable
          })
          .eq('id', editingItem.id)

        if (itemError) throw itemError

        // Update effects
        await supabase.from('item_effects').delete().eq('item_id', editingItem.id)

        if (formData.effects.length > 0) {
          const effectsToInsert = formData.effects.map(effect => ({
            item_id: editingItem.id,
            stat_name: effect.stat_name,
            effect_value: effect.effect_value,
            effect_type: effect.effect_type,
            duration_seconds: effect.duration_seconds || null
          }))

          const { error: effectsError } = await supabase
            .from('item_effects')
            .insert(effectsToInsert)

          if (effectsError) throw effectsError
        }
      } else {
        // Create new item
        const { data: newItem, error: itemError } = await supabase
          .from('items')
          .insert([{
            name: formData.name,
            description: formData.description,
            item_type: formData.item_type,
            rarity: formData.rarity,
            icon_url: formData.icon_url || null,
            max_quantity: formData.max_quantity,
            is_consumable: formData.is_consumable
          }])
          .select()
          .single()

        if (itemError) throw itemError

        // Add effects
        if (formData.effects.length > 0) {
          const effectsToInsert = formData.effects.map(effect => ({
            item_id: newItem.id,
            stat_name: effect.stat_name,
            effect_value: effect.effect_value,
            effect_type: effect.effect_type,
            duration_seconds: effect.duration_seconds || null
          }))

          const { error: effectsError } = await supabase
            .from('item_effects')
            .insert(effectsToInsert)

          if (effectsError) throw effectsError
        }
      }

      await fetchItems()
      resetForm()
    } catch (error) {
      console.error('Error saving item:', error)
      alert('Error saving item. Please try again.')
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item? This will remove it from all character inventories.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      await fetchItems()
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Error deleting item. Please try again.')
    }
  }

  const addEffect = () => {
    const newEffect: ItemEffect = {
      id: `effect-${Date.now()}`,
      stat_name: "strength",
      effect_value: 1,
      effect_type: "permanent"
    }
    setFormData({
      ...formData,
      effects: [...formData.effects, newEffect]
    })
  }

  const updateEffect = (index: number, field: keyof ItemEffect, value: any) => {
    const updatedEffects = [...formData.effects]
    updatedEffects[index] = { ...updatedEffects[index], [field]: value }
    setFormData({ ...formData, effects: updatedEffects })
  }

  const removeEffect = (index: number) => {
    const updatedEffects = formData.effects.filter((_, i) => i !== index)
    setFormData({ ...formData, effects: updatedEffects })
  }

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'weapon': return <Sword className="h-4 w-4" />
      case 'armor': return <Shield className="h-4 w-4" />
      case 'consumable': return <Pill className="h-4 w-4" />
      case 'quest_item': return <Star className="h-4 w-4" />
      default: return <Package className="h-4 w-4" />
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800'
      case 'uncommon': return 'bg-green-100 text-green-800'
      case 'rare': return 'bg-blue-100 text-blue-800'
      case 'epic': return 'bg-purple-100 text-purple-800'
      case 'legendary': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Item Management
              </CardTitle>
              <CardDescription>Manage items available in your RPG audiobook world</CardDescription>
            </div>
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setShowDialog(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
                  <DialogDescription>
                    Configure item properties and stat effects
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Item Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter item name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="item_type">Item Type</Label>
                      <Select value={formData.item_type} onValueChange={(value) => setFormData({ ...formData, item_type: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weapon">Weapon</SelectItem>
                          <SelectItem value="armor">Armor</SelectItem>
                          <SelectItem value="consumable">Consumable</SelectItem>
                          <SelectItem value="accessory">Accessory</SelectItem>
                          <SelectItem value="quest_item">Quest Item</SelectItem>
                          <SelectItem value="misc">Miscellaneous</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the item"
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="rarity">Rarity</Label>
                      <Select value={formData.rarity} onValueChange={(value) => setFormData({ ...formData, rarity: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rarity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="common">Common</SelectItem>
                          <SelectItem value="uncommon">Uncommon</SelectItem>
                          <SelectItem value="rare">Rare</SelectItem>
                          <SelectItem value="epic">Epic</SelectItem>
                          <SelectItem value="legendary">Legendary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_quantity">Max Quantity</Label>
                      <Input
                        id="max_quantity"
                        type="number"
                        value={formData.max_quantity}
                        onChange={(e) => setFormData({ ...formData, max_quantity: parseInt(e.target.value) || 1 })}
                        min="1"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-8">
                      <input
                        type="checkbox"
                        id="is_consumable"
                        checked={formData.is_consumable}
                        onChange={(e) => setFormData({ ...formData, is_consumable: e.target.checked })}
                      />
                      <Label htmlFor="is_consumable">Consumable</Label>
                    </div>
                  </div>

                  {/* Item Effects */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Item Effects</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addEffect}>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Effect
                      </Button>
                    </div>

                    {formData.effects.map((effect, index) => (
                      <Card key={effect.id} className="p-4">
                        <div className="grid gap-4 md:grid-cols-5 items-end">
                          <div className="space-y-2">
                            <Label>Stat</Label>
                            <Select
                              value={effect.stat_name}
                              onValueChange={(value) => updateEffect(index, 'stat_name', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="strength">Strength</SelectItem>
                                <SelectItem value="dexterity">Dexterity</SelectItem>
                                <SelectItem value="constitution">Constitution</SelectItem>
                                <SelectItem value="intelligence">Intelligence</SelectItem>
                                <SelectItem value="wisdom">Wisdom</SelectItem>
                                <SelectItem value="charisma">Charisma</SelectItem>
                                <SelectItem value="health">Health</SelectItem>
                                <SelectItem value="mana">Mana</SelectItem>
                                <SelectItem value="attack">Attack</SelectItem>
                                <SelectItem value="defense">Defense</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Value</Label>
                            <Input
                              type="number"
                              value={effect.effect_value}
                              onChange={(e) => updateEffect(index, 'effect_value', parseInt(e.target.value) || 0)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                              value={effect.effect_type}
                              onValueChange={(value) => updateEffect(index, 'effect_type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="permanent">Permanent</SelectItem>
                                <SelectItem value="temporary">Temporary</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {effect.effect_type === 'temporary' && (
                            <div className="space-y-2">
                              <Label>Duration (sec)</Label>
                              <Input
                                type="number"
                                value={effect.duration_seconds || ''}
                                onChange={(e) => updateEffect(index, 'duration_seconds', parseInt(e.target.value) || null)}
                                placeholder="Seconds"
                              />
                            </div>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeEffect(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} className="flex-1">
                      {editingItem ? 'Update Item' : 'Create Item'}
                    </Button>
                    <Button variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Items Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first item to start building your RPG world!</p>
              <Button onClick={() => { resetForm(); setShowDialog(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Item
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rarity</TableHead>
                  <TableHead>Effects</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getItemIcon(item.item_type)}
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.item_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getRarityColor(item.rarity)} flex items-center gap-1 w-fit`}>
                        {getRarityIcon(item.rarity)}
                        {item.rarity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.effects.map((effect) => (
                          <Badge key={effect.id} variant="secondary" className="text-xs">
                            {effect.stat_name} {effect.effect_value > 0 ? '+' : ''}{effect.effect_value}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)} className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}