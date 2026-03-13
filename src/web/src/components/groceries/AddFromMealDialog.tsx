import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { api } from '@/lib/api'
import type { Meal, RecipeIngredient } from '@/types'

interface AddFromMealDialogProps {
  open: boolean
  onClose: () => void
  meal: Meal
}

function parseIngredients(raw: string | undefined | null): RecipeIngredient[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function AddFromMealDialog({ open, onClose, meal }: AddFromMealDialogProps) {
  const queryClient = useQueryClient()
  const ingredients = parseIngredients(meal.recipe?.ingredients)
  const [selected, setSelected] = useState<Set<number>>(() => new Set(ingredients.map((_, i) => i)))
  const [success, setSuccess] = useState(false)

  const mutation = useMutation({
    mutationFn: () => {
      const items = ingredients
        .filter((_, i) => selected.has(i))
        .map(ing => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          productId: ing.productId,
          recipeId: meal.recipeId ?? undefined,
        }))
      return api.groceries.addItemsFromMeal({ mealId: meal.id, items })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceries'] })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1200)
    },
  })

  const toggleAll = () => {
    if (selected.size === ingredients.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(ingredients.map((_, i) => i)))
    }
  }

  const toggle = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const title = meal.recipe?.name ?? meal.title

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {ingredients.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Ingen ingredienser fundet for denne opskrift
          </p>
        ) : (
          <>
            {success && (
              <p className="text-sm text-green-600 text-center font-medium py-2">
                Ingredienser tilføjet!
              </p>
            )}
            <div className="flex items-center gap-2 mb-3">
              <Checkbox
                id="select-all"
                checked={selected.size === ingredients.length}
                onCheckedChange={toggleAll}
              />
              <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
                Vælg alle
              </label>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <Checkbox
                    id={`ing-${i}`}
                    checked={selected.has(i)}
                    onCheckedChange={() => toggle(i)}
                  />
                  <label htmlFor={`ing-${i}`} className="text-sm cursor-pointer flex-1">
                    <span className="font-medium">{ing.name}</span>
                    {(ing.quantity || ing.unit) && (
                      <span className="text-muted-foreground ml-2">
                        {[ing.quantity, ing.unit].filter(Boolean).join(' ')}
                      </span>
                    )}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => mutation.mutate()}
                disabled={selected.size === 0 || mutation.isPending || success}
                className="flex-1"
              >
                Tilføj valgte ({selected.size})
              </Button>
              <Button variant="outline" onClick={onClose}>
                Annuller
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
