import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TaskList } from '@/components/homework/TaskList'
import { AddTaskDrawer } from '@/components/homework/AddTaskDrawer'
import { api } from '@/lib/api'
import type { HomeworkTask, Student } from '@/types'

export default function Homework() {
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<string>('all')
  const [showCompleted, setShowCompleted] = useState(false)

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => api.homework.getStudents(),
  })

  const { data: tasks = [], isLoading } = useQuery<HomeworkTask[]>({
    queryKey: ['homework', selectedStudent, showCompleted],
    queryFn: () =>
      api.homework.list({
        student: selectedStudent === 'all' ? undefined : selectedStudent,
        completed: showCompleted ? undefined : false,
      }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      api.homework.update(id, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.homework.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] })
    },
  })

  const handleEdit = (_task: HomeworkTask) => {
    // Could open edit dialog; tasks are editable via toggle/delete for now
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Homework</h1>
        <Button onClick={() => setDrawerOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label htmlFor="student-filter" className="text-sm whitespace-nowrap">
            Student:
          </Label>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger id="student-filter" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-completed"
            checked={showCompleted}
            onCheckedChange={(checked) => setShowCompleted(checked === true)}
          />
          <Label htmlFor="show-completed" className="text-sm">
            Show completed
          </Label>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          onToggleComplete={(id, completed) =>
            toggleMutation.mutate({ id, completed })
          }
          onDelete={(id) => deleteMutation.mutate(id)}
          onEdit={handleEdit}
        />
      )}

      <AddTaskDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        students={students}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ['homework'] })
        }
      />
    </div>
  )
}
