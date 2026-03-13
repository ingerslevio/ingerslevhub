import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Plus, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import type { Recipe, RecipeIngredient, RecipeTag, GroceryProduct } from '@/types'
import { cn } from '@/lib/utils'

interface RecipeDialogProps {
  open: boolean
  onClose: () => void
  recipe?: Recipe | null
}

function parseTags(raw: string[] | string | undefined | null): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

function parseIngredients(raw: string | undefined | null): RecipeIngredient[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

export function RecipeDialog({ open, onClose, recipe }: RecipeDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!recipe

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [servings, setServings] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [instructions, setInstructions] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState<RecipeTag[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])

  const tagDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ingDebounces = useRef<Record<number, ReturnType<typeof setTimeout>>>({})
  const [ingSuggestions, setIngSuggestions] = useState<Record<number, GroceryProduct[]>>({})
  const [showIngSuggestions, setShowIngSuggestions] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (open) {
      setName(recipe?.name ?? '')
      setDescription(recipe?.description ?? '')
      setImageUrl(recipe?.imageUrl ?? '')
      setSourceUrl(recipe?.sourceUrl ?? '')
      setServings(recipe?.servings?.toString() ?? '')
      setPrepTime(recipe?.prepTimeMinutes?.toString() ?? '')
      setCookTime(recipe?.cookTimeMinutes?.toString() ?? '')
      setInstructions(recipe?.instructions ?? '')
      setTags(parseTags(recipe?.tags))
      setIngredients(parseIngredients(recipe?.ingredients))
      setTagInput('')
      setTagSuggestions([])
      setIngSuggestions({})
    }
  }, [open, recipe])

  useEffect(() => {
    if (tagDebounce.current) clearTimeout(tagDebounce.current)
    if (tagInput.length < 1) { setTagSuggestions([]); setShowTagSuggestions(false); return }
    tagDebounce.current = setTimeout(async () => {
      const results = await api.recipes.listTags(tagInput)
      setTagSuggestions(results)
      setShowTagSuggestions(results.length > 0)
    }, 300)
    return () => { if (tagDebounce.current) clearTimeout(tagDebounce.current) }
  }, [tagInput])

  const addTag = (tag: string) => {
    const t = tag.trim()
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t])
    }
    setTagInput('')
    setTagSuggestions([])
    setShowTagSuggestions(false)
  }

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag))

  const addIngredient = () => setIngredients(prev => [...prev, { name: '', quantity: '', unit: '' }])

  const updateIngredient = (i: number, field: keyof RecipeIngredient, value: string) => {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing))
    if (field === 'name') {
      if (ingDebounces.current[i]) clearTimeout(ingDebounces.current[i])
      if (value.length < 2) {
        setIngSuggestions(prev => ({ ...prev, [i]: [] }))
        setShowIngSuggestions(prev => ({ ...prev, [i]: false }))
        return
      }
      ingDebounces.current[i] = setTimeout(async () => {
        const results = await api.groceries.searchProducts(value)
        setIngSuggestions(prev => ({ ...prev, [i]: results.slice(0, 8) }))
        setShowIngSuggestions(prev => ({ ...prev, [i]: results.length > 0 }))
      }, 300)
    }
  }

  const selectIngProduct = (i: number, product: GroceryProduct) => {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, name: product.name, productId: product.id } : ing))
    setIngSuggestions(prev => ({ ...prev, [i]: [] }))
    setShowIngSuggestions(prev => ({ ...prev, [i]: false }))
  }

  const removeIngredient = (i: number) => setIngredients(prev => prev.filter((_, idx) => idx !== i))

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        sourceUrl: sourceUrl || undefined,
        servings: servings ? parseInt(servings) : undefined,
        prepTimeMinutes: prepTime ? parseInt(prepTime) : undefined,
        cookTimeMinutes: cookTime ? parseInt(cookTime) : undefined,
        instructions: instructions || undefined,
        tags,
        ingredients: JSON.stringify(ingredients.filter(i => i.name.trim())),
      }
      if (isEdit && recipe) {
        return api.recipes.update(recipe.id, payload)
      }
      return api.recipes.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.recipes.delete(recipe!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      onClose()
    },
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Rediger opskrift' : 'Ny opskrift'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="recipe-name">Navn *</Label>
            <Input id="recipe-name" value={name} onChange={e => setName(e.target.value)} placeholder="Opskriftsnavn..." />
          </div>

          <div>
            <Label htmlFor="recipe-desc">Beskrivelse</Label>
            <Textarea id="recipe-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Kort beskrivelse..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="recipe-imageUrl">Billede URL</Label>
              <Input id="recipe-imageUrl" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label htmlFor="recipe-sourceUrl">Kilde (link)</Label>
              <Input id="recipe-sourceUrl" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="recipe-servings">Portioner</Label>
              <Input id="recipe-servings" type="number" min="1" value={servings} onChange={e => setServings(e.target.value)} placeholder="4" />
            </div>
            <div>
              <Label htmlFor="recipe-prep">Forberedelsestid (min)</Label>
              <Input id="recipe-prep" type="number" min="0" value={prepTime} onChange={e => setPrepTime(e.target.value)} placeholder="15" />
            </div>
            <div>
              <Label htmlFor="recipe-cook">Tilberedningstid (min)</Label>
              <Input id="recipe-cook" type="number" min="0" value={cookTime} onChange={e => setCookTime(e.target.value)} placeholder="30" />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
            <div className="relative">
              <Input
                placeholder="Tilføj tag..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); addTag(tagInput) } }}
                onFocus={() => tagSuggestions.length > 0 && setShowTagSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
              />
              {showTagSuggestions && (
                <div className="absolute z-10 w-full bg-background border rounded-md shadow-md mt-1">
                  {tagSuggestions.map(s => (
                    <button key={s.id} className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent" onMouseDown={() => addTag(s.name)}>
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <Label>Ingredienser</Label>
            <div className="space-y-2 mt-1">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Produkt..."
                      value={ing.name}
                      onChange={e => updateIngredient(i, 'name', e.target.value)}
                      onFocus={() => ingSuggestions[i]?.length > 0 && setShowIngSuggestions(prev => ({ ...prev, [i]: true }))}
                      onBlur={() => setTimeout(() => setShowIngSuggestions(prev => ({ ...prev, [i]: false })), 150)}
                      className="h-8 text-sm"
                    />
                    {showIngSuggestions[i] && ingSuggestions[i]?.length > 0 && (
                      <div className="absolute z-10 w-full bg-background border rounded-md shadow-md mt-0.5">
                        {ingSuggestions[i].map(s => (
                          <button key={s.id} className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2" onMouseDown={() => selectIngProduct(i, s)}>
                            {s.category && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.category.color }} />}
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input
                    placeholder="Mængde"
                    value={ing.quantity ?? ''}
                    onChange={e => updateIngredient(i, 'quantity', e.target.value)}
                    className="w-24 h-8 text-sm"
                  />
                  <Input
                    placeholder="Enhed"
                    value={ing.unit ?? ''}
                    onChange={e => updateIngredient(i, 'unit', e.target.value)}
                    className="w-16 h-8 text-sm"
                  />
                  <button onClick={() => removeIngredient(i)} className="p-1 text-muted-foreground hover:text-destructive mt-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addIngredient} className="mt-2">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Tilføj ingrediens
            </Button>
          </div>

          {/* Instructions */}
          <div>
            <Label htmlFor="recipe-instructions">Fremgangsmåde</Label>
            <Textarea id="recipe-instructions" value={instructions} onChange={e => setInstructions(e.target.value)} rows={4} placeholder="Trin for trin..." />
          </div>
        </div>

        <DialogFooter className={cn('flex-col-reverse sm:flex-row gap-2 mt-4', isEdit && 'sm:justify-between')}>
          {isEdit && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Slet
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Annuller</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!name.trim() || saveMutation.isPending}>
              Gem
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
