import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfWeek } from 'date-fns'
import { Trash2, Plus, ChevronDown, ChevronUp, Settings2, ShoppingCart, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import type { GroceryListItem, GroceryProduct, GroceryCategory, Meal } from '@/types'
import { cn } from '@/lib/utils'
import { CategoryEditor } from '@/components/groceries/CategoryEditor'
import { AddFromMealDialog } from '@/components/groceries/AddFromMealDialog'

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'lige nu'
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} t`
  return `${Math.floor(hrs / 24)} d`
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Mandag', tuesday: 'Tirsdag', wednesday: 'Onsdag', thursday: 'Torsdag',
  friday: 'Fredag', saturday: 'Lørdag', sunday: 'Søndag',
}

interface GroceryItemRowProps {
  item: GroceryListItem
  expanded: boolean
  onExpand: () => void
  onCollapse: () => void
  onUpdate: (id: string, data: Partial<{ quantity: string; note: string; buyOnDiscount: boolean; checked: boolean }>) => void
  onDelete: (id: string) => void
}

function GroceryItemRow({ item, expanded, onExpand, onCollapse, onUpdate, onDelete }: GroceryItemRowProps) {
  const [qty, setQty] = useState(item.quantity ?? '')
  const [note, setNote] = useState(item.note ?? '')

  useEffect(() => {
    setQty(item.quantity ?? '')
    setNote(item.note ?? '')
  }, [item.quantity, item.note])

  const commitQty = () => {
    if (qty !== (item.quantity ?? '')) onUpdate(item.id, { quantity: qty || undefined })
  }

  const commitNote = () => {
    if (note !== (item.note ?? '')) onUpdate(item.id, { note: note || undefined })
  }

  const handleRowClick = () => {
    onUpdate(item.id, { checked: !item.checked })
  }

  return (
    <div className="border-b last:border-b-0">
      <div className="flex items-center gap-2 py-2 px-1">
        <button
          className="flex-1 flex items-center gap-2 text-left min-w-0"
          onClick={handleRowClick}
          aria-label={item.checked ? 'Marker som ikke købt' : 'Marker som købt'}
        >
          <span className={cn('text-sm font-medium truncate', item.checked && 'line-through text-muted-foreground')}>
            {item.name}
          </span>
          <span className="text-xs text-muted-foreground opacity-50 shrink-0">{timeAgo(item.createdAt)}</span>
          {item.quantity && (
            <Badge variant="outline" className="text-xs shrink-0 h-5 px-1">{item.quantity}</Badge>
          )}
          {item.buyOnDiscount && (
            <Badge variant="secondary" className="text-xs shrink-0 h-5">Tilbud</Badge>
          )}
        </button>
        <button
          className="h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
          onClick={expanded ? onCollapse : onExpand}
          aria-label={expanded ? 'Skjul detaljer' : 'Vis detaljer'}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="pl-4 pb-3 pt-2 space-y-2 border-t">
          <div className="flex gap-2">
            <Input
              className="h-8 flex-1 text-sm"
              placeholder="Mængde (fx 500g, 2 stk)"
              value={qty}
              onChange={e => setQty(e.target.value)}
              onBlur={commitQty}
              onKeyDown={e => e.key === 'Enter' && commitQty()}
            />
            <Input
              className="h-8 flex-1 text-sm"
              placeholder="Note"
              value={note}
              onChange={e => setNote(e.target.value)}
              onBlur={commitNote}
              onKeyDown={e => e.key === 'Enter' && commitNote()}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox
              checked={item.buyOnDiscount}
              onCheckedChange={(v) => onUpdate(item.id, { buyOnDiscount: !!v })}
            />
            <span className="text-sm">Køb på tilbud</span>
          </label>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs w-full"
            onClick={() => { onDelete(item.id); onCollapse() }}
          >
            Fjern vare
          </Button>
        </div>
      )}
    </div>
  )
}

interface CategorySectionProps {
  label: string
  color?: string
  items: GroceryListItem[]
  expandedItemId: string | null
  onExpandItem: (id: string | null) => void
  onUpdate: (id: string, data: Partial<{ quantity: string; note: string; buyOnDiscount: boolean; checked: boolean }>) => void
  onDelete: (id: string) => void
}

function CategorySection({ label, color, items, expandedItemId, onExpandItem, onUpdate, onDelete }: CategorySectionProps) {
  if (items.length === 0) return null
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1 px-1">
        {color && <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      <div className="border rounded-md overflow-hidden">
        {items.map(item => (
          <GroceryItemRow
            key={item.id}
            item={item}
            expanded={expandedItemId === item.id}
            onExpand={() => onExpandItem(item.id)}
            onCollapse={() => onExpandItem(null)}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}

interface ProductSearchProps {
  categories: GroceryCategory[]
  listId: string
  onItemAdded: () => void
}

function ProductSearch({ listId, onItemAdded }: ProductSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GroceryProduct[]>([])
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
      const found = await api.groceries.searchProducts(query)
      setResults(found)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const displayedProducts = query.length > 0 ? results : allProducts

  const addItemMutation = useMutation({
    mutationFn: (product: GroceryProduct) =>
      api.groceries.addItem(listId, { name: product.name, productId: product.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceries'] })
      queryClient.invalidateQueries({ queryKey: ['grocery-products-all'] })
      setQuery('')
      setResults([])
      onItemAdded()
    },
  })

  const createItemMutation = useMutation({
    mutationFn: (name: string) =>
      api.groceries.addItem(listId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceries'] })
      queryClient.invalidateQueries({ queryKey: ['grocery-products-all'] })
      setQuery('')
      setResults([])
      onItemAdded()
    },
  })

  const exactMatch = displayedProducts.some(r => r.name.toLowerCase() === query.toLowerCase())

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
            if (e.key === 'Enter' && query.trim() && !exactMatch) {
              createItemMutation.mutate(query.trim())
            }
          }}
        />
        {query.length > 0 && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => { setQuery(''); setResults([]) }}
            aria-label="Ryd søgning"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="border rounded-md divide-y bg-card shadow-sm max-h-64 overflow-y-auto scrollbar-thin">
        {displayedProducts.map(product => (
          <div key={product.id} className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50">
            <button
              className="flex items-center gap-2 flex-1 text-left min-w-0"
              onClick={() => addItemMutation.mutate(product)}
              disabled={addItemMutation.isPending}
            >
              {product.category && (
                <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: product.category.color }} />
              )}
              <span className="text-sm font-medium truncate">{product.name}</span>
              {product.category && (
                <span className="text-xs text-muted-foreground ml-auto shrink-0">{product.category.name}</span>
              )}
            </button>
          </div>
        ))}

        {!exactMatch && query.trim() && (
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 flex items-center gap-2 text-muted-foreground"
            onClick={() => createItemMutation.mutate(query.trim())}
            disabled={createItemMutation.isPending}
          >
            <Plus className="h-3.5 w-3.5" />
            Opret ny vare: <span className="font-medium text-foreground ml-1">{query}</span>
          </button>
        )}
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
            Rediger Kategorier
          </Button>
        </div>
      </div>

      {/* Fra madplan section */}
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

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div>
          {uncheckedItems.length === 0 && checkedItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">
              Indkøbslisten er tom
            </p>
          )}

          {/* Grouped by category */}
          {sortedCategories.map(cat => {
            const items = categorySections.get(cat.id) ?? []
            return (
              <CategorySection
                key={cat.id}
                label={cat.name}
                color={cat.color}
                items={items}
                expandedItemId={expandedItemId}
                onExpandItem={(id) => setExpandedItemId(id)}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            )
          })}

          {/* Items without category */}
          {noCatItems.length > 0 && (
            <CategorySection
              label="Ingen kategori"
              items={noCatItems}
              expandedItemId={expandedItemId}
              onExpandItem={(id) => setExpandedItemId(id)}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          )}

          {checkedItems.length > 0 && (
            <>
              <Separator className="my-3" />
              <button className="flex items-center gap-2 w-full text-left px-1 mb-2" onClick={() => setShowBoughtSection(v => !v)}>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Købt ({checkedItems.length})
                </span>
                {showBoughtSection ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {showBoughtSection && (
                <div className="opacity-60 border rounded-md overflow-hidden">
                  {checkedItems.map(item => (
                    <GroceryItemRow
                      key={item.id}
                      item={item}
                      expanded={expandedItemId === item.id}
                      onExpand={() => setExpandedItemId(item.id)}
                      onCollapse={() => setExpandedItemId(null)}
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

      {/* Add item form - search-based */}
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
        <AddFromMealDialog
          open={true}
          onClose={() => setAddFromMealTarget(null)}
          meal={addFromMealTarget}
        />
      )}
    </div>
  )
}
