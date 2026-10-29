/**
 * @file MapView.tsx
 * @description Leaflet map canvas: tile layer, click-to-pick, camera fly-to, the picked-point
 * marker and entity markers. Strict WGS 84 [latitude, longitude] ordering.
 */

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Plus } from 'lucide-react'
import { useEntityStore } from '@/store/useEntityStore'
import { createPickedCoordIcon } from '@/lib/mapIcons'
import { Button } from '@/components/ui/button'
import { EntityMarker } from '@/components/map/EntityMarker'
import { MapToolbar } from '@/components/map/MapToolbar'
import type { Entity } from '@/types/entity'

/** Default map center in Jakarta Central [lat, lng] */
const DEFAULT_CENTER: [number, number] = [-6.2088, 106.8456]
const DEFAULT_ZOOM = 13
const ENTITY_FOCUS_ZOOM = 15
const PLACE_FOCUS_ZOOM = 16

/** Attaches the Leaflet click listener that updates picked coordinates. */
function MapClickHandler() {
  const setPickedCoords = useEntityStore((s) => s.setPickedCoords)

  useMapEvents({
    click(e) {
      setPickedCoords(e.latlng.lat, e.latlng.lng)
    },
  })

  return null
}

/** Smooth camera transitions for selected entities and chosen search places. */
function MapCameraController({
  selectedEntity,
  flyTarget,
}: {
  readonly selectedEntity: Entity | null
  readonly flyTarget: [number, number] | null
}) {
  const map = useMap()

  useEffect(() => {
    if (selectedEntity) {
      map.flyTo([selectedEntity.latitude, selectedEntity.longitude], ENTITY_FOCUS_ZOOM, {
        duration: 0.8,
      })
    }
  }, [selectedEntity, map])

  useEffect(() => {
    if (flyTarget) {
      map.flyTo(flyTarget, PLACE_FOCUS_ZOOM, { duration: 1.0 })
    }
  }, [flyTarget, map])

  return null
}

export function MapView() {
  const {
    entities,
    selectedEntity,
    pickedCoords,
    openCreateDialog,
    setPickedCoords,
  } = useEntityStore()

  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const [pickedPlaceLabel, setPickedPlaceLabel] = useState<string | null>(null)

  const pickedIcon = useMemo(() => createPickedCoordIcon(), [])

  const handleSelectPlace = (lat: number, lng: number, label: string) => {
    setPickedCoords(lat, lng)
    setPickedPlaceLabel(label)
    setFlyTarget([lat, lng])
  }

  return (
    <div className="relative h-full w-full flex-1 bg-muted">
      <MapToolbar onSelectPlace={handleSelectPlace} />

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler />
        <MapCameraController selectedEntity={selectedEntity} flyTarget={flyTarget} />

        {pickedCoords && (
          <Marker position={pickedCoords} icon={pickedIcon}>
            <Popup>
              <div className="flex max-w-[220px] flex-col gap-1.5 p-1 text-xs">
                <p className="font-semibold text-foreground">Titik Koordinat Terpilih</p>
                {pickedPlaceLabel && (
                  <p className="line-clamp-2 text-2xs text-muted-foreground">
                    {pickedPlaceLabel}
                  </p>
                )}
                <p className="font-mono text-muted-foreground">
                  Lat: {pickedCoords[0].toFixed(6)}
                  <br />
                  Lng: {pickedCoords[1].toFixed(6)}
                </p>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => openCreateDialog(pickedCoords)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Entitas di Sini
                </Button>
              </div>
            </Popup>
          </Marker>
        )}

        {entities.map((entity) => (
          <EntityMarker
            key={entity.id}
            entity={entity}
            isSelected={selectedEntity?.id === entity.id}
          />
        ))}
      </MapContainer>
    </div>
  )
}
