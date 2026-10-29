/**
 * @file MapToolbar.tsx
 * @description Floating toolbar over the map: place search, pick-mode hint and the
 * picked-coordinate badge. Pick-mode styling is a `cva` variant (border-only).
 */

import { cva } from 'class-variance-authority'
import { Crosshair, Plus } from 'lucide-react'
import { useEntityStore } from '@/store/useEntityStore'
import { Button } from '@/components/ui/button'
import { PlaceSearchBox } from '@/components/map/PlaceSearchBox'

const pickHintVariants = cva(
  'pointer-events-auto flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium shadow-md',
  {
    variants: {
      active: {
        true: 'border-destructive text-destructive [&>svg]:text-destructive',
        false: 'border-input text-foreground [&>svg]:text-primary',
      },
    },
    defaultVariants: {
      active: false,
    },
  }
)

interface MapToolbarProps {
  readonly onSelectPlace: (lat: number, lng: number, label: string) => void
}

export function MapToolbar({ onSelectPlace }: MapToolbarProps) {
  const { pickedCoords, isPickModeActive, openCreateDialog } = useEntityStore()

  return (
    <div className="pointer-events-none absolute left-14 right-4 top-3 z-20 flex flex-wrap items-center gap-2">
      <PlaceSearchBox onSelectPlace={onSelectPlace} />

      <div className={pickHintVariants({ active: isPickModeActive })}>
        <Crosshair className="h-3.5 w-3.5" />
        {isPickModeActive ? (
          <span className="font-semibold">
            Klik titik pada peta untuk menentukan koordinat
          </span>
        ) : (
          <span>Klik peta atau cari lokasi untuk memilih koordinat</span>
        )}
      </div>

      {pickedCoords && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-primary bg-background px-3 py-1 text-xs shadow-md">
          <span className="font-mono font-semibold text-primary">
            Titik: [{pickedCoords[0].toFixed(5)}, {pickedCoords[1].toFixed(5)}]
          </span>
          <Button size="xs" onClick={() => openCreateDialog(pickedCoords)}>
            <Plus className="h-3 w-3" />
            Tambah di Titik Ini
          </Button>
        </div>
      )}
    </div>
  )
}

