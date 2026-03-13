import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Plus, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { api } from '@/lib/api'
import type { User } from '@/types'

export default function Admin() {
  const queryClient = useQueryClient()

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
  })

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => api.admin.listUsers(),
    enabled: currentUser?.role === 'admin',
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { approved?: boolean; role?: string; name?: string } }) =>
      api.admin.updateUser(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const createUserMutation = useMutation({
    mutationFn: (input: { email: string; name: string; password?: string; role?: string }) =>
      api.admin.createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setNewEmail('')
      setNewName('')
      setNewPassword('')
      setNewRole('user')
    },
  })

  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('user')

  if (!currentUser) {
    return null
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <ShieldCheck className="h-12 w-12 text-muted-foreground opacity-30 mx-auto" />
          <p className="text-muted-foreground font-medium">Ingen adgang</p>
          <p className="text-sm text-muted-foreground">Du har ikke administratorrettigheder.</p>
        </div>
      </div>
    )
  }

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim() || !newName.trim()) return
    createUserMutation.mutate({
      email: newEmail.trim(),
      name: newName.trim(),
      password: newPassword.trim() || undefined,
      role: newRole,
    })
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ShieldCheck className="h-6 w-6" />
        Admin
      </h1>

      {/* Add user form */}
      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="text-base font-semibold">Tilføj bruger</h2>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="new-email">E-mail *</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="bruger@email.dk"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-name">Navn *</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Fuldt navn"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-password">Adgangskode (valgfrit)</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-role">Rolle</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger id="new-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Bruger</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              disabled={!newEmail.trim() || !newName.trim() || createUserMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Opret bruger
            </Button>
          </div>
        </form>
      </div>

      {/* Users table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="text-base font-semibold">Brugere ({users.length})</h2>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Ingen brugere fundet.</p>
        ) : (
          <div className="divide-y">
            {users.map(user => (
              <UserRow
                key={user.id}
                user={user}
                onUpdate={(input) => updateUserMutation.mutate({ id: user.id, input })}
                onDelete={() => deleteUserMutation.mutate(user.id)}
                isSelf={user.id === currentUser.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface UserRowProps {
  user: User
  onUpdate: (input: { approved?: boolean; role?: string; name?: string }) => void
  onDelete: () => void
  isSelf: boolean
}

function UserRow({ user, onUpdate, onDelete, isSelf }: UserRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 flex-wrap">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.name}</p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        {user.createdAt && (
          <p className="text-xs text-muted-foreground opacity-60">
            Oprettet: {new Date(user.createdAt).toLocaleDateString('da-DK')}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-1.5">
          <Checkbox
            id={`approved-${user.id}`}
            checked={user.approved}
            onCheckedChange={(checked) => onUpdate({ approved: !!checked })}
            disabled={isSelf}
          />
          <label htmlFor={`approved-${user.id}`} className="text-xs text-muted-foreground cursor-pointer">
            Godkendt
          </label>
        </div>

        <Select
          value={user.role}
          onValueChange={(v) => onUpdate({ role: v })}
          disabled={isSelf}
        >
          <SelectTrigger className="h-7 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Bruger</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>

        {user.role === 'admin' && (
          <Badge variant="secondary" className="text-xs shrink-0">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        )}

        {!isSelf && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            aria-label="Slet bruger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
