/**
 * @file EntityMarker.tsx
 * @description Leaflet marker + popup for a single entity. The DivIcon is memoized so it is
 * only rebuilt when type, status or selection changes.
 */

import { useMemo } from 'react'
import { Marker, Popup } from 'react-leaflet'
import { Eye, Pencil } from 'lucide-react'
import { useEntityStore } from '@/store/useEntityStore'
import { createEntityMapIcon } from '@/lib/mapIcons'
import { Button } from '@/components/ui/button'
import { EntityTypeBadge } from '@/components/entity/EntityTypeBadge'
import { StatusBadge } from '@/components/entity/StatusBadge'
import type { Entity } from '@/types/entity'

interface EntityMarkerProps {
  readonly entity: Entity
  readonly isSelected: boolean
}

export function EntityMarker({ entity, isSelected }: EntityMarkerProps) {
  const selectEntityForDetail = useEntityStore((s) => s.selectEntityForDetail)
  const openEditDialog = useEntityStore((s) => s.openEditDialog)

  const icon = useMemo(
    () => createEntityMapIcon(entity.type, entity.status, isSelected),
    [entity.type, entity.status, isSelected]
  )

  return (
    <Marker
      position={[entity.latitude, entity.longitude]}
      icon={icon}
      eventHandlers={{ click: () => selectEntityForDetail(entity) }}
    >
      <Popup>
        <div className="flex min-w-[200px] flex-col gap-2 p-0.5">
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold text-foreground">{entity.name}</h4>
            <div className="flex items-center gap-1.5">
              <EntityTypeBadge type={entity.type} size="xs" />
              <StatusBadge status={entity.status} size="xs" />
            </div>
          </div>

          {entity.description && (
            <p className="text-xs text-muted-foreground">{entity.description}</p>
          )}

          <div className="font-mono text-2xs text-muted-foreground">
            [{entity.latitude.toFixed(5)}, {entity.longitude.toFixed(5)}]
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => selectEntityForDetail(entity)}
            >
              <Eye className="h-3 w-3" />
              Detail
            </Button>
            <Button size="sm" className="flex-1" onClick={() => openEditDialog(entity)}>
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}

