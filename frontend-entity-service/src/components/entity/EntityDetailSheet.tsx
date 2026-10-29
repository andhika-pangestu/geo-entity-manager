/**
 * @file EntityDetailSheet.tsx
 * @description Right-side inspection sheet for the selected entity (attributes, JSON metadata,
 * edit/delete actions). Non-modal with no overlay so the map stays visible and interactive;
 * the navbar offset and outside-interaction rule are supplied here, not in the primitive.
 */

import { Calendar, Code2, Hash, MapPin, Pencil, Trash2 } from 'lucide-react'
import { useEntityStore } from '@/store/useEntityStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { EntityTypeBadge } from '@/components/entity/EntityTypeBadge'
import { StatusBadge } from '@/components/entity/StatusBadge'

function formatMetadataValue(value: unknown): string {
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

export function EntityDetailSheet() {
  const {
    selectedEntity,
    isDetailSheetOpen,
    selectEntityForDetail,
    openEditDialog,
    openDeleteDialog,
  } = useEntityStore()

  if (!selectedEntity) {
    return null
  }

  const metadataEntries = Object.entries(selectedEntity.metadata ?? {})

  return (
    <Sheet
      open={isDetailSheetOpen}
      modal={false}
      onOpenChange={(open) => {
        if (!open) selectEntityForDetail(null)
      }}
    >
      <SheetContent
        side="right"
        hideOverlay
        className="top-14 h-[calc(100vh-3.5rem)] flex flex-col justify-between gap-4"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <SheetHeader className="shrink-0 text-left">
          <div className="flex items-center gap-1.5">
            <EntityTypeBadge type={selectedEntity.type} />
            <StatusBadge status={selectedEntity.status} size="sm" />
          </div>
          <SheetTitle className="truncate pr-6">{selectedEntity.name}</SheetTitle>
          <SheetDescription className="flex items-center gap-1.5 font-mono text-2xs">
            <Hash className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{selectedEntity.id}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto text-xs pr-1">
          {selectedEntity.description && (
            <Card className="shadow-none">
              <CardContent className="p-3 leading-relaxed text-foreground">
                {selectedEntity.description}
              </CardContent>
            </Card>
          )}

          <Card className="shadow-none">
            <CardContent className="p-3">
              <dl className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-3xs uppercase tracking-wider text-muted-foreground">
                    Latitude
                  </dt>
                  <dd className="font-mono text-xs font-semibold text-foreground">
                    {selectedEntity.latitude.toFixed(6)}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-3xs uppercase tracking-wider text-muted-foreground">
                    Longitude
                  </dt>
                  <dd className="font-mono text-xs font-semibold text-foreground">
                    {selectedEntity.longitude.toFixed(6)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <section className="flex flex-col gap-2">
            <h4 className="flex items-center gap-1.5 font-semibold text-foreground">
              <Code2 className="h-3.5 w-3.5 text-primary" />
              Metadata Atribut ({metadataEntries.length})
            </h4>
            <Card className="shadow-none">
              <CardContent className="p-3">
                {metadataEntries.length === 0 ? (
                  <p className="italic text-muted-foreground">Tidak ada atribut tambahan</p>
                ) : (
                  <dl className="flex flex-col gap-1.5 font-mono text-2xs">
                    {metadataEntries.map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <dt className="text-muted-foreground">{key}:</dt>
                        <dd className="truncate font-medium text-foreground">
                          {formatMetadataValue(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </CardContent>
            </Card>
          </section>

          <div className="flex items-center justify-between pt-1 text-2xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Diperbarui: {new Date(selectedEntity.updated_at).toLocaleString('id-ID')}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <MapPin className="h-3 w-3" />
              WGS 84
            </span>
          </div>
        </div>

        <SheetFooter className="shrink-0 pt-3 border-t border-border/50 flex flex-row items-center gap-2 sm:space-x-0">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => openEditDialog(selectedEntity)}
          >
            <Pencil className="h-3.5 w-3.5 text-primary" />
            Edit Entitas
          </Button>
          <Button variant="destructive" onClick={() => openDeleteDialog(selectedEntity)}>
            <Trash2 className="h-3.5 w-3.5" />
            Hapus
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
