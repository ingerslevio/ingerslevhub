import { Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Meal } from '@/types'

interface MealCardProps {
  meal: Meal
  onEdit: () => void
  onDelete: () => void
}

export function MealCard({ meal, onEdit, onDelete }: MealCardProps) {
  return (
    <Card className="group relative p-2 text-sm hover:shadow-md transition-shadow">
      <p className="font-medium truncate pr-12">{meal.title}</p>
      {meal.notes && (
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {meal.notes}
        </p>
      )}
      <div className="absolute right-1 top-1 hidden group-hover:flex gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  )
}
