import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { da } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RecipeBrowserDialog } from '@/components/meal-plan/RecipeBrowserDialog'
import { api } from '@/lib/api'
import type { Recipe, Meal } from '@/types'

const DAYS = [
  { key: 'monday', label: 'Mandag' },
  { key: 'tuesday', label: 'Tirsdag' },
  { key: 'wednesday', label: 'Onsdag' },
  { key: 'thursday', label: 'Torsdag' },
  { key: 'friday', label: 'Fredag' },
  { key: 'saturday', label: 'Lordag' },
  { key: 'sunday', label: 'Sondag' },
] as const

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'i dag'
  if (days === 1) return 'i gar'
  return `${days} dage siden`
}

interface MealRatingProps {
  meal: Meal
  onRate: (mealId: string, rating: number) => void
}

function MealRating({ meal, onRate }: MealRatingProps) {
  const current = meal.rating ?? 0
  return (
    <span className="text-yellow-500 text-sm inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          className="hover:scale-110 transition-transform"
          onClick={e => { e.stopPropagation(); onRate(meal.id, i + 1 === current ? 0 : i + 1) }}
          aria-label={`Giv ${i + 1} stjerner`}
        >
          {i < current ? '\u2605' : '\u2606'}
        </button>
      ))}
    </span>
  )
}

export default function MealPlan() {
  const queryClient = useQueryClient()
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [recipeBrowserDay, setRecipeBrowserDay] = useState<string | null>(null)

  const weekKey = format(currentWeekStart, 'yyyy-MM-dd')

  const { data: mealPlan, isLoading } = useQuery({
    queryKey: ['meals', weekKey],
    queryFn: () => api.meals.getWeek(weekKey),
  })

  const addMealMutation = useMutation({
    mutationFn: ({ day, recipe, mealPlanId }: { day: string; recipe: Recipe; mealPlanId: string }) =>
      api.meals.add({
        dayOfWeek: day,
        mealType: 'dinner',
        title: recipe.name,
        mealPlanId,
        recipeId: recipe.id,
        personCount: recipe.servings,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meals', weekKey] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.meals.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meals', weekKey] }),
  })

  const ratingMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) =>
      api.meals.update(id, { rating: rating === 0 ? null : rating }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meals', weekKey] }),
  })

  const handleRecipeSelected = useCallback((recipe: Recipe) => {
    if (!recipeBrowserDay || !mealPlan?.id) return
    addMealMutation.mutate({ day: recipeBrowserDay, recipe, mealPlanId: mealPlan.id })
    setRecipeBrowserDay(null)
  }, [recipeBrowserDay, mealPlan?.id, addMealMutation])

  const handleRate = useCallback((mealId: string, rating: number) => {
    ratingMutation.mutate({ id: mealId, rating })
  }, [ratingMutation])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Madplan</h1>
        <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
          I dag
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
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {DAYS.map(({ key, label }) => {
            const dinners = mealPlan?.meals.filter(m => m.dayOfWeek === key && m.mealType === 'dinner') ?? []
            return (
              <Card key={key}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-24 shrink-0 pt-0.5">
                      <p className="font-semibold text-sm">{label}</p>
                    </div>
                    <div className="flex-1 space-y-2">
                      {dinners.length === 0 && (
                        <span className="text-sm text-muted-foreground">Ingen aftensmad planlagt</span>
                      )}
                      {dinners.map(dinner => (
                        <DinnerRow
                          key={dinner.id}
                          meal={dinner}
                          onDelete={() => deleteMutation.mutate(dinner.id)}
                          onRate={handleRate}
                        />
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setRecipeBrowserDay(key)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <RecipeBrowserDialog
        open={recipeBrowserDay !== null}
        onClose={() => setRecipeBrowserDay(null)}
        onSelect={handleRecipeSelected}
      />
    </div>
  )
}

interface DinnerRowProps {
  meal: Meal
  onDelete: () => void
  onRate: (mealId: string, rating: number) => void
}

function DinnerRow({ meal, onDelete, onRate }: DinnerRowProps) {
  return (
    <div className="flex items-start gap-2 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{meal.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <MealRating meal={meal} onRate={onRate} />
          {meal.personCount && (
            <span className="text-xs text-muted-foreground">{meal.personCount} pers.</span>
          )}
        </div>
        {meal.recipe?.lastUsedAt && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Sidst lavet: {daysAgo(meal.recipe.lastUsedAt)}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
