import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfWeek } from 'date-fns'
import { Trash2, Plus, ChevronDown, ChevronUp, Settings2, ShoppingCart, Search, X, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import type { GroceryListItem, GroceryProduct, GroceryCategory, Meal } from '@/types'
import { cn } from '@/lib/utils'
import { CategoryEditor } from '@/components/groceries/CategoryEditor'
import { AddFromMealDialog } from '@/components/groceries/AddFromMealDialog'

const DAY_LABELS: Record<string, string> = {
  monday: 'Mandag', tuesday: 'Tirsdag', wednesday: 'Onsdag', thursday: 'Torsdag',
  friday: 'Fredag', saturday: 'Lørdag', sunday: 'Søndag',
}

// ─── Active list item row (dense) ──────────────────────────────────────────

interface GroceryItemRowProps {
  item: GroceryListItem
  expanded: boolean
  onExpand: () => void
  onCollapse: () => void
  onUpdate: (id: string, data: Partial<{ quantity: string; note: string; buyOnDiscount: boolean; checked: boolean; categoryId: string | null }>) => void
  onDelete: (id: string) => void
}

function GroceryItemRow({ item, expanded, onExpand, onCollapse, onUpdate, onDelete }: GroceryItemRowProps) {
  const [qty, setQty] = useState(item.quantity ?? '')
  const [note, setNote] = useState(item.note ?? '')

  useEffect(() => { setQty(item.quantity ?? '') }, [item.quantity])
  useEffect(() => { setNote(item.note ?? '') }, [item.note])

  const commitQty = () => { if (qty !== (item.quantity ?? '')) onUpdate(item.id, { quantity: qty || undefined }) }
  const commitNote = () => { if (note !== (item.note ?? '')) onUpdate(item.id, { note: note || undefined }) }

  return (
    <div className="border-b last:border-b-0">
      <div className="flex items-center gap-2 py-1.5 px-2">
        <Checkbox
          className="shrink-0"
          checked={item.checked}
          onCheckedChange={(v) => onUpdate(item.id, { checked: !!v })}
        />
        <button
          className="flex-1 flex items-center gap-1.5 text-left min-w-0"
          onClick={expanded ? onCollapse : onExpand}
        >
          <span className={cn('text-sm truncate', item.checked && 'line-through text-muted-foreground')}>
            {item.name}
          </span>
          {item.quantity && (
            <Badge variant="outline" className="text-xs shrink-0 h-4 px-1">{item.quantity}</Badge>
          )}
          {item.buyOnDiscount && (
            <Badge variant="secondary" className="text-xs shrink-0 h-4">Tilbud</Badge>
          )}
        </button>
        <button
          className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
          onClick={expanded ? onCollapse : onExpand}
          aria-label={expanded ? 'Skjul' : 'Rediger'}
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="pl-8 pb-3 pt-1 pr-2 space-y-2 border-t bg-muted/20">
          <div className="flex gap-2">
            <Input className="h-7 flex-1 text-sm" placeholder="Mængde (fx 500g)" value={qty}
              onChange={e => setQty(e.target.value)} onBlur={commitQty}
              onKeyDown={e => e.key === 'Enter' && commitQty()} />
            <Input className="h-7 flex-1 text-sm" placeholder="Note" value={note}
              onChange={e => setNote(e.target.value)} onBlur={commitNote}
              onKeyDown={e => e.key === 'Enter' && commitNote()} />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <Checkbox checked={item.buyOnDiscount} onCheckedChange={(v) => onUpdate(item.id, { buyOnDiscount: !!v })} />
              <span className="text-xs">Køb på tilbud</span>
            </label>
            <Button variant="destructive" size="sm" className="h-6 text-xs"
              onClick={() => { onDelete(item.id); onCollapse() }}>
              Fjern
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Category section ───────────────────────────────────────────────────────

interface CategorySectionProps {
  label: string
  color?: string
  items: GroceryListItem[]
  expandedItemId: string | null
  onExpandItem: (id: string | null) => void
  onUpdate: (id: string, data: Partial<{ quantity: string; note: string; buyOnDiscount: boolean; checked: boolean; categoryId: string | null }>) => void
  onDelete: (id: string) => void
}

function CategorySection({ label, color, items, expandedItemId, onExpandItem, onUpdate, onDelete }: CategorySectionProps) {
  if (items.length === 0) return null
  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 mb-1 px-1">
        {color && <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      <div className="border rounded-md overflow-hidden">
        {items.map(item => (
          <GroceryItemRow key={item.id} item={item}
            expanded={expandedItemId === item.id}
            onExpand={() => onExpandItem(item.id)}
            onCollapse={() => onExpandItem(null)}
            onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
    </div>
  )
}

// ─── Product search + kept list ─────────────────────────────────────────────

interface ProductSearchProps {
  categories: GroceryCategory[]
  listId: string
  onItemAdded: () => void
}

function ProductSearch({ listId, categories, onItemAdded }: ProductSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GroceryProduct[]>([])
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
  const [addQty, setAddQty] = useState('')
  const [addNote, setAddNote] = useState('')
  const [addDiscount, setAddDiscount] = useState(false)
  const [editingProduct, setEditingProduct] = useState<GroceryProduct | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queryClient = useQueryClient()

  const { data: allProducts = [] } = useQuery({
    queryKey: ['grocery-products-all'],
    queryFn: () => api.groceries.searchProducts(''),
  })

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 1) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setResults(await api.groceries.searchProducts(query))
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const displayedProducts = query.length > 0 ? results : allProducts

  const addItemMutation = useMutation({
    mutationFn: ({ product, qty, note, discount }: { product: GroceryProduct; qty: string; note: string; discount: boolean }) =>
      api.groceries.addItem(listId, {
        name: product.name,
        productId: product.id,
        quantity: qty || undefined,
        note: note || undefined,
        buyOnDiscount: discount,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceries'] })
      queryClient.invalidateQueries({ queryKey: ['grocery-products-all'] })
      setExpandedProductId(null)
      setAddQty(''); setAddNote(''); setAddDiscount(false)
      setQuery(''); setResults([])
      onItemAdded()
    },
  })

  const createItemMutation = useMutation({
    mutationFn: (name: string) => api.groceries.addItem(listId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceries'] })
      queryClient.invalidateQueries({ queryKey: ['grocery-products-all'] })
      setQuery(''); setResults([])
      onItemAdded()
    },
  })

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; categoryId?: string | null } }) =>
      api.groceries.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grocery-products-all'] })
      setEditingProduct(null)
    },
  })

  const exactMatch = displayedProducts.some(r => r.name.toLowerCase() === query.toLowerCase())

  const handleExpandProduct = (product: GroceryProduct) => {
    if (expandedProductId === product.id) {
      setExpandedProductId(null)
    } else {
      setExpandedProductId(product.id)
      setAddQty(''); setAddNote(''); setAddDiscount(false)
    }
  }

  const openEdit = (product: GroceryProduct) => {
    setEditingProduct(product)
    setEditName(product.name)
    setEditCategoryId((product as GroceryProduct & { categoryId?: string | null }).categoryId ?? null)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold flex items-center gap-1">
        <Search className="h-4 w-4" />
        Tilføj varer
      </p>
      <div className="relative">
        <Input
          placeholder="Søg efter vare..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && query.trim() && !exactMatch) createItemMutation.mutate(query.trim())
          }}
        />
        {query.length > 0 && (
          <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => { setQuery(''); setResults([]) }}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="border rounded-md overflow-hidden bg-card shadow-sm max-h-80 overflow-y-auto">
        {displayedProducts.map(product => (
          <div key={product.id} className="border-b last:border-b-0">
            {/* Product row */}
            <div className="flex items-center gap-0.5 px-1 py-1 hover:bg-accent/30">
              {/* + adds immediately */}
              <button
                className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => addItemMutation.mutate({ product, qty: '', note: '', discount: false })}
                disabled={addItemMutation.isPending}
                aria-label="Tilføj til liste"
              >
                <Plus className="h-4 w-4" />
              </button>
              {/* Name/category — click to expand */}
              <button className="flex items-center gap-1.5 flex-1 text-left min-w-0 px-1" onClick={() => handleExpandProduct(product)}>
                {product.category && (
                  <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: product.category.color }} />
                )}
                <span className="text-sm truncate">{product.name}</span>
                {product.category && (
                  <span className="text-xs text-muted-foreground ml-auto shrink-0 pl-2">{product.category.name}</span>
                )}
              </button>
              {/* Edit */}
              <button
                className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => openEdit(product)}
                aria-label="Rediger vare"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            {/* Expanded add form */}
            {expandedProductId === product.id && (
              <div className="pl-9 pr-2 pb-2 pt-1 space-y-1.5 border-t bg-muted/20">
                <div className="flex gap-2">
                  <Input className="h-7 text-sm flex-1" placeholder="Mængde (fx 500g)"
                    value={addQty} onChange={e => setAddQty(e.target.value)} />
                  <Input className="h-7 text-sm flex-1" placeholder="Note"
                    value={addNote} onChange={e => setAddNote(e.target.value)} />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <Checkbox checked={addDiscount} onCheckedChange={v => setAddDiscount(!!v)} />
                    <span className="text-xs">Køb på tilbud</span>
                  </label>
                  <Button size="sm" className="h-7 text-xs"
                    onClick={() => addItemMutation.mutate({ product, qty: addQty, note: addNote, discount: addDiscount })}>
                    <Plus className="h-3 w-3 mr-1" /> Tilføj
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {!exactMatch && query.trim() && (
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 flex items-center gap-2 text-muted-foreground border-t"
            onClick={() => createItemMutation.mutate(query.trim())}
            disabled={createItemMutation.isPending}
          >
            <Plus className="h-3.5 w-3.5" />
            Opret ny vare: <span className="font-medium text-foreground ml-1">{query}</span>
          </button>
        )}

        {displayedProducts.length === 0 && !query && (
          <p className="px-3 py-4 text-sm text-muted-foreground text-center">Ingen varer endnu</p>
        )}
      </div>

      {/* Edit product dialog */}
      {editingProduct && (
        <Dialog open onOpenChange={(open) => !open && setEditingProduct(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Rediger vare</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label htmlFor="edit-name">Navn</Label>
                <Input id="edit-name" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Kategori</Label>
                <Select value={editCategoryId ?? 'none'} onValueChange={v => setEditCategoryId(v === 'none' ? null : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ingen kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ingen kategori</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditingProduct(null)}>Annuller</Button>
                <Button size="sm"
                  disabled={updateProductMutation.isPending}
                  onClick={() => updateProductMutation.mutate({ id: editingProduct.id, data: { name: editName, categoryId: editCategoryId } })}>
                  Gem
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────

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

  const currentWeekKey = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const { data: mealPlan } = useQuery({
    queryKey: ['meals', currentWeekKey],
    queryFn: () => api.meals.getWeek(currentWeekKey),
  })

  const mealsWithRecipes = useMemo(() => {
    if (!mealPlan?.meals) return []
    return mealPlan.meals.filter(m => m.recipe && m.recipe.ingredients && m.recipe.ingredients !== '[]')
  }, [mealPlan])

  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false)
  const [addFromMealTarget, setAddFromMealTarget] = useState<Meal | null>(null)
  const [showBoughtSection, setShowBoughtSection] = useState(false)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ quantity: string; note: string; buyOnDiscount: boolean; checked: boolean; categoryId: string | null }> }) =>
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

  const handleUpdate = (id: string, data: Partial<{ quantity: string; note: string; buyOnDiscount: boolean; checked: boolean; categoryId: string | null }>) => {
    updateItemMutation.mutate({ id, data })
  }

  const handleDelete = (id: string) => deleteItemMutation.mutate(id)

  const uncheckedItems = useMemo(() => list?.items.filter(i => !i.checked) ?? [], [list])
  const checkedItems = useMemo(() => list?.items.filter(i => i.checked) ?? [], [list])

  const categorySections = useMemo(() => {
    const catMap = new Map<string | null, GroceryListItem[]>()
    for (const item of uncheckedItems) {
      const catId = item.category?.id ?? item.effectiveCategoryId ?? null
      if (!catMap.has(catId)) catMap.set(catId, [])
      catMap.get(catId)!.push(item)
    }
    return catMap
  }, [uncheckedItems])

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  )

  const noCatItems = categorySections.get(null) ?? []

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Indkøbsliste</h1>
        <div className="flex items-center gap-2">
          {checkedItems.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => clearBoughtMutation.mutate()} disabled={clearBoughtMutation.isPending}>
              <Trash2 className="h-4 w-4 mr-1" />
              Ryd købt
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setCategoryEditorOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1" />
            Kategorier
          </Button>
        </div>
      </div>

      {/* Fra madplan */}
      {mealsWithRecipes.length > 0 && (
        <div className="border rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <ShoppingCart className="h-3.5 w-3.5" />
            Fra madplan
          </p>
          {mealsWithRecipes.map(meal => (
            <div key={meal.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs text-muted-foreground">{DAY_LABELS[meal.dayOfWeek] ?? meal.dayOfWeek}: </span>
                <span className="text-sm font-medium truncate">{meal.recipe?.name ?? meal.title}</span>
              </div>
              <Button size="sm" variant="outline" className="shrink-0 text-xs h-7" onClick={() => setAddFromMealTarget(meal)}>
                Tilføj
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Active list */}
      {isLoading ? (
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div>
          {uncheckedItems.length === 0 && checkedItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">Indkøbslisten er tom</p>
          )}

          {sortedCategories.map(cat => (
            <CategorySection key={cat.id} label={cat.name} color={cat.color}
              items={categorySections.get(cat.id) ?? []}
              expandedItemId={expandedItemId} onExpandItem={(id) => setExpandedItemId(id)}
              onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}

          {noCatItems.length > 0 && (
            <CategorySection label="Ingen kategori" items={noCatItems}
              expandedItemId={expandedItemId} onExpandItem={(id) => setExpandedItemId(id)}
              onUpdate={handleUpdate} onDelete={handleDelete} />
          )}

          {checkedItems.length > 0 && (
            <>
              <Separator className="my-2" />
              <button className="flex items-center gap-1.5 w-full text-left px-1 mb-1" onClick={() => setShowBoughtSection(v => !v)}>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Købt ({checkedItems.length})
                </span>
                {showBoughtSection ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
              </button>
              {showBoughtSection && (
                <div className="opacity-60 border rounded-md overflow-hidden">
                  {checkedItems.map(item => (
                    <GroceryItemRow key={item.id} item={item}
                      expanded={expandedItemId === item.id}
                      onExpand={() => setExpandedItemId(item.id)}
                      onCollapse={() => setExpandedItemId(null)}
                      onUpdate={handleUpdate} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Product search / kept list */}
      <div className="fixed bottom-16 left-0 right-0 md:static md:bottom-auto border-t md:border md:rounded-lg bg-card p-4 shadow-lg md:shadow-none z-20">
        {list && (
          <ProductSearch
            categories={categories}
            listId={list.id}
            onItemAdded={() => queryClient.invalidateQueries({ queryKey: ['groceries'] })}
          />
        )}
      </div>

      <CategoryEditor open={categoryEditorOpen} onClose={() => setCategoryEditorOpen(false)} />

      {addFromMealTarget && (
        <AddFromMealDialog open={true} onClose={() => setAddFromMealTarget(null)} meal={addFromMealTarget} />
      )}
    </div>
  )
}
