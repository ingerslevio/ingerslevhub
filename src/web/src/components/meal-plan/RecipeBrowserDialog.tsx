import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { Recipe } from '@/types'

interface RecipeBrowserDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (recipe: Recipe) => void
}

export function RecipeBrowserDialog({ open, onClose, onSelect }: RecipeBrowserDialogProps) {
  const [search, setSearch] = useState('')

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => api.recipes.list(),
    enabled: open,
  })

  const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vælg opskrift</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Søg opskrifter..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3"
        />
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Ingen opskrifter fundet</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filtered.map((recipe) => (
              <div key={recipe.id} className="flex items-center justify-between p-3 rounded-md border hover:bg-accent">
                <div>
                  <p className="font-medium text-sm">{recipe.name}</p>
                  {(recipe.prepTimeMinutes || recipe.cookTimeMinutes) && (
                    <p className="text-xs text-muted-foreground">
                      {[recipe.prepTimeMinutes && `${recipe.prepTimeMinutes} min forberedelse`, recipe.cookTimeMinutes && `${recipe.cookTimeMinutes} min tilberedning`].filter(Boolean).join(' \u00b7 ')}
                    </p>
                  )}
                </div>
                <Button size="sm" onClick={() => { onSelect(recipe); onClose(); }}>
                  Vælg
                </Button>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" onClick={onClose} className="w-full mt-2">Annuller</Button>
      </DialogContent>
    </Dialog>
  )
}
