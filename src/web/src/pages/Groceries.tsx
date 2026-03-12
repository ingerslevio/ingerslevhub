import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { da } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { GroceryItem } from '@/components/groceries/GroceryItem'
import { api } from '@/lib/api'
import type { GroceryProduct } from '@/types'

export default function Groceries() {
  const queryClient = useQueryClient()
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const weekKey = format(currentWeekStart, 'yyyy-MM-dd')

  const { data: list, isLoading } = useQuery({
    queryKey: ['groceries', weekKey],
    queryFn: () => api.groceries.getList(weekKey),
  })

  // Add item form state
  const [itemName, setItemName] = useState('')
  const [itemQuantity, setItemQuantity] = useState('')
  const [itemNote, setItemNote] = useState('')
  const [buyOnDiscount, setBuyOnDiscount] = useState(false)
  const [suggestions, setSuggestions] = useState<GroceryProduct[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (itemName.length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      const results = await api.groceries.searchProducts(itemName)
      setSuggestions(results)
      setShowSuggestions(results.length > 0)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [itemName])

  const addItemMutation = useMutation({
    mutationFn: () => api.groceries.addItem(list!.id, {
      name: itemName, quantity: itemQuantity || undefined,
      note: itemNote || undefined, buyOnDiscount
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceries', weekKey] })
      setItemName(''); setItemQuantity(''); setItemNote(''); setBuyOnDiscount(false); setSuggestions([])
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ checked: boolean; buyOnDiscount: boolean }> }) =>
      api.groceries.updateItem(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groceries', weekKey] }),
  })

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => api.groceries.deleteItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groceries', weekKey] }),
  })

  const generateMutation = useMutation({
    mutationFn: () => api.groceries.generateFromMealPlan(list!.id, weekKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groceries', weekKey] }),
  })

  const unchecked = list?.items.filter(i => !i.checked) ?? []
  const checked = list?.items.filter(i => i.checked) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Indkobsliste</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateMutation.mutate()}
          disabled={!list || generateMutation.isPending}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Generer fra madplan
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(d => subWeeks(d, 1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium min-w-[200px] text-center">
          Uge fra {format(currentWeekStart, 'd. MMMM yyyy', { locale: da })}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(d => addWeeks(d, 1))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {unchecked.map(item => (
            <GroceryItem
              key={item.id}
              item={item}
              onUpdate={(id, data) => updateItemMutation.mutate({ id, data })}
              onDelete={(id) => deleteItemMutation.mutate(id)}
            />
          ))}
          {checked.length > 0 && unchecked.length > 0 && <Separator />}
          {checked.map(item => (
            <GroceryItem
              key={item.id}
              item={item}
              onUpdate={(id, data) => updateItemMutation.mutate({ id, data })}
              onDelete={(id) => deleteItemMutation.mutate(id)}
            />
          ))}
          {(list?.items.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Ingen varer pa listen</p>
          )}
        </div>
      )}

      {/* Add item form */}
      <div className="border rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium">Tilfoej vare</p>
        <div className="relative">
          <Input
            placeholder="Varenavn..."
            value={itemName}
            onChange={e => setItemName(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {showSuggestions && (
            <div className="absolute z-10 w-full bg-background border rounded-md shadow-md mt-1">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                  onMouseDown={() => { setItemName(s.name); setShowSuggestions(false) }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Maengde (f.eks. 500g)" value={itemQuantity} onChange={e => setItemQuantity(e.target.value)} />
          <Input placeholder="Note" value={itemNote} onChange={e => setItemNote(e.target.value)} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox id="discount" checked={buyOnDiscount} onCheckedChange={c => setBuyOnDiscount(!!c)} />
            <Label htmlFor="discount" className="text-sm">Koeb pa tilbud</Label>
          </div>
          <Button
            size="sm"
            onClick={() => addItemMutation.mutate()}
            disabled={!itemName || !list || addItemMutation.isPending}
          >
            Tilfoej
          </Button>
        </div>
      </div>
    </div>
  )
}
