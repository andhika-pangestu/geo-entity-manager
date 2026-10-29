/**
 * @file EntityCard.tsx
 * @description Entity list item for the sidebar. Selection styling is a `cva` variant
 * (border-only highlight) instead of inline ternaries.
 */

import { cva } from 'class-variance-authority'
import { Eye, MapPin, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { EntityTypeBadge } from '@/components/entity/EntityTypeBadge'
import { StatusBadge } from '@/components/entity/StatusBadge'
import type { Entity } from '@/types/entity'

const entityCardVariants = cva('flex cursor-pointer flex-col gap-1', {
  variants: {
    selected: {
      true: 'border-2 border-primary',
      false: 'hover:border-input',
    },
  },
  defaultVariants: {
    selected: false,
  },
})

interface EntityCardProps {
  readonly entity: Entity
  readonly isSelected: boolean
  readonly onSelect: (entity: Entity) => void
  readonly onEdit: (entity: Entity) => void
  readonly onDelete: (entity: Entity) => void
}

export function EntityCard({
  entity,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: EntityCardProps) {
  return (
    <Card
      onClick={() => onSelect(entity)}
      className={entityCardVariants({ selected: isSelected })}
    >
      <CardHeader className="p-3.5 pb-2">
        <CardTitle className="truncate text-sm">{entity.name}</CardTitle>
        <div className="flex flex-wrap items-center gap-1.5">
          <EntityTypeBadge type={entity.type} />
          <StatusBadge status={entity.status} size="sm" />
        </div>
      </CardHeader>

      {entity.description && (
        <CardContent className="px-3.5 py-1.5">
          <p className="line-clamp-1 text-xs text-muted-foreground">{entity.description}</p>
        </CardContent>
      )}

      <CardFooter className="justify-between border-t p-3.5 pt-2">
        <span className="inline-flex items-center gap-1 font-mono text-2xs text-muted-foreground">
          <MapPin className="h-3 w-3 text-primary" />
          {entity.latitude.toFixed(4)}, {entity.longitude.toFixed(4)}
        </span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelect(entity)}
            title="Lihat Detail"
            aria-label="Lihat Detail"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(entity)}
            title="Edit Entitas"
            aria-label="Edit Entitas"
          >
            <Pencil className="h-3.5 w-3.5 text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(entity)}
            title="Hapus Entitas"
            aria-label="Hapus Entitas"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

