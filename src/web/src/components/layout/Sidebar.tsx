import { NavLink } from 'react-router-dom'
import { Home, UtensilsCrossed, BookOpen, CalendarDays, ShoppingCart, X, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { User } from '@/types'

const navItems = [
  { to: '/', label: 'Oversigt', icon: Home },
  { to: '/meals', label: 'Madplan', icon: UtensilsCrossed },
  { to: '/recipes', label: 'Opskrifter', icon: BookOpen },
  { to: '/homework', label: 'Lektier', icon: GraduationCap },
  { to: '/calendar', label: 'Kalender', icon: CalendarDays },
  { to: '/groceries', label: 'Indkobsliste', icon: ShoppingCart },
]

interface SidebarProps {
  user: User | null
  onClose?: () => void
}

export default function Sidebar({ user, onClose }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center justify-between border-b px-6">
        <h1 className="text-lg font-semibold">Family Hub</h1>
        {onClose && (
          <button
            className="p-1 rounded-md hover:bg-accent"
            onClick={onClose}
            aria-label="Luk menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      {user && (
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{user.name}</span>
          </div>
        </div>
      )}
    </aside>
  )
}
