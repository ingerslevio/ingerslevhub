import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WeeklyGrid } from '@/components/meal-plan/WeeklyGrid'
import { AddMealDialog } from '@/components/meal-plan/AddMealDialog'
import { api } from '@/lib/api'
import type { Meal } from '@/types'

export default function MealPlan() {
  const queryClient = useQueryClient()
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDay, setDialogDay] = useState<string | undefined>()
  const [dialogMealType, setDialogMealType] = useState<string | undefined>()

  const weekKey = format(currentWeekStart, 'yyyy-MM-dd')

  const { data: mealPlan, isLoading } = useQuery({
    queryKey: ['meals', weekKey],
    queryFn: () => api.meals.getWeek(weekKey),
  })

  const deleteMutation = useMutation({
    mutationFn: (mealId: string) => api.meals.delete(mealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', weekKey] })
    },
  })

  const handleAddMeal = useCallback((day: string, mealType: string) => {
    setDialogDay(day)
    setDialogMealType(mealType)
    setDialogOpen(true)
  }, [])

  const handleEditMeal = useCallback((_meal: Meal) => {
    // Edit reuses the add dialog; could be extended with pre-fill
  }, [])

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meal Plan</h1>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentWeekStart((d) => subWeeks(d, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium min-w-[180px] text-center">
          Week of {format(currentWeekStart, 'MMMM d, yyyy')}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentWeekStart((d) => addWeeks(d, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-muted animate-pulse rounded"
            />
          ))}
        </div>
      ) : (
        <WeeklyGrid
          mealPlan={mealPlan}
          onAddMeal={handleAddMeal}
          onDeleteMeal={(id) => deleteMutation.mutate(id)}
          onEditMeal={handleEditMeal}
        />
      )}

      <AddMealDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialDay={dialogDay}
        initialMealType={dialogMealType}
        mealPlanId={mealPlan?.id ?? ''}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ['meals', weekKey] })
        }
      />
    </div>
  )
}
