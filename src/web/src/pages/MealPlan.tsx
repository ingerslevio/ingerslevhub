import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { da } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RecipeBrowserDialog } from '@/components/meal-plan/RecipeBrowserDialog'
import { api } from '@/lib/api'
import type { Recipe } from '@/types'

const DAYS = [
  { key: 'monday', label: 'Mandag' },
  { key: 'tuesday', label: 'Tirsdag' },
  { key: 'wednesday', label: 'Onsdag' },
  { key: 'thursday', label: 'Torsdag' },
  { key: 'friday', label: 'Fredag' },
  { key: 'saturday', label: 'Lordag' },
  { key: 'sunday', label: 'Sondag' },
] as const

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
      api.meals.add({ dayOfWeek: day as any, mealType: 'dinner', title: recipe.name, mealPlanId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meals', weekKey] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.meals.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meals', weekKey] }),
  })

  const handleRecipeSelected = useCallback((recipe: Recipe) => {
    if (!recipeBrowserDay || !mealPlan?.id) return
    addMealMutation.mutate({ day: recipeBrowserDay, recipe, mealPlanId: mealPlan.id })
    setRecipeBrowserDay(null)
  }, [recipeBrowserDay, mealPlan?.id, addMealMutation])

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
            const dinner = mealPlan?.meals.find(m => m.dayOfWeek === key && m.mealType === 'dinner')
            return (
              <Card key={key}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-28 shrink-0">
                    <p className="font-semibold text-sm">{label}</p>
                  </div>
                  <div className="flex-1">
                    {dinner ? (
                      <div className="flex items-center gap-2">
                        <UtensilsCrossed className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm">{dinner.title}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Ingen aftensmad planlagt</span>
                    )}
                  </div>
                  {dinner ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(dinner.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRecipeBrowserDay(key)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Tilfoej aftensmad
                    </Button>
                  )}
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
