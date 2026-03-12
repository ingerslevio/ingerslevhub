import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  format,
  startOfWeek,
  parseISO,
  addDays,
  isBefore,
} from 'date-fns'
import { UtensilsCrossed, BookOpen, CalendarDays, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import type { Meal, HomeworkTask, CalendarEvent } from '@/types'

function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-4 w-full bg-muted animate-pulse rounded" />
        <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
        <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  )
}

const todayDayOfWeek = format(new Date(), 'EEEE').toLowerCase() as Meal['dayOfWeek']

export default function Dashboard() {
  const weekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    'yyyy-MM-dd'
  )

  const { data: mealPlan, isLoading: mealsLoading } = useQuery({
    queryKey: ['meals', weekStart],
    queryFn: () => api.meals.getWeek(weekStart),
  })

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['homework', 'upcoming'],
    queryFn: () => api.homework.list({ completed: false }),
  })

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['calendar', 'today'],
    queryFn: () =>
      api.calendar.getEvents(
        format(new Date(), 'yyyy-MM-dd'),
        format(addDays(new Date(), 1), 'yyyy-MM-dd')
      ),
  })

  const todayMeals =
    mealPlan?.meals?.filter((m) => m.dayOfWeek === todayDayOfWeek) ?? []

  const upcomingTasks =
    tasks?.filter((t) => {
      if (!t.dueDate) return true
      const due = parseISO(t.dueDate)
      return isBefore(due, addDays(new Date(), 7))
    }) ?? []

  const todayEvents = events ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Today's Meals */}
        {mealsLoading ? (
          <SkeletonCard />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                Today's Meals
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/meals">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {todayMeals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No meals planned for today
                </p>
              ) : (
                <div className="space-y-2">
                  {todayMeals.map((meal) => (
                    <div key={meal.id} className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {meal.mealType}
                      </Badge>
                      <span className="text-sm">{meal.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Homework */}
        {tasksLoading ? (
          <SkeletonCard />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Upcoming Homework
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/homework">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No upcoming homework
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm truncate">{task.title}</span>
                      {task.dueDate && (
                        <Badge variant="outline" className="text-xs ml-2 shrink-0">
                          {format(parseISO(task.dueDate), 'MMM d')}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {upcomingTasks.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{upcomingTasks.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Today's Events */}
        {eventsLoading ? (
          <SkeletonCard />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Today's Events
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/calendar">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {todayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No events today
                </p>
              ) : (
                <div className="space-y-2">
                  {todayEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(parseISO(event.start), 'h:mm a')}
                      </span>
                      <span className="text-sm truncate">{event.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
