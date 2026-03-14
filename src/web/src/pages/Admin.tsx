import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Plus, ShieldCheck, Key, Copy, Check, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { api } from '@/lib/api'
import type { User, ApiKey, Family, Student } from '@/types'

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

  const { data: families = [] } = useQuery<Family[]>({
    queryKey: ['admin', 'families'],
    queryFn: () => api.admin.listFamilies(),
    enabled: currentUser?.role === 'admin',
  })

  const { data: allStudents = [] } = useQuery<Student[]>({
    queryKey: ['admin', 'students'],
    queryFn: () => api.admin.listStudents(),
    enabled: currentUser?.role === 'admin',
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: { approved?: boolean; role?: string; name?: string; password?: string } }) =>
      api.admin.updateUser(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  })

  const createUserMutation = useMutation({
    mutationFn: (input: { email: string; name: string; password?: string; role?: string }) =>
      api.admin.createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      setNewEmail('')
      setNewName('')
      setNewPassword('')
      setNewRole('user')
    },
  })

  const changeFamilyMutation = useMutation({
    mutationFn: ({ familyId, userId }: { familyId: string; userId: string }) =>
      api.admin.addFamilyMember(familyId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'families'] }),
  })

  const linkStudentMutation = useMutation({
    mutationFn: ({ studentId, userId }: { studentId: string; userId: string }) =>
      api.admin.linkStudentToUser(studentId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'students'] }),
  })

  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('user')

  const { data: apiKeys = [] } = useQuery<ApiKey[]>({
    queryKey: ['admin', 'api-keys'],
    queryFn: () => api.admin.listApiKeys(),
    enabled: currentUser?.role === 'admin',
  })

  const createApiKeyMutation = useMutation({
    mutationFn: (input: { name: string; userId: string }) => api.admin.createApiKey(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'api-keys'] })
      setNewKeyName('')
      setNewKeyUserId('')
    },
  })

  const deleteApiKeyMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteApiKey(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'api-keys'] }),
  })

  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyUserId, setNewKeyUserId] = useState('')
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  const copyKey = (key: string, id: string) => {
    void navigator.clipboard.writeText(key)
    setCopiedKeyId(id)
    setTimeout(() => setCopiedKeyId(null), 2000)
  }

  // Build a userId -> familyName lookup
  const userFamilyMap = new Map<string, { familyId: string; familyName: string }>()
  for (const f of families) {
    for (const m of f.members) {
      userFamilyMap.set(m.userId, { familyId: f.id, familyName: f.name })
    }
  }

  // Build userId -> student lookup
  const userStudentMap = new Map<string, Student>()
  for (const s of allStudents) {
    if (s.userId) userStudentMap.set(s.userId, s)
  }

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
                families={families}
                allStudents={allStudents}
                currentFamily={userFamilyMap.get(user.id)}
                linkedStudent={userStudentMap.get(user.id)}
                onUpdate={(input) => updateUserMutation.mutate({ id: user.id, input })}
                onDelete={() => deleteUserMutation.mutate(user.id)}
                onChangeFamily={(familyId) => changeFamilyMutation.mutate({ familyId, userId: user.id })}
                onLinkStudent={(studentId) => linkStudentMutation.mutate({ studentId, userId: user.id })}
                isSelf={user.id === currentUser.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* API Keys section */}
      <div className="border rounded-lg overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex items-center gap-2">
          <Key className="h-4 w-4" />
          <h2 className="text-base font-semibold">API Nogler til bots ({apiKeys.length})</h2>
        </div>

        {/* Create new key form */}
        <div className="p-4 border-b space-y-3">
          <p className="text-sm font-medium">Opret ny API nogle</p>
          <div className="flex gap-2 flex-wrap">
            <Input
              className="h-8 text-sm flex-1 min-w-40"
              placeholder="Navn (fx 'Home Assistant')"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newKeyName.trim() && newKeyUserId) createApiKeyMutation.mutate({ name: newKeyName.trim(), userId: newKeyUserId }) }}
            />
            <Select value={newKeyUserId} onValueChange={setNewKeyUserId}>
              <SelectTrigger className="h-8 text-sm w-48">
                <SelectValue placeholder="Vaelg bruger" />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8"
              disabled={!newKeyName.trim() || !newKeyUserId || createApiKeyMutation.isPending}
              onClick={() => createApiKeyMutation.mutate({ name: newKeyName.trim(), userId: newKeyUserId })}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Opret
            </Button>
          </div>
        </div>

        {/* Keys list */}
        {apiKeys.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Ingen API nogler oprettet endnu.</p>
        ) : (
          <div className="divide-y">
            {apiKeys.map(k => (
              <div key={k.id} className="flex items-center gap-3 p-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {users.find(u => u.id === k.userId)?.name ?? k.userId}
                    {' · '}
                    {new Date(k.createdAt).toLocaleDateString('da-DK')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{k.key.slice(0, 8)}...</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => copyKey(k.key, k.id)}
                    title="Kopier nogle"
                  >
                    {copiedKeyId === k.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteApiKeyMutation.mutate(k.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface UserRowProps {
  user: User
  families: Family[]
  allStudents: Student[]
  currentFamily?: { familyId: string; familyName: string }
  linkedStudent?: Student
  onUpdate: (input: { approved?: boolean; role?: string; name?: string; password?: string }) => void
  onDelete: () => void
  onChangeFamily: (familyId: string) => void
  onLinkStudent: (studentId: string) => void
  isSelf: boolean
}

function UserRow({ user, families, allStudents, currentFamily, linkedStudent, onUpdate, onDelete, onChangeFamily, onLinkStudent, isSelf }: UserRowProps) {
  const [newPassword, setNewPassword] = useState('')
  const [showPasswordInput, setShowPasswordInput] = useState(false)

  const handleSetPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword.trim()) return
    onUpdate({ password: newPassword.trim() })
    setNewPassword('')
    setShowPasswordInput(false)
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
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

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={() => setShowPasswordInput(v => !v)}
            aria-label="Saet adgangskode"
            title="Saet adgangskode"
          >
            <Key className="h-3.5 w-3.5" />
          </Button>

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

      {/* Family assignment */}
      <div className="flex items-center gap-2 flex-wrap">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Familie:</span>
        <Select
          value={currentFamily?.familyId ?? '_none'}
          onValueChange={(v) => { if (v !== '_none') onChangeFamily(v) }}
        >
          <SelectTrigger className="h-7 w-48 text-xs">
            <SelectValue placeholder="Ingen familie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none" disabled>Ingen familie</SelectItem>
            {families.map(f => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentFamily && (
          <span className="text-xs text-muted-foreground">({currentFamily.familyName})</span>
        )}
      </div>

      {/* Student link */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Elev:</span>
        <Select
          value={linkedStudent?.id ?? '_none'}
          onValueChange={(v) => { if (v !== '_none') onLinkStudent(v) }}
        >
          <SelectTrigger className="h-7 w-48 text-xs">
            <SelectValue placeholder="Ingen elev" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Ingen elev</SelectItem>
            {allStudents.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {linkedStudent && (
          <span className="text-xs text-muted-foreground">({linkedStudent.name})</span>
        )}
      </div>

      {showPasswordInput && (
        <form onSubmit={handleSetPassword} className="flex items-center gap-2">
          <Input
            type="password"
            placeholder="Ny adgangskode"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="h-7 text-xs flex-1 max-w-48"
            autoFocus
          />
          <Button type="submit" size="sm" className="h-7 text-xs" disabled={!newPassword.trim()}>
            Gem
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => { setShowPasswordInput(false); setNewPassword('') }}
          >
            Annuller
          </Button>
        </form>
      )}
    </div>
  )
}
