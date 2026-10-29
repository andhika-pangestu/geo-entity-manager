/**
 * @file EntitySidebar.tsx
 * @description Left sidebar: status counters, live search, dynamic type/status filters and
 * the scrollable entity list. Spacing is parent-controlled (`gap-*`), colors are theme tokens.
 */

import { useEffect } from 'react'
import { AlertCircle, Layers, RotateCcw, Search } from 'lucide-react'
import { useEntityStore } from '@/store/useEntityStore'
import { useDebounce } from '@/hooks/useDebounce'
import { getTypeColor } from '@/lib/mapIcons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { FormField } from '@/components/shared/FormField'
import { StatCard } from '@/components/shared/StatCard'
import { EntityCard } from '@/components/entity/EntityCard'
import type { EntityStatus } from '@/types/entity'

const SEARCH_DEBOUNCE_MS = 300

export function EntitySidebar() {
  const {
    entities,
    typeSuggestions,
    selectedEntity,
    filterType,
    filterStatus,
    searchQuery,
    isLoading,
    error,
    setFilterType,
    setFilterStatus,
    setSearchQuery,
    resetFilters,
    fetchEntities,
    selectEntityForDetail,
    openEditDialog,
    openDeleteDialog,
  } = useEntityStore()

  const debouncedSearch = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS)

  useEffect(() => {
    void fetchEntities()
  }, [debouncedSearch, fetchEntities])

  const count = (status: EntityStatus) => entities.filter((e) => e.status === status).length
  const hasActiveFilter = filterType !== 'all' || filterStatus !== 'all' || searchQuery.trim() !== ''

  return (
    <aside className="z-10 flex h-full w-full shrink-0 flex-col border-r bg-background md:w-[370px]">
      <div className="flex flex-col gap-3 border-b p-4">
        <div className="grid grid-cols-4 gap-1.5">
          <StatCard label="Total" value={entities.length} />
          <StatCard label="Active" value={count('active')} tone="success" />
          <StatCard label="Maint." value={count('maintenance')} tone="warning" />
          <StatCard label="Inactive" value={count('inactive')} tone="muted" />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari nama atau deskripsi entitas..."
            aria-label="Cari entitas"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <FormField label="Filter Tipe (Dinamis)" htmlFor="filter-type" size="sm" tone="muted">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger id="filter-type">
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {typeSuggestions.map((type) => {
                  const { hex } = getTypeColor(type)
                  return (
                    <SelectItem key={type} value={type}>
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: hex }}
                        />
                        {type}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Filter Status" htmlFor="filter-status" size="sm" tone="muted">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger id="filter-status">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {hasActiveFilter && (
          <div className="flex items-center justify-between">
            <span className="text-2xs text-muted-foreground">
              Menampilkan {entities.length} hasil filter
            </span>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={resetFilters}>
              <RotateCcw className="h-3 w-3" />
              Reset Filter
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-28 border" />
            ))}
          </div>
        ) : entities.length === 0 ? (
          <EmptyState
            icon={<Layers className="h-6 w-6" />}
            title="Tidak ada entitas ditemukan"
            description="Ubah filter pencarian atau klik pada peta untuk menambahkan entitas baru."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {entities.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                isSelected={selectedEntity?.id === entity.id}
                onSelect={selectEntityForDetail}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
