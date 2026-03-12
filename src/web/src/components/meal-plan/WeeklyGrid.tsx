import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MealCard } from './MealCard'
import type { Meal, MealPlan } from '@/types'

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

interface WeeklyGridProps {
  mealPlan: MealPlan | undefined
  onAddMeal: (day: string, mealType: string) => void
  onDeleteMeal: (id: string) => void
  onEditMeal: (meal: Meal) => void
}

export function WeeklyGrid({
  mealPlan,
  onAddMeal,
  onDeleteMeal,
  onEditMeal,
}: WeeklyGridProps) {
  const getMeals = (day: string, mealType: string): Meal[] => {
    if (!mealPlan?.meals) return []
    return mealPlan.meals.filter(
      (m) => m.dayOfWeek === day && m.mealType === mealType
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header row */}
        <div className="grid grid-cols-8 gap-1 mb-1">
          <div className="p-2 font-medium text-sm text-muted-foreground" />
          {DAYS.map((day) => (
            <div
              key={day}
              className="p-2 text-center font-semibold text-sm bg-muted rounded"
            >
              {DAY_LABELS[day]}
            </div>
          ))}
        </div>

        {/* Meal rows */}
        {MEAL_TYPES.map((mealType) => (
          <div key={mealType} className="grid grid-cols-8 gap-1 mb-1">
            <div className="p-2 font-medium text-sm text-muted-foreground flex items-start pt-3">
              {MEAL_TYPE_LABELS[mealType]}
            </div>
            {DAYS.map((day) => {
              const meals = getMeals(day, mealType)
              return (
                <div
                  key={`${day}-${mealType}`}
                  className="min-h-[80px] p-1 border rounded bg-card flex flex-col gap-1"
                >
                  {meals.map((meal) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      onEdit={() => onEditMeal(meal)}
                      onDelete={() => onDeleteMeal(meal.id)}
                    />
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-full text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => onAddMeal(day, mealType)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
