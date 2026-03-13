import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Trash2, Plus, ChevronDown, ChevronUp, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import type { GroceryListItem, GroceryProduct, GroceryCategory } from '@/types'
import { cn } from '@/lib/utils'

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'lige nu'
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} t`
  return `${Math.floor(hrs / 24)} d`
}

interface GroceryItemRowProps {
  item: GroceryListItem
  onUpdate: (id: string, data: Partial<{ quantity: string; note: string; buyOnDiscount: boolean; checked: boolean }>) => void
  onDelete: (id: string) => void
}

function GroceryItemRow({ item, onUpdate, onDelete }: GroceryItemRowProps) {
  const [editingQty, setEditingQty] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [qty, setQty] = useState(item.quantity ?? '')
  const [note, setNote] = useState(item.note ?? '')

  const commitQty = () => {
    setEditingQty(false)
    if (qty !== (item.quantity ?? '')) {
      onUpdate(item.id, { quantity: qty || undefined })
    }
  }

  const commitNote = () => {
    setEditingNote(false)
    if (note !== (item.note ?? '')) {
      onUpdate(item.id, { note: note || undefined })
    }
  }

  return (
    <div className="flex items-start gap-3 py-2 px-1">
      <Checkbox
        className="mt-0.5 shrink-0"
        checked={item.checked}
        onCheckedChange={(checked) => onUpdate(item.id, { checked: !!checked })}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-sm font-medium', item.checked && 'line-through text-muted-foreground')}>
            {item.name}
          </span>
          {editingQty ? (
            <Input
              autoFocus
              className="h-6 w-24 text-xs px-1"
              value={qty}
              onChange={e => setQty(e.target.value)}
              onBlur={commitQty}
              onKeyDown={e => { if (e.key === 'Enter') commitQty() }}
            />
          ) : (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setEditingQty(true)}
            >
              {item.quantity || <span className="opacity-40">+ maengde</span>}
            </button>
          )}
          {item.buyOnDiscount && (
            <Badge
              variant="secondary"
              className="text-xs shrink-0 cursor-pointer"
              onClick={() => onUpdate(item.id, { buyOnDiscount: false })}
            >
              Tilbud
            </Badge>
          )}
          {!item.buyOnDiscount && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground opacity-40 hover:opacity-100"
              onClick={() => onUpdate(item.id, { buyOnDiscount: true })}
              title="Marker som tilbud"
            >
              <Tag className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {editingNote ? (
            <Input
              autoFocus
              className="h-6 w-48 text-xs px-1"
              value={note}
              onChange={e => setNote(e.target.value)}
              onBlur={commitNote}
              onKeyDown={e => { if (e.key === 'Enter') commitNote() }}
            />
          ) : (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setEditingNote(true)}
            >
              {item.note || <span className="opacity-40">+ note</span>}
            </button>
          )}
          <span className="text-xs text-muted-foreground opacity-50">
            {timeAgo(item.createdAt)}
          </span>
          {item.checked && item.checkedAt && (
            <span className="text-xs text-muted-foreground opacity-50">
              · koebt {timeAgo(item.checkedAt)}
            </span>
          )}
        </div>
      </div>
      <button
        className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0"
        onClick={() => onDelete(item.id)}
        aria-label="Slet vare"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface CategorySectionProps {
  label: string
  color?: string
  items: GroceryListItem[]
  onUpdate: (id: string, data: Partial<{ quantity: string; note: string; buyOnDiscount: boolean; checked: boolean }>) => void
  onDelete: (id: string) => void
}

function CategorySection({ label, color, items, onUpdate, onDelete }: CategorySectionProps) {
  if (items.length === 0) return null
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1 px-1">
        {color && (
          <span
            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      <div className="divide-y">
        {items.map(item => (
          <GroceryItemRow key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}

export default function Groceries() {
  const queryClient = useQueryClient()

  const { data: list, isLoading } = useQuery({
    queryKey: ['groceries'],
    queryFn: () => api.groceries.getList(),
    refetchInterval: 15_000,
  })

  const { data: categories = [] } = useQuery<GroceryCategory[]>({
    queryKey: ['grocery-categories'],
    queryFn: () => api.groceries.listCategories(),
  })

  // Add item form state
  const [itemName, setItemName] = useState('')
  const [itemQuantity, setItemQuantity] = useState('')
  const [itemNote, setItemNote] = useState('')
  const [buyOnDiscount, setBuyOnDiscount] = useState(false)
  const [suggestions, setSuggestions] = useState<GroceryProduct[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<GroceryProduct | null>(null)
  const [showBoughtSection, setShowBoughtSection] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // New category form state
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#6366f1')

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (itemName.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    debounceRef.current = setTimeout(async () => {
      const results = await api.groceries.searchProducts(itemName)
      setSuggestions(results)
      setShowSuggestions(results.length > 0)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [itemName])

  const addItemMutation = useMutation({
    mutationFn: () => api.groceries.addItem(list!.id, {
      name: itemName,
      productId: selectedProduct?.id,
      quantity: itemQuantity || undefined,
      note: itemNote || undefined,
      buyOnDiscount,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceries'] })
      setItemName('')
      setItemQuantity('')
      setItemNote('')
      setBuyOnDiscount(false)
      setSuggestions([])
      setSelectedProduct(null)
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ quantity: string; note: string; buyOnDiscount: boolean; checked: boolean }> }) =>
      api.groceries.updateItem(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groceries'] }),
  })

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => api.groceries.deleteItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groceries'] }),
  })

  const clearBoughtMutation = useMutation({
    mutationFn: () => api.groceries.clearBought(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groceries'] }),
  })

  const generateMutation = useMutation({
    mutationFn: () => api.groceries.generateFromMealPlan(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groceries'] }),
  })

  const addCategoryMutation = useMutation({
    mutationFn: () => api.groceries.createCategory({ name: newCategoryName, color: newCategoryColor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grocery-categories'] })
      setNewCategoryName('')
      setShowAddCategory(false)
    },
  })

  const handleSelectSuggestion = (product: GroceryProduct) => {
    setItemName(product.name)
    setSelectedProduct(product)
    setShowSuggestions(false)
  }

  const handleUpdate = (id: string, data: Partial<{ quantity: string; note: string; buyOnDiscount: boolean; checked: boolean }>) => {
    updateItemMutation.mutate({ id, data })
  }

  const handleDelete = (id: string) => {
    deleteItemMutation.mutate(id)
  }

  // Group unchecked items - without server-side category join, all items go in one group
  const uncheckedNoCat = useMemo(() => {
    return list?.items.filter(i => !i.checked) ?? []
  }, [list])

  const checkedItems = list?.items.filter(i => i.checked) ?? []
  const uncheckedCount = list?.items.filter(i => !i.checked).length ?? 0

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Indkobsliste</h1>
        <div className="flex items-center gap-2">
          {checkedItems.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearBoughtMutation.mutate()}
              disabled={clearBoughtMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Ryd koebt
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', generateMutation.isPending && 'animate-spin')} />
            Fra madplan
          </Button>
        </div>
      </div>

      {/* Categories management */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map(cat => (
          <Badge
            key={cat.id}
            variant="outline"
            className="text-xs"
            style={{ borderColor: cat.color, color: cat.color }}
          >
            {cat.name}
          </Badge>
        ))}
        <button
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          onClick={() => setShowAddCategory(v => !v)}
        >
          + Tilfoej kategori
        </button>
      </div>

      {showAddCategory && (
        <div className="flex items-center gap-2 border rounded-md p-3">
          <Input
            className="h-8 text-sm"
            placeholder="Kategorinavn..."
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newCategoryName) addCategoryMutation.mutate() }}
          />
          <input
            type="color"
            value={newCategoryColor}
            onChange={e => setNewCategoryColor(e.target.value)}
            className="h-8 w-10 rounded border cursor-pointer"
            title="Vaelg farve"
          />
          <Button
            size="sm"
            onClick={() => addCategoryMutation.mutate()}
            disabled={!newCategoryName || addCategoryMutation.isPending}
          >
            Gem
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAddCategory(false)}
          >
            Annuller
          </Button>
        </div>
      )}

      {/* Items list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div>
          {uncheckedCount === 0 && checkedItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              Indkobslisten er tom
            </p>
          )}

          {/* Unchecked items - grouped by category */}
          {uncheckedNoCat.length > 0 && (
            <CategorySection
              label="Varer"
              items={uncheckedNoCat}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          )}

          {/* Checked / bought section */}
          {checkedItems.length > 0 && (
            <>
              <Separator className="my-3" />
              <button
                className="flex items-center gap-2 w-full text-left px-1 mb-2"
                onClick={() => setShowBoughtSection(v => !v)}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Koebt ({checkedItems.length})
                </span>
                {showBoughtSection
                  ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                }
              </button>
              {showBoughtSection && (
                <div className="divide-y opacity-60">
                  {checkedItems.map(item => (
                    <GroceryItemRow
                      key={item.id}
                      item={item}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Add item form - sticky on mobile */}
      <div className="fixed bottom-16 left-0 right-0 md:static md:bottom-auto border-t md:border md:rounded-lg bg-card p-4 space-y-3 shadow-lg md:shadow-none z-20">
        <p className="text-sm font-semibold flex items-center gap-1">
          <Plus className="h-4 w-4" />
          Tilfoej vare
        </p>
        <div className="relative">
          <Input
            placeholder="Varenavn..."
            value={itemName}
            onChange={e => { setItemName(e.target.value); setSelectedProduct(null) }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={e => {
              if (e.key === 'Enter' && itemName && list) addItemMutation.mutate()
            }}
          />
          {showSuggestions && (
            <div className="absolute z-10 w-full bg-background border rounded-md shadow-md mt-1">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                  onMouseDown={() => handleSelectSuggestion(s)}
                >
                  {s.category && (
                    <span
                      className="inline-block h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.category.color }}
                    />
                  )}
                  <span>{s.name}</span>
                  {s.category && (
                    <span className="text-xs text-muted-foreground ml-auto">{s.category.name}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedProduct?.category && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Kategori:</span>
            <Badge
              variant="outline"
              className="text-xs"
              style={{ borderColor: selectedProduct.category.color, color: selectedProduct.category.color }}
            >
              {selectedProduct.category.name}
            </Badge>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="Maengde (f.eks. 500g)"
            value={itemQuantity}
            onChange={e => setItemQuantity(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Note"
            value={itemNote}
            onChange={e => setItemNote(e.target.value)}
            className="flex-1"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="discount"
              checked={buyOnDiscount}
              onCheckedChange={c => setBuyOnDiscount(!!c)}
            />
            <Label htmlFor="discount" className="text-sm">Koebes pa tilbud</Label>
          </div>
          <Button
            size="sm"
            onClick={() => addItemMutation.mutate()}
            disabled={!itemName || !list || addItemMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            Tilfoej
          </Button>
        </div>
      </div>
    </div>
  )
}
