import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { GraduationCap, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'

export default function Aula() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [tokenInput, setTokenInput] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; profile?: unknown } | null>(null)

  const connectedParam = searchParams.get('connected')
  const errorParam = searchParams.get('error')

  const { data: token, isLoading } = useQuery({
    queryKey: ['aula-token'],
    queryFn: () => api.aula.getToken(),
  })

  const saveMutation = useMutation({
    mutationFn: (accessToken: string) => api.aula.saveToken(accessToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aula-token'] })
      setTokenInput('')
      setVerifyResult(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.aula.deleteToken(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aula-token'] })
      setVerifyResult(null)
    },
  })

  const verifyMutation = useMutation({
    mutationFn: () => api.aula.verifyToken(),
    onSuccess: (result) => setVerifyResult(result),
  })

  const maskedToken = (t: string) => '••••••' + t.slice(-6)

  const errorMessages: Record<string, string> = {
    aula_auth_failed: 'Login med Aula mislykkedes.',
    aula_state_missing: 'Sessionstilstand mangler — prøv igen.',
    aula_state_invalid: 'Ugyldig sessionstilstand — prøv igen.',
    aula_state_mismatch: 'Sikkerhedsfejl i OAuth-flow — prøv igen.',
    aula_token_exchange_failed: 'Token-udveksling med Aula fejlede. Aula accepterer muligvis ikke vores redirect URI endnu.',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-7 w-7" />
        <h1 className="text-2xl font-bold">Aula Integration</h1>
      </div>

      {connectedParam === 'true' && (
        <div className="flex items-center gap-2 text-sm rounded-md px-3 py-2 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          Aula forbundet via MitID!
        </div>
      )}

      {errorParam && (
        <div className="flex items-center gap-2 text-sm rounded-md px-3 py-2 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <XCircle className="h-4 w-4" />
          {errorMessages[errorParam] ?? 'En fejl opstod — prøv igen.'}
        </div>
      )}

      {token ? (
        <div className="border rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="font-medium text-green-700 dark:text-green-400">Forbundet</span>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Access token</Label>
            <p className="font-mono text-sm mt-0.5">{maskedToken(token.accessToken)}</p>
          </div>
          {token.expiresAt && (
            <div>
              <Label className="text-muted-foreground text-xs">Udløber</Label>
              <p className="text-sm mt-0.5">{new Date(token.expiresAt).toLocaleString('da-DK')}</p>
            </div>
          )}

          {verifyResult !== null && (
            <div className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${verifyResult.valid ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
              {verifyResult.valid
                ? <><CheckCircle className="h-4 w-4" /> Token er gyldigt</>
                : <><XCircle className="h-4 w-4" /> Token er ugyldigt eller udløbet</>
              }
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending}>
              {verifyMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Verificer token
            </Button>
            <Button variant="outline" size="sm" onClick={() => { window.location.href = '/api/aula/auth' }}>
              Forny via MitID
            </Button>
            <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Fjern forbindelse
            </Button>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">Ikke forbundet til Aula</span>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Log ind med dit MitID for at give adgang til Aula. Du vil blive sendt til Aulas loginside.
            </p>
            <Button className="w-full" onClick={() => { window.location.href = '/api/aula/auth' }}>
              <GraduationCap className="h-4 w-4 mr-2" />
              Log ind med MitID via Aula
            </Button>
          </div>

          <div>
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowManual(v => !v)}
            >
              {showManual ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Manuel token-indstilling
            </button>
            {showManual && (
              <div className="mt-3 space-y-3 border-t pt-3">
                <div className="bg-muted/50 rounded-md p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Find token manuelt:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Log ind på Aula i din browser</li>
                    <li>Åbn F12 → Network → filtrer på "aula.dk/api"</li>
                    <li>Kopier <code className="bg-muted px-1 rounded">access_token</code>-parameteren</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aula-token">Access token</Label>
                  <Input
                    id="aula-token"
                    placeholder="Indsæt Aula access token her..."
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                    type="password"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate(tokenInput.trim())}
                  disabled={!tokenInput.trim() || saveMutation.isPending}
                >
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Gem token
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
