import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
  const [selectedCalIds, setSelectedCalIds] = useState<string[]>([])
  const [savedCalIds, setSavedCalIds] = useState<string[]>([])
  const [calAuthError, setCalAuthError] = useState(false)

  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd')
  const weekEndStr = format(addDays(currentWeekStart, 7), 'yyyy-MM-dd')

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const u = await api.auth.me()
      try {
        const stored = typeof u.selectedCalendarIds === 'string'
          ? JSON.parse(u.selectedCalendarIds) as string[]
          : []
        if (Array.isArray(stored) && stored.length > 0) {
          setSavedCalIds(stored)
          setSelectedCalIds(stored)
        } else if (u.selectedCalendarId) {
          setSavedCalIds([u.selectedCalendarId])
          setSelectedCalIds([u.selectedCalendarId])
        }
      } catch {
        if (u.selectedCalendarId) {
          setSavedCalIds([u.selectedCalendarId])
          setSelectedCalIds([u.selectedCalendarId])
        }
      }
      return u
    },
  })
  // user is read to ensure the query runs; calendar IDs are extracted in queryFn
  void user

  const hasCalendars = savedCalIds.length > 0

  const { data: events = [], isLoading: eventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar', weekStartStr, savedCalIds.join(',')],
    queryFn: () => api.calendar.getEvents(weekStartStr, weekEndStr),
    enabled: hasCalendars,
  })

  const {
    data: calendars = [],
    isLoading: calendarsLoading,
    isError: calendarsError,
  } = useQuery<GoogleCalendar[]>({
    queryKey: ['calendars'],
    queryFn: async () => {
      try {
        const result = await api.calendar.listCalendars() as GoogleCalendar[]
        setCalAuthError(false)
        return result
      } catch (err: unknown) {
        const axiosError = err as { response?: { status?: number; data?: { code?: string } } }
        const status = axiosError?.response?.status
        if (status === 401 || status === 403) {
          setCalAuthError(true)
        }
        throw err
      }
    },
    retry: false,
  })

  const selectCalendarsMutation = useMutation({
    mutationFn: (ids: string[]) => api.calendar.selectCalendars(ids),
    onSuccess: (_, ids) => {
      setSavedCalIds(ids)
      queryClient.invalidateQueries({ queryKey: ['user'] })
      queryClient.invalidateQueries({ queryKey: ['calendar'] })
    },
  })

  const toggleCalendar = (id: string) => {
    setSelectedCalIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kalender</h1>
        <Button variant="outline" size="sm" onClick={goToToday}>
          I dag
        </Button>
      </div>

      {/* Calendar selector panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vaelg kalendere</CardTitle>
        </CardHeader>
        <CardContent>
          {calAuthError ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Din Google Kalender-forbindelse er udloebet.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { window.location.href = '/api/auth/google' }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tilslut Google Kalender igen
              </Button>
            </div>
          ) : calendarsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Indlaeser kalendere...
            </div>
          ) : calendarsError && !calAuthError ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Kunne ikke indlaeser dine Google Kalendere.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { window.location.href = '/api/auth/google' }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tilslut Google Kalender igen
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                {calendars.map(cal => (
                  <div key={cal.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`cal-${cal.id}`}
                      checked={selectedCalIds.includes(cal.id)}
                      onCheckedChange={() => toggleCalendar(cal.id)}
                    />
                    <Label htmlFor={`cal-${cal.id}`} className="text-sm cursor-pointer">
                      {cal.summary}
                      {cal.primary && (
                        <span className="ml-1 text-xs text-muted-foreground">(Primaer)</span>
                      )}
                    </Label>
                  </div>
                ))}
                {calendars.length === 0 && (
                  <p className="text-sm text-muted-foreground">Ingen kalendere fundet.</p>
                )}
              </div>
              {calendars.length > 0 && (
                <Button
                  size="sm"
                  disabled={selectedCalIds.length === 0 || selectCalendarsMutation.isPending}
                  onClick={() => selectCalendarsMutation.mutate(selectedCalIds)}
                >
                  {selectCalendarsMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Brug valgte kalendere
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Week navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentWeekStart(d => subWeeks(d, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium min-w-[180px] text-center">
          Uge fra {format(currentWeekStart, 'MMMM d, yyyy')}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentWeekStart(d => addWeeks(d, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {!hasCalendars && !eventsLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Vaelg en eller flere kalendere ovenfor for at vise begivenheder.
        </p>
      )}

      {eventsLoading ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : hasCalendars ? (
        <CalendarView events={events} currentWeekStart={currentWeekStart} />
      ) : null}
    </div>
  )
}
