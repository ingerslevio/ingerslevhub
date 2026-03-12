import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'

const DAYS = [
  { value: 'monday', label: 'Mandag' },
  { value: 'tuesday', label: 'Tirsdag' },
  { value: 'wednesday', label: 'Onsdag' },
  { value: 'thursday', label: 'Torsdag' },
  { value: 'friday', label: 'Fredag' },
  { value: 'saturday', label: 'Lordag' },
  { value: 'sunday', label: 'Sondag' },
]

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Morgenmad' },
  { value: 'lunch', label: 'Frokost' },
  { value: 'dinner', label: 'Aftensmad' },
]

interface AddMealDialogProps {
  open: boolean
  onClose: () => void
  initialDay?: string
  initialMealType?: string
  mealPlanId: string
  onSuccess: () => void
}

export function AddMealDialog({
  open,
  onClose,
  initialDay,
  initialMealType,
  mealPlanId,
  onSuccess,
}: AddMealDialogProps) {
  const [day, setDay] = useState(initialDay ?? 'monday')
  const [mealType, setMealType] = useState(initialMealType ?? 'breakfast')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      await api.meals.add({
        dayOfWeek: day as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
        mealType: mealType as 'breakfast' | 'lunch' | 'dinner',
        title: title.trim(),
        notes: notes.trim() || undefined,
      })
      setTitle('')
      setNotes('')
      onSuccess()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tilfoej maltid</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="day">Dag</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger id="day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mealType">Maltidstype</Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger id="mealType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((mt) => (
                    <SelectItem key={mt.value} value={mt.value}>
                      {mt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="f.eks. Pasta Bolognese"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Noter (valgfrit)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Yderligere noter..."
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuller
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Tilfoej maltid
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
