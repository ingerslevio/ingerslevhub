import { ClipboardList } from 'lucide-react'
import { TaskCard } from './TaskCard'
import type { HomeworkTask } from '@/types'

interface TaskListProps {
  tasks: HomeworkTask[]
  onToggleComplete: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  onEdit: (task: HomeworkTask) => void
}

export function TaskList({
  tasks,
  onToggleComplete,
  onDelete,
  onEdit,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ClipboardList className="h-12 w-12 mb-3" />
        <p className="text-lg font-medium">No tasks</p>
        <p className="text-sm">Add a task to get started</p>
      </div>
    )
  }

  const grouped = tasks.reduce<Record<string, HomeworkTask[]>>((acc, task) => {
    const studentName = task.student?.name ?? 'Unknown Student'
    if (!acc[studentName]) acc[studentName] = []
    acc[studentName].push(task)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([studentName, studentTasks]) => {
        const color = studentTasks[0]?.student?.color ?? '#888'
        return (
          <div key={studentName}>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <h3 className="font-semibold text-sm">{studentName}</h3>
              <span className="text-xs text-muted-foreground">
                ({studentTasks.length})
              </span>
            </div>
            <div className="space-y-2 pl-5">
              {studentTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={() =>
                    onToggleComplete(task.id, !task.completed)
                  }
                  onDelete={() => onDelete(task.id)}
                  onEdit={() => onEdit(task)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
