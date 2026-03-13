import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { format, startOfWeek, addWeeks, subWeeks, getISOWeek, getISOWeekYear, startOfISOWeek } from 'date-fns'
import { da } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Trash2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RecipeBrowserDialog } from '@/components/meal-plan/RecipeBrowserDialog'
import { AddFromMealDialog } from '@/components/groceries/AddFromMealDialog'
import { api } from '@/lib/api'
import type { Recipe, Meal } from '@/types'

const DAYS = [
  { key: 'monday', label: 'Mandag' },
  { key: 'tuesday', label: 'Tirsdag' },
  { key: 'wednesday', label: 'Onsdag' },
  { key: 'thursday', label: 'Torsdag' },
  { key: 'friday', label: 'Fredag' },
  { key: 'saturday', label: 'Lørdag' },
  { key: 'sunday', label: 'Søndag' },
] as const

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'i dag'
  if (days === 1) return 'i går'
  return `${days} dage siden`
}

function formatWeekParam(date: Date): string {
  const week = getISOWeek(date)
  const year = getISOWeekYear(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function parseWeekParam(param: string): Date | null {
  const match = param.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return null
  const year = parseInt(match[1]!)
  const week = parseInt(match[2]!)
  // Find the Monday of that ISO week
  // ISO week 1 of a year is the week containing the first Thursday
  // Use a simple approach: find Jan 4 of the year (always in week 1), then offset
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = startOfISOWeek(jan4)
  const result = new Date(startOfWeek1)
  result.setDate(result.getDate() + (week - 1) * 7)
  return result
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [recipeBrowserDay, setRecipeBrowserDay] = useState<string | null>(null)
  const [addToListMeal, setAddToListMeal] = useState<Meal | null>(null)

  const weekParam = searchParams.get('uge')

  const currentWeekStart = weekParam
    ? (parseWeekParam(weekParam) ?? startOfWeek(new Date(), { weekStartsOn: 1 }))
    : startOfWeek(new Date(), { weekStartsOn: 1 })

  const weekKey = format(currentWeekStart, 'yyyy-MM-dd')
  const weekNumber = getISOWeek(currentWeekStart)
  const weekYear = getISOWeekYear(currentWeekStart)

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
        personCount: recipe.servings ?? undefined,
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

  const goToPrevWeek = () => {
    const prev = subWeeks(currentWeekStart, 1)
    setSearchParams({ uge: formatWeekParam(prev) })
  }

  const goToNextWeek = () => {
    const next = addWeeks(currentWeekStart, 1)
    setSearchParams({ uge: formatWeekParam(next) })
  }

  const goToToday = () => {
    setSearchParams({})
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Madplan</h1>
        <Button variant="outline" size="sm" onClick={goToToday}>
          I dag
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={goToPrevWeek}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium min-w-[200px] text-center">
          Uge {weekNumber} · {weekYear}
        </span>
        <Button variant="ghost" size="icon" onClick={goToNextWeek}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center -mt-3">
        {format(currentWeekStart, 'd. MMMM yyyy', { locale: da })}
      </p>

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
                          onAddToList={
                            dinner.recipe?.ingredients && dinner.recipe.ingredients !== '[]'
                              ? () => setAddToListMeal(dinner)
                              : undefined
                          }
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

      {addToListMeal !== null && (
        <AddFromMealDialog
          open={true}
          onClose={() => setAddToListMeal(null)}
          meal={addToListMeal}
        />
      )}
    </div>
  )
}

interface DinnerRowProps {
  meal: Meal
  onDelete: () => void
  onRate: (mealId: string, rating: number) => void
  onAddToList?: (meal: Meal) => void
}

function DinnerRow({ meal, onDelete, onRate, onAddToList }: DinnerRowProps) {
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
      {onAddToList && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => onAddToList(meal)}
          title="Tilføj til indkøbsliste"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
        </Button>
      )}
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
