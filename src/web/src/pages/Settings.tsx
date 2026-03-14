import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { KeyRound, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

export default function Settings() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.auth.me() })

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [success, setSuccess] = useState(false)

  const hasPassword = !!me?.passwordHash

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      api.auth.changePassword({
        currentPassword: hasPassword ? currentPassword : undefined,
        newPassword,
        confirmPassword,
      }),
    onSuccess: () => {
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(false), 4000)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    changePasswordMutation.mutate()
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <h1 className="text-xl font-bold">Indstillinger</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" />
            Skift adgangskode
          </CardTitle>
          <CardDescription>
            {hasPassword
              ? 'Opdater din adgangskode'
              : 'Du er logget ind med Google — sæt en adgangskode så du også kan logge ind med e-mail'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {hasPassword && (
              <div className="space-y-1">
                <Label htmlFor="current">Nuværende adgangskode</Label>
                <Input
                  id="current"
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="new">Ny adgangskode</Label>
              <Input
                id="new"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Mindst 8 tegn"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm">Bekræft ny adgangskode</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {changePasswordMutation.error && (
              <p className="text-sm text-destructive">
                {(changePasswordMutation.error as { response?: { data?: { error?: string } } })
                  ?.response?.data?.error ?? 'Noget gik galt'}
              </p>
            )}

            {success && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Adgangskode opdateret!
              </p>
            )}

            <Button
              type="submit"
              disabled={changePasswordMutation.isPending || !newPassword || !confirmPassword}
            >
              {changePasswordMutation.isPending ? 'Gemmer...' : 'Skift adgangskode'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
