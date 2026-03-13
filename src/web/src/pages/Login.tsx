import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'

export default function Login() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const errorParam = searchParams.get('error')
  const notApproved = errorParam === 'not_approved'

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.auth.loginWithPassword(email, password)
      navigate('/')
    } catch {
      setError('Forkert e-mail eller adgangskode, eller kontoen er ikke godkendt.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2 pb-2">
          <h1 className="text-3xl font-bold tracking-tight">Family Hub</h1>
          <p className="text-sm text-muted-foreground">
            Styr madplan, lektier og familiekalender samlet
          </p>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {notApproved && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">
                Din konto afventer godkendelse. Kontakt administrator.
              </p>
            </div>
          )}

          {errorParam && !notApproved && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800">
                Login mislykkedes. Prøv igen.
              </p>
            </div>
          )}

          <Button asChild className="w-full" size="lg">
            <a href="/api/auth/google">Log ind med Google</a>
          </Button>

          {!showPasswordForm ? (
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => setShowPasswordForm(true)}
            >
              Log ind med adgangskode
            </Button>
          ) : (
            <form onSubmit={handlePasswordLogin} className="space-y-3 border-t pt-3">
              <p className="text-sm font-medium">Log ind med adgangskode</p>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="space-y-1">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="din@email.dk"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Adgangskode</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Logger ind...' : 'Log ind'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowPasswordForm(false)}>
                  Annuller
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
