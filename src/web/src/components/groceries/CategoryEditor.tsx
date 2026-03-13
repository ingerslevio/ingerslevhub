import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { GroceryCategory } from '@/types'

interface CategoryEditorProps {
  open: boolean
  onClose: () => void
}

export function CategoryEditor({ open, onClose }: CategoryEditorProps) {
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')

  const { data: categories = [] } = useQuery<GroceryCategory[]>({
    queryKey: ['groceryCategories'],
    queryFn: () => api.groceries.listCategories(),
    enabled: open,
  })

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<{ name: string; sortOrder: number; color: string }> }) =>
      api.groceries.updateCategory(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groceryCategories'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.groceries.deleteCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groceryCategories'] }),
  })

  const createMutation = useMutation({
    mutationFn: () => api.groceries.createCategory({ name: newName, color: newColor, sortOrder: sorted.length }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceryCategories'] })
      setNewName('')
    },
  })

  const handleNameBlur = (cat: GroceryCategory, value: string) => {
    if (value !== cat.name && value.trim()) {
      updateMutation.mutate({ id: cat.id, input: { name: value.trim() } })
    }
  }

  const handleColorChange = (cat: GroceryCategory, color: string) => {
    updateMutation.mutate({ id: cat.id, input: { color } })
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const a = sorted[index]
    const b = sorted[index - 1]
    updateMutation.mutate({ id: a.id, input: { sortOrder: b.sortOrder } })
    updateMutation.mutate({ id: b.id, input: { sortOrder: a.sortOrder } })
  }

  const handleMoveDown = (index: number) => {
    if (index === sorted.length - 1) return
    const a = sorted[index]
    const b = sorted[index + 1]
    updateMutation.mutate({ id: a.id, input: { sortOrder: b.sortOrder } })
    updateMutation.mutate({ id: b.id, input: { sortOrder: a.sortOrder } })
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rediger Kategorier</DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          {sorted.map((cat, index) => (
            <CategoryRow
              key={cat.id}
              cat={cat}
              index={index}
              total={sorted.length}
              onNameBlur={handleNameBlur}
              onColorChange={handleColorChange}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onDelete={handleDelete}
            />
          ))}
        </div>

        <div className="border-t pt-4 mt-2 space-y-2">
          <p className="text-sm font-medium">Tilføj kategori</p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="h-8 w-10 rounded border cursor-pointer shrink-0"
              title="Vælg farve"
            />
            <Input
              className="h-8 text-sm flex-1"
              placeholder="Kategorinavn..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) createMutation.mutate() }}
            />
            <Button
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={!newName.trim() || createMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Gem
            </Button>
          </div>
        </div>

        <Button variant="outline" onClick={onClose} className="w-full mt-2">
          Luk
        </Button>
      </DialogContent>
    </Dialog>
  )
}

interface CategoryRowProps {
  cat: GroceryCategory
  index: number
  total: number
  onNameBlur: (cat: GroceryCategory, value: string) => void
  onColorChange: (cat: GroceryCategory, color: string) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onDelete: (id: string) => void
}

function CategoryRow({ cat, index, total, onNameBlur, onColorChange, onMoveUp, onMoveDown, onDelete }: CategoryRowProps) {
  const [name, setName] = useState(cat.name)

  return (
    <div className="flex items-center gap-2 py-1">
      <input
        type="color"
        value={cat.color || '#6366f1'}
        onChange={e => onColorChange(cat, e.target.value)}
        className="h-7 w-8 rounded border cursor-pointer shrink-0"
        title="Farve"
      />
      <Input
        className="h-7 text-sm flex-1"
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={() => onNameBlur(cat, name)}
        onKeyDown={e => { if (e.key === 'Enter') onNameBlur(cat, name) }}
      />
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          aria-label="Flyt op"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          onClick={() => onMoveDown(index)}
          disabled={index === total - 1}
          aria-label="Flyt ned"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          className="p-1 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(cat.id)}
          aria-label="Slet kategori"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
