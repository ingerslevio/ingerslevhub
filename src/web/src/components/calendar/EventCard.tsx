import { format, parseISO } from 'date-fns'
import { Card } from '@/components/ui/card'
import type { CalendarEvent } from '@/types'

interface EventCardProps {
  event: CalendarEvent
}

export function EventCard({ event }: EventCardProps) {
  const start = parseISO(event.start)
  const end = parseISO(event.end)

  return (
    <Card className="p-2 border-l-4 border-l-primary bg-primary/5">
      <p className="font-medium text-sm truncate">{event.title}</p>
      <p className="text-xs text-muted-foreground">
        {format(start, 'h:mm a')} - {format(end, 'h:mm a')}
      </p>
    </Card>
  )
}
