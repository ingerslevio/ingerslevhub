import { addDays, format, isSameDay, parseISO } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { EventCard } from './EventCard'
import type { CalendarEvent } from '@/types'

interface CalendarViewProps {
  events: CalendarEvent[]
  currentWeekStart: Date
}

export function CalendarView({ events, currentWeekStart }: CalendarViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return events
      .filter((event) => isSameDay(parseISO(event.start), day))
      .sort(
        (a, b) =>
          new Date(a.start).getTime() - new Date(b.start).getTime()
      )
  }

  const hasAnyEvents = events.length > 0

  if (!hasAnyEvents) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <CalendarDays className="h-12 w-12 mb-3" />
        <p className="text-lg font-medium">No events this week</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const dayEvents = getEventsForDay(day)
        const isToday = isSameDay(day, new Date())
        return (
          <div key={day.toISOString()} className="min-h-[120px]">
            <div
              className={`text-center text-sm font-semibold p-2 rounded mb-1 ${
                isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              <div>{format(day, 'EEE')}</div>
              <div className="text-xs font-normal">{format(day, 'MMM d')}</div>
            </div>
            <div className="space-y-1">
              {dayEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
