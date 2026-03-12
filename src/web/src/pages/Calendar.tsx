import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { CalendarView } from '@/components/calendar/CalendarView'
import { api } from '@/lib/api'
import type { CalendarEvent } from '@/types'

interface GoogleCalendar {
  id: string
  summary: string
  primary?: boolean
}

export default function Calendar() {
  const queryClient = useQueryClient()
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [selectedCalId, setSelectedCalId] = useState<string>('')

  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd')
  const weekEndStr = format(addDays(currentWeekStart, 7), 'yyyy-MM-dd')

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => api.auth.me(),
  })

  const hasCalendar = !!user?.selectedCalendarId

  const { data: events = [], isLoading: eventsLoading } = useQuery<
    CalendarEvent[]
  >({
    queryKey: ['calendar', weekStartStr],
    queryFn: () => api.calendar.getEvents(weekStartStr, weekEndStr),
    enabled: hasCalendar,
  })

  const { data: calendars = [], isLoading: calendarsLoading } = useQuery<
    GoogleCalendar[]
  >({
    queryKey: ['calendars'],
    queryFn: () => api.calendar.listCalendars() as Promise<GoogleCalendar[]>,
    enabled: !hasCalendar,
  })

  const selectCalendarMutation = useMutation({
    mutationFn: (calendarId: string) =>
      api.calendar.selectCalendar(calendarId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
    },
  })

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  if (!hasCalendar) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Kalender</h1>
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-lg">Vaelg en kalender</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vaelg en Google Kalender at vise begivenheder fra.
            </p>
            {calendarsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Indlaeser kalendere...
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cal-select">Kalender</Label>
                  <Select value={selectedCalId} onValueChange={setSelectedCalId}>
                    <SelectTrigger id="cal-select">
                      <SelectValue placeholder="Vaelg en kalender" />
                    </SelectTrigger>
                    <SelectContent>
                      {calendars.map((cal) => (
                        <SelectItem key={cal.id} value={cal.id}>
                          {cal.summary}
                          {cal.primary ? ' (Primaer)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  disabled={
                    !selectedCalId || selectCalendarMutation.isPending
                  }
                  onClick={() => selectCalendarMutation.mutate(selectedCalId)}
                >
                  {selectCalendarMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Brug denne kalender
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kalender</h1>
        <Button variant="outline" size="sm" onClick={goToToday}>
          I dag
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
          Uge fra {format(currentWeekStart, 'MMMM d, yyyy')}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentWeekStart((d) => addWeeks(d, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {eventsLoading ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <CalendarView events={events} currentWeekStart={currentWeekStart} />
      )}
    </div>
  )
}
