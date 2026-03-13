import { LogOut, Menu, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { api } from '@/lib/api'
import type { User } from '@/types'

interface HeaderProps {
  title: string
  user: User | null
  onMenuClick?: () => void
}

export default function Header({ title, user, onMenuClick }: HeaderProps) {
  const handleLogout = async () => {
    await api.auth.logout()
    window.location.href = '/login'
  }

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div className="flex items-center">
        {onMenuClick && (
          <button
            className="md:hidden mr-3 p-1 rounded-md hover:bg-accent"
            onClick={onMenuClick}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.name}</span>
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="icon" asChild aria-label="Indstillinger">
            <Link to="/settings"><Settings className="h-4 w-4" /></Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log ud">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </header>
  )
}
