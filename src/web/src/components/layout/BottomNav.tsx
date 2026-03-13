import { NavLink } from 'react-router-dom'
import { Home, UtensilsCrossed, BookOpen, CalendarDays, ShoppingCart, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/', label: 'Oversigt', icon: Home },
  { to: '/meals', label: 'Madplan', icon: UtensilsCrossed },
  { to: '/recipes', label: 'Opskrifter', icon: BookOpen },
  { to: '/homework', label: 'Lektier', icon: GraduationCap },
  { to: '/calendar', label: 'Kalender', icon: CalendarDays },
  { to: '/groceries', label: 'Indkøb', icon: ShoppingCart },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t bg-card md:hidden">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center py-2 text-xs',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )
          }
        >
          <Icon className="h-5 w-5 mb-0.5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
