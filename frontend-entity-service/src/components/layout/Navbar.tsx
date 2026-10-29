/**
 * @file Navbar.tsx
 * @description Top bar: brand, coordinate pick-mode toggle and the primary "Tambah Entitas" action.
 */

import { Globe, Plus, Crosshair } from 'lucide-react'
import { useEntityStore } from '@/store/useEntityStore'
import { Button } from '@/components/ui/button'

export function Navbar() {
  const { isPickModeActive, togglePickMode, openCreateDialog } = useEntityStore()

  return (
    <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Globe className="h-4 w-4" />
        </div>
        <h1 className="text-base font-bold tracking-tight text-foreground">
          Geo Entity Manager
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={isPickModeActive ? 'destructive' : 'outline'}
          onClick={() => togglePickMode()}
          title="Klik peta untuk memilih titik koordinat entitas baru"
        >
          <Crosshair className="h-4 w-4" />
          {isPickModeActive ? 'Batal Pilih' : 'Pilih Titik di Peta'}
        </Button>

        <Button onClick={() => openCreateDialog()}>
          <Plus className="h-4 w-4" />
          Tambah Entitas
        </Button>
      </div>
    </header>
  )
}
