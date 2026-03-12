import { Pencil, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { HomeworkTask } from '@/types'

interface TaskCardProps {
  task: HomeworkTask
  onToggleComplete: () => void
  onDelete: () => void
  onEdit: () => void
}

export function TaskCard({
  task,
  onToggleComplete,
  onDelete,
  onEdit,
}: TaskCardProps) {
  const isOverdue =
    task.dueDate && !task.completed && new Date(task.dueDate) < new Date()

  return (
    <Card className="group relative p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggleComplete()}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'font-medium text-sm',
              task.completed && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {task.description}
            </p>
          )}
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {task.subject && (
              <Badge
                variant="secondary"
                className="text-xs"
                style={{ borderColor: task.subject.color }}
              >
                {task.subject.name}
              </Badge>
            )}
            {task.dueDate && (
              <Badge
                variant={isOverdue ? 'destructive' : 'outline'}
                className="text-xs"
              >
                {format(parseISO(task.dueDate), 'MMM d')}
              </Badge>
            )}
          </div>
        </div>
        <div className="hidden group-hover:flex gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
