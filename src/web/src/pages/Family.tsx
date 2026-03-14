import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Pencil, Key, UserPlus, Check, X, Baby, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import type { User, FamilyDetail, FamilyDetailMember } from '@/types'

export default function Family() {
  const queryClient = useQueryClient()

  const { data: me } = useQuery<User>({
    queryKey: ['me'],
    queryFn: () => api.auth.me(),
  })

  const { data: family, isLoading } = useQuery<FamilyDetail>({
    queryKey: ['family'],
    queryFn: () => api.family.get(),
  })

  // Figure out current user's familyRole
  const myMembership = family?.members.find(m => m.userId === me?.id)
  const isChild = myMembership?.familyRole === 'child'

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (!family?.id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Ingen familie fundet.</p>
      </div>
    )
  }

  if (isChild) {
    return <ChildView family={family} />
  }

  return <AdultView family={family} queryClient={queryClient} currentUserId={me?.id} />
}

function ChildView({ family }: { family: FamilyDetail }) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Users className="h-6 w-6" />
        {family.name}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Familiemedlemmer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {family.members.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.userName}</p>
                  <p className="text-xs text-muted-foreground">{m.userEmail}</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {m.familyRole === 'child' ? 'Barn' : 'Voksen'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AdultView({ family, queryClient, currentUserId }: { family: FamilyDetail; queryClient: ReturnType<typeof useQueryClient>; currentUserId?: string }) {
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(family.name)
  const [showInvite, setShowInvite] = useState(false)

  const updateNameMutation = useMutation({
    mutationFn: (name: string) => api.family.updateName(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family'] })
      setEditingName(false)
    },
  })

  const toggleRoleMutation = useMutation({
    mutationFn: ({ memberId, familyRole }: { memberId: string; familyRole: 'adult' | 'child' }) =>
      api.family.updateMemberRole(memberId, familyRole),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['family'] }),
  })

  const inviteMutation = useMutation({
    mutationFn: (input: { email: string; name: string; password: string; familyRole?: 'adult' | 'child' }) =>
      api.family.invite(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family'] })
      setShowInvite(false)
    },
  })

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Family name (editable) */}
      <div className="flex items-center gap-3">
        {editingName ? (
          <form
            className="flex items-center gap-2 flex-1"
            onSubmit={(e) => { e.preventDefault(); updateNameMutation.mutate(nameValue) }}
          >
            <Input
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              className="text-2xl font-bold h-auto py-1"
              autoFocus
            />
            <Button type="submit" size="icon" variant="ghost" className="h-8 w-8">
              <Check className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingName(false); setNameValue(family.name) }}>
              <X className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              {family.name}
            </h1>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingName(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Members list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Familiemedlemmer ({family.members.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowInvite(v => !v)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Inviter
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {family.members.map(m => (
            <MemberRow
              key={m.id}
              member={m}
              isSelf={m.userId === currentUserId}
              onToggleRole={(familyRole) => toggleRoleMutation.mutate({ memberId: m.id, familyRole })}
            />
          ))}
        </CardContent>
      </Card>

      {/* Invite form */}
      {showInvite && (
        <InviteForm
          onSubmit={(data) => inviteMutation.mutate(data)}
          isPending={inviteMutation.isPending}
          error={inviteMutation.error}
          onCancel={() => setShowInvite(false)}
        />
      )}
    </div>
  )
}

function MemberRow({ member, isSelf, onToggleRole }: { member: FamilyDetailMember; isSelf: boolean; onToggleRole: (role: 'adult' | 'child') => void }) {
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const queryClient = useQueryClient()

  const setPasswordMutation = useMutation({
    mutationFn: (pw: string) => api.family.setMemberPassword(member.userId, pw),
    onSuccess: () => {
      setShowPassword(false)
      setPassword('')
      queryClient.invalidateQueries({ queryKey: ['family'] })
    },
  })

  const isChild = member.familyRole === 'child'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{member.userName} {isSelf && <span className="text-muted-foreground">(dig)</span>}</p>
          <p className="text-xs text-muted-foreground truncate">{member.userEmail}</p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => onToggleRole(isChild ? 'adult' : 'child')}
          disabled={isSelf}
        >
          {isChild ? <Baby className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />}
          {isChild ? 'Barn' : 'Voksen'}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setShowPassword(v => !v)}
          title="Saet adgangskode"
        >
          <Key className="h-3.5 w-3.5" />
        </Button>
      </div>

      {showPassword && (
        <form
          className="flex items-center gap-2 pl-4"
          onSubmit={(e) => { e.preventDefault(); if (password.trim()) setPasswordMutation.mutate(password.trim()) }}
        >
          <Input
            type="password"
            placeholder="Ny adgangskode"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="h-7 text-xs flex-1 max-w-48"
            autoFocus
          />
          <Button type="submit" size="sm" className="h-7 text-xs" disabled={!password.trim() || setPasswordMutation.isPending}>
            Gem
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setShowPassword(false); setPassword('') }}>
            Annuller
          </Button>
        </form>
      )}
    </div>
  )
}

function InviteForm({ onSubmit, isPending, error, onCancel }: {
  onSubmit: (data: { email: string; name: string; password: string; familyRole: 'adult' | 'child' }) => void
  isPending: boolean
  error: Error | null
  onCancel: () => void
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [familyRole, setFamilyRole] = useState<'adult' | 'child'>('adult')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Inviter ny person</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          onSubmit={(e) => { e.preventDefault(); onSubmit({ email, name, password, familyRole }) }}
        >
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@eksempel.dk" required />
          </div>
          <div className="space-y-1">
            <Label>Navn</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Fuldt navn" required />
          </div>
          <div className="space-y-1">
            <Label>Adgangskode</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Adgangskode" required />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant={familyRole === 'adult' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFamilyRole('adult')}
              >
                <UserIcon className="h-3.5 w-3.5 mr-1" />
                Voksen
              </Button>
              <Button
                type="button"
                variant={familyRole === 'child' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFamilyRole('child')}
              >
                <Baby className="h-3.5 w-3.5 mr-1" />
                Barn
              </Button>
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive sm:col-span-2">
              {(error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Noget gik galt'}
            </p>
          )}
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={isPending || !email || !name || !password}>
              <UserPlus className="h-4 w-4 mr-1" />
              Opret og inviter
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Annuller
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
