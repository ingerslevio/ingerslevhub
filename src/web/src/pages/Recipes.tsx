import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, UtensilsCrossed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import type { Recipe, RecipeIngredient } from '@/types'
import { RecipeDialog } from '@/components/recipes/RecipeDialog'

function parseTags(raw: string[] | string | undefined | null): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

function parseIngredients(raw: string | undefined | null): RecipeIngredient[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function Stars({ rating, max = 5 }: { rating: number | null | undefined; max?: number }) {
  const r = rating ?? 0
  return (
    <span className="text-yellow-500 text-sm">
      {Array.from({ length: max }).map((_, i) => i < Math.round(r) ? '\u2605' : '\u2606').join('')}
    </span>
  )
}

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'i dag'
  if (days === 1) return 'i gar'
  return `${days} dage siden`
}

interface RecipeCardProps {
  recipe: Recipe
  onClick: () => void
}

function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const tags = parseTags(recipe.tags)
  const totalTime = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0)
  const ingredients = parseIngredients(recipe.ingredients)

  return (
    <div
      className="border rounded-lg overflow-hidden cursor-pointer hover:border-primary transition-colors bg-card"
      onClick={onClick}
    >
      {recipe.imageUrl ? (
        <img
          src={recipe.imageUrl}
          alt={recipe.name}
          className="w-full h-36 object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      ) : (
        <div className="w-full h-36 bg-muted flex items-center justify-center">
          <UtensilsCrossed className="h-10 w-10 text-muted-foreground opacity-40" />
        </div>
      )}
      <div className="p-3 space-y-1.5">
        <p className="font-semibold text-sm leading-tight">{recipe.name}</p>

        <div className="flex items-center gap-2 flex-wrap">
          <Stars rating={recipe.avgRating} />
          {recipe.servings && (
            <span className="text-xs text-muted-foreground">{recipe.servings} port.</span>
          )}
          {totalTime > 0 && (
            <span className="text-xs text-muted-foreground">{totalTime} min</span>
          )}
        </div>

        {ingredients.length > 0 && (
          <p className="text-xs text-muted-foreground">{ingredients.length} ingredienser</p>
        )}

        <p className="text-xs text-muted-foreground">
          {(recipe.timesUsed ?? 0) > 0
            ? `Lavet ${recipe.timesUsed} gange`
            : 'Aldrig lavet'}
        </p>

        {recipe.lastUsedAt && (
          <p className="text-xs text-muted-foreground">
            Sidst lavet: {daysAgo(recipe.lastUsedAt)}
          </p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {tags.slice(0, 4).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">{tag}</Badge>
            ))}
            {tags.length > 4 && (
              <span className="text-xs text-muted-foreground">+{tags.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Recipes() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => api.recipes.list(),
  })

  const openAdd = () => {
    setSelectedRecipe(null)
    setDialogOpen(true)
  }

  const openEdit = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setDialogOpen(true)
  }

  const handleClose = () => {
    setDialogOpen(false)
    setSelectedRecipe(null)
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Opskrifter</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Tilfoej opskrift
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-20">
          <UtensilsCrossed className="h-12 w-12 text-muted-foreground opacity-30 mx-auto mb-3" />
          <p className="text-muted-foreground">Ingen opskrifter endnu</p>
          <Button size="sm" onClick={openAdd} className="mt-4">
            <Plus className="h-4 w-4 mr-1" />
            Tilfoej din forste opskrift
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {recipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} onClick={() => openEdit(recipe)} />
          ))}
        </div>
      )}

      <RecipeDialog
        open={dialogOpen}
        onClose={handleClose}
        recipe={selectedRecipe}
      />
    </div>
  )
}
