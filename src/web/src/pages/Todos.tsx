import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, isToday, isTomorrow, isPast, parseISO, addDays } from 'date-fns'
import { da } from 'date-fns/locale'
import { Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import type { Todo, RecurringTodo } from '@/types'
import { cn } from '@/lib/utils'

const PRIORITY_COLORS: Record<string, string> = { low: 'bg-slate-100 text-slate-600', medium: 'bg-amber-100 text-amber-700', high: 'bg-red-100 text-red-700' }
const PRIORITY_LABELS: Record<string, string> = { low: 'Lav', medium: 'Middel', high: 'Høj' }
const FREQ_LABELS: Record<string, string> = { daily: 'Dagligt', weekly: 'Ugentligt', monthly: 'Månedligt', custom: 'Brugerdefineret' }

function formatDueDate(dueDate: string | null | undefined): string | null {
  if (!dueDate) return null
  const d = parseISO(dueDate)
  if (isToday(d)) return 'I dag'
  if (isTomorrow(d)) return 'I morgen'
  if (isPast(d)) return `Forfalden: ${format(d, 'd. MMM', { locale: da })}`
  return format(d, 'd. MMM', { locale: da })
}

function dueDateClass(dueDate: string | null | undefined): string {
  if (!dueDate) return 'text-muted-foreground'
  const d = parseISO(dueDate)
  if (isPast(d) && !isToday(d)) return 'text-destructive font-medium'
  if (isToday(d)) return 'text-amber-600 font-medium'
  return 'text-muted-foreground'
}

// ── Todo row ────────────────────────────────────────────────────────────────

interface TodoRowProps {
  todo: Todo
  onUpdate: (id: string, data: Parameters<typeof api.todos.update>[1]) => void
  onDelete: (id: string) => void
}

function TodoRow({ todo, onUpdate, onDelete }: TodoRowProps) {
  const [expanded, setExpanded] = useState(false)
  const dueDateLabel = formatDueDate(todo.dueDate)

  return (
    <div className={cn('border-b last:border-b-0', todo.done && 'opacity-60')}>
      <div className="flex items-start gap-2 py-2 px-3">
        <Checkbox
          className="mt-0.5 shrink-0"
          checked={todo.done}
          onCheckedChange={v => onUpdate(todo.id, { done: !!v })}
        />
        <button className="flex-1 text-left min-w-0" onClick={() => setExpanded(v => !v)}>
          <p className={cn('text-sm', todo.done && 'line-through')}>{todo.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {dueDateLabel && (
              <span className={cn('text-xs', dueDateClass(todo.dueDate))}>{dueDateLabel}</span>
            )}
            {todo.priority !== 'medium' && (
              <span className={cn('text-xs px-1.5 py-0.5 rounded', PRIORITY_COLORS[todo.priority])}>
                {PRIORITY_LABELS[todo.priority]}
              </span>
            )}
            {todo.assignedTo && (
              <span className="text-xs text-muted-foreground">{todo.assignedTo}</span>
            )}
            {todo.recurringTodoId && (
              <RotateCcw className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </button>
        <button
          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0"
          onClick={() => onDelete(todo.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {expanded && todo.description && (
        <div className="pl-9 pr-3 pb-2 text-xs text-muted-foreground">{todo.description}</div>
      )}
    </div>
  )
}

// ── Add todo form ────────────────────────────────────────────────────────────

interface AddTodoFormProps {
  onAdd: (data: { title: string; dueDate?: string; priority?: 'low'|'medium'|'high'; assignedTo?: string }) => void
  isPending: boolean
}

function AddTodoForm({ onAdd, isPending }: AddTodoFormProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<'low'|'medium'|'high'>('medium')
  const [assignedTo, setAssignedTo] = useState('')
  const [expanded, setExpanded] = useState(false)

  const submit = () => {
    if (!title.trim()) return
    onAdd({
      title: title.trim(),
      dueDate: dueDate || undefined,
      priority: priority === 'medium' ? undefined : priority,
      assignedTo: assignedTo.trim() || undefined,
    })
    setTitle('')
    setDueDate('')
    setPriority('medium')
    setAssignedTo('')
    setExpanded(false)
  }

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex gap-2">
        <Input
          className="h-8 text-sm flex-1"
          placeholder="Tilføj opgave..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) submit() }}
        />
        <button
          className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <Button size="sm" className="h-8 shrink-0" disabled={!title.trim() || isPending} onClick={submit}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Tilføj
        </Button>
      </div>
      {expanded && (
        <div className="flex gap-2 flex-wrap pt-1">
          <div className="space-y-1">
            <Label className="text-xs">Forfaldsdato</Label>
            <Input type="date" className="h-7 text-xs w-36" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Prioritet</Label>
            <Select value={priority} onValueChange={v => setPriority(v as 'low'|'medium'|'high')}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Lav</SelectItem>
                <SelectItem value="medium">Middel</SelectItem>
                <SelectItem value="high">Høj</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tildelt til</Label>
            <Input className="h-7 text-xs w-32" placeholder="Navn..." value={assignedTo} onChange={e => setAssignedTo(e.target.value)} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add recurring form ───────────────────────────────────────────────────────

interface AddRecurringFormProps {
  onAdd: (data: { title: string; frequency: 'daily'|'weekly'|'monthly'|'custom'; intervalDays?: number; firstDueDate?: string; priority?: 'low'|'medium'|'high'; assignedTo?: string }) => void
  isPending: boolean
}

function AddRecurringForm({ onAdd, isPending }: AddRecurringFormProps) {
  const [title, setTitle] = useState('')
  const [frequency, setFrequency] = useState<'daily'|'weekly'|'monthly'|'custom'>('weekly')
  const [intervalDays, setIntervalDays] = useState('')
  const [firstDueDate, setFirstDueDate] = useState('')
  const [priority, setPriority] = useState<'low'|'medium'|'high'>('medium')
  const [assignedTo, setAssignedTo] = useState('')

  const submit = () => {
    if (!title.trim()) return
    onAdd({
      title: title.trim(),
      frequency,
      intervalDays: frequency === 'custom' && intervalDays ? parseInt(intervalDays) : undefined,
      firstDueDate: firstDueDate || undefined,
      priority: priority === 'medium' ? undefined : priority,
      assignedTo: assignedTo.trim() || undefined,
    })
    setTitle('')
    setFrequency('weekly')
    setIntervalDays('')
    setFirstDueDate('')
    setPriority('medium')
    setAssignedTo('')
  }

  return (
    <div className="space-y-2">
      <Input className="h-8 text-sm" placeholder="Opgavetitel..." value={title} onChange={e => setTitle(e.target.value)} />
      <div className="flex gap-2 flex-wrap">
        <Select value={frequency} onValueChange={v => setFrequency(v as 'daily'|'weekly'|'monthly'|'custom')}>
          <SelectTrigger className="h-7 text-xs w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Dagligt</SelectItem>
            <SelectItem value="weekly">Ugentligt</SelectItem>
            <SelectItem value="monthly">Månedligt</SelectItem>
            <SelectItem value="custom">Brugerdefineret</SelectItem>
          </SelectContent>
        </Select>
        {frequency === 'custom' && (
          <Input className="h-7 text-xs w-24" placeholder="Dage" type="number" min="1" value={intervalDays} onChange={e => setIntervalDays(e.target.value)} />
        )}
        <Input type="date" className="h-7 text-xs w-36" value={firstDueDate} onChange={e => setFirstDueDate(e.target.value)} placeholder="Første frist" />
        <Input className="h-7 text-xs w-28" placeholder="Tildelt" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} />
      </div>
      <Button size="sm" className="h-7 text-xs" disabled={!title.trim() || isPending} onClick={submit}>
        <Plus className="h-3 w-3 mr-1" /> Opret
      </Button>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function Todos() {
  const queryClient = useQueryClient()
  const [showDone, setShowDone] = useState(false)
  const [showRecurring, setShowRecurring] = useState(false)

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['todos', 'pending'],
    queryFn: () => api.todos.list(false),
  })

  const { data: doneTodos = [] } = useQuery({
    queryKey: ['todos', 'done'],
    queryFn: () => api.todos.list(true),
    enabled: showDone,
  })

  const { data: recurring = [] } = useQuery<RecurringTodo[]>({
    queryKey: ['todos', 'recurring'],
    queryFn: () => api.todos.listRecurring(),
    enabled: showRecurring,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.todos.update>[1] }) =>
      api.todos.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['todos', 'done'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.todos.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['todos', 'done'] })
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.todos.create>[0]) => api.todos.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos', 'pending'] }),
  })

  const createRecurringMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.todos.createRecurring>[0]) => api.todos.createRecurring(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['todos', 'recurring'] })
    },
  })

  const deleteRecurringMutation = useMutation({
    mutationFn: (id: string) => api.todos.deleteRecurring(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['todos', 'recurring'] })
    },
  })

  const handleUpdate = (id: string, data: Parameters<typeof api.todos.update>[1]) => {
    updateMutation.mutate({ id, data })
  }

  const handleDelete = (id: string) => deleteMutation.mutate(id)

  // Group todos: today, upcoming (7 days), later, overdue
  const { overdue, today, upcoming, later } = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const in7days = addDays(now, 7).toISOString().slice(0, 10)
    const groups = { overdue: [] as Todo[], today: [] as Todo[], upcoming: [] as Todo[], later: [] as Todo[] }
    for (const todo of todos) {
      if (!todo.dueDate) { groups.later.push(todo); continue }
      if (todo.dueDate < todayStr) groups.overdue.push(todo)
      else if (todo.dueDate === todayStr) groups.today.push(todo)
      else if (todo.dueDate <= in7days) groups.upcoming.push(todo)
      else groups.later.push(todo)
    }
    return groups
  }, [todos])

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Opgaver</h1>
        <Button variant="outline" size="sm" onClick={() => setShowRecurring(v => !v)}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Tilbagevendende
        </Button>
      </div>

      <AddTodoForm onAdd={d => createMutation.mutate(d)} isPending={createMutation.isPending} />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-destructive uppercase tracking-wide mb-1 px-1">Forfaldne ({overdue.length})</p>
              <div className="border rounded-lg overflow-hidden">
                {overdue.map(t => <TodoRow key={t.id} todo={t} onUpdate={handleUpdate} onDelete={handleDelete} />)}
              </div>
            </div>
          )}

          {today.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1 px-1">I dag ({today.length})</p>
              <div className="border rounded-lg overflow-hidden">
                {today.map(t => <TodoRow key={t.id} todo={t} onUpdate={handleUpdate} onDelete={handleDelete} />)}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 px-1">Denne uge ({upcoming.length})</p>
              <div className="border rounded-lg overflow-hidden">
                {upcoming.map(t => <TodoRow key={t.id} todo={t} onUpdate={handleUpdate} onDelete={handleDelete} />)}
              </div>
            </div>
          )}

          {later.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 px-1">Senere ({later.length})</p>
              <div className="border rounded-lg overflow-hidden">
                {later.map(t => <TodoRow key={t.id} todo={t} onUpdate={handleUpdate} onDelete={handleDelete} />)}
              </div>
            </div>
          )}

          {todos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Ingen opgaver i gang</p>
          )}
        </div>
      )}

      {/* Done section */}
      <button
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-full"
        onClick={() => setShowDone(v => !v)}
      >
        {showDone ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        Fuldforte opgaver
      </button>
      {showDone && doneTodos.length > 0 && (
        <div className="border rounded-lg overflow-hidden opacity-60">
          {doneTodos.slice(0, 20).map(t => <TodoRow key={t.id} todo={t} onUpdate={handleUpdate} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Recurring section */}
      {showRecurring && (
        <div className="border rounded-lg p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Tilbagevendende opgaver
          </p>
          <AddRecurringForm onAdd={d => createRecurringMutation.mutate(d)} isPending={createRecurringMutation.isPending} />
          {recurring.length > 0 && (
            <div className="space-y-1 pt-2 border-t">
              {recurring.map(r => (
                <div key={r.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{FREQ_LABELS[r.frequency]}{r.intervalDays ? ` · ${r.intervalDays} dage` : ''}{r.assignedTo ? ` · ${r.assignedTo}` : ''}</p>
                  </div>
                  <button
                    className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteRecurringMutation.mutate(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
