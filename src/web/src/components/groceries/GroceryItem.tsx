import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GroceryListItem } from '@/types'

interface GroceryItemProps {
  item: GroceryListItem
  onUpdate: (id: string, data: Partial<{ checked: boolean; buyOnDiscount: boolean }>) => void
  onDelete: (id: string) => void
}

export function GroceryItem({ item, onUpdate, onDelete }: GroceryItemProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Checkbox
        checked={item.checked}
        onCheckedChange={(checked) => onUpdate(item.id, { checked: !!checked })}
      />
      <div className="flex-1 min-w-0">
        <span className={cn('text-sm', item.checked && 'line-through text-muted-foreground')}>
          {item.name}
          {item.quantity && <span className="text-muted-foreground ml-2">{item.quantity}</span>}
        </span>
        {item.note && <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>}
      </div>
      {item.buyOnDiscount && (
        <Badge variant="secondary" className="text-xs shrink-0">Tilbud</Badge>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
        onClick={() => onDelete(item.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
