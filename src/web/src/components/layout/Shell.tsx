import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import type { User } from '@/types'

interface ShellProps {
  children: ReactNode
  title: string
  user: User | null
}

export default function Shell({ children, title, user }: ShellProps) {
  return (
    <div className="flex h-screen">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} user={user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
