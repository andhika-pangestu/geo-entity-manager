/**
 * @file App.tsx
 * @description Main application component composing the navigation bar, sidebar,
 * map canvas, detail sheet, and modal dialogs into a unified layout.
 */

import { useEffect } from 'react'
import { useEntityStore } from '@/store/useEntityStore'
import { Navbar } from '@/components/layout/Navbar'
import { EntitySidebar } from '@/components/entity/EntitySidebar'
import { MapView } from '@/components/map/MapView'
import { EntityFormDialog } from '@/components/entity/EntityFormDialog'
import { EntityDetailSheet } from '@/components/entity/EntityDetailSheet'
import { DeleteConfirmDialog } from '@/components/entity/DeleteConfirmDialog'

export function App() {
  const fetchTypes = useEntityStore((s) => s.fetchTypes)

  // Initialize dynamic entity types on component mount (entities are fetched by EntitySidebar)
  useEffect(() => {
    void fetchTypes()
  }, [fetchTypes])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <Navbar />

      <main className="relative flex flex-1 overflow-hidden">
        <EntitySidebar />
        <MapView />
        <EntityDetailSheet />
      </main>

      <EntityFormDialog />
      <DeleteConfirmDialog />
    </div>
  )
}
