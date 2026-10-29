/**
 * @file useEntityStore.ts
 * @description Centralized Zustand state management store for the Geo Entity Manager.
 * Enforces strict immutability, optimistic UI updates, and coordinated modal/sheet dialog states.
 */

import { create } from 'zustand'
import { entityRepository, extractErrorMessage } from '@/api/axios'
import { registerEntityTypes, unregisterEntityType } from '@/lib/mapIcons'
import type { Entity, EntityInput } from '@/types/entity'

/**
 * Baseline entity types suggested in dropdowns and form inputs.
 */
const DEFAULT_TYPES = ['facility', 'iot_device', 'iot_sensor', 'vehicle', 'drone']

function mergeSortedTypes(base: readonly string[], additions: readonly string[]): string[] {
  const merged = Array.from(new Set([...base, ...additions])).sort()
  registerEntityTypes(merged)
  return merged
}

/**
 * Interface defining the complete state tree and dispatch actions of the Entity store.
 */
export interface EntityStoreState {
  /** Array of active entities currently loaded in memory */
  readonly entities: Entity[]
  /** Dynamic list of known entity types collected from seed, DB, and newly added entities */
  readonly typeSuggestions: string[]
  /** Entity currently selected for inspection in the detail sheet */
  readonly selectedEntity: Entity | null
  /** Entity currently opened for editing in the form dialog */
  readonly editingEntity: Entity | null
  /** Entity currently targeted for deletion in the confirm dialog */
  readonly deletingEntity: Entity | null
  /** Currently picked coordinate [latitude, longitude] from map click or place search */
  readonly pickedCoords: [number, number] | null
  /** Controls visibility of the Create/Edit Entity modal dialog */
  readonly isFormDialogOpen: boolean
  /** Controls visibility of the Right Detail slide-over sheet */
  readonly isDetailSheetOpen: boolean
  /** Indicates whether the map is currently in 'Click to pick coordinate' mode */
  readonly isPickModeActive: boolean
  /** Active filter by entity type ('all' or specific type string) */
  readonly filterType: string
  /** Active filter by operational status ('all', 'active', 'maintenance', 'inactive') */
  readonly filterStatus: string
  /** Active text search query for entity name or description */
  readonly searchQuery: string
  /** Loading indicator during list fetch operations */
  readonly isLoading: boolean
  /** Submitting indicator during create, update, or delete mutations */
  readonly isSubmitting: boolean
  /** Current API or validation error message */
  readonly error: string | null

  // Asynchronous API actions
  fetchEntities: () => Promise<void>
  fetchTypes: () => Promise<void>
  deleteEntityType: (type: string) => Promise<{ ok: boolean; message?: string }>
  createEntity: (payload: EntityInput) => Promise<boolean>
  updateEntity: (id: string, payload: EntityInput) => Promise<boolean>
  deleteEntity: (id: string) => Promise<boolean>

  // Synchronous filter actions
  setFilterType: (type: string) => void
  setFilterStatus: (status: string) => void
  setSearchQuery: (query: string) => void
  resetFilters: () => void

  // Synchronous UI state actions
  selectEntityForDetail: (entity: Entity | null) => void
  openCreateDialog: (coords?: [number, number]) => void
  openEditDialog: (entity: Entity) => void
  closeFormDialog: () => void
  openDeleteDialog: (entity: Entity) => void
  closeDeleteDialog: () => void
  setPickedCoords: (lat: number, lng: number) => void
  togglePickMode: (active?: boolean) => void
}

/**
 * Zustand store hook providing reactive state and actions across the application.
 */
export const useEntityStore = create<EntityStoreState>((set, get) => ({
  entities: [],
  typeSuggestions: [...DEFAULT_TYPES],
  selectedEntity: null,
  editingEntity: null,
  deletingEntity: null,
  pickedCoords: null,
  isFormDialogOpen: false,
  isDetailSheetOpen: false,
  isPickModeActive: false,
  filterType: 'all',
  filterStatus: 'all',
  searchQuery: '',
  isLoading: false,
  isSubmitting: false,
  error: null,

  /**
   * Fetches entities from the REST API according to the current filter criteria.
   */
  fetchEntities: async () => {
    const { filterType, filterStatus, searchQuery } = get()
    set({ isLoading: true, error: null })
    try {
      const data = await entityRepository.findAll({
        type: filterType,
        status: filterStatus,
        search: searchQuery,
      })
      registerEntityTypes(data.map((item) => item.type))
      set((state) => ({
        entities: data,
        isLoading: false,
        // Maintain selection reference if selected entity exists in new dataset
        selectedEntity: state.selectedEntity
          ? data.find((item) => item.id === state.selectedEntity?.id) ?? state.selectedEntity
          : null,
      }))
    } catch (err) {
      set({
        isLoading: false,
        error: extractErrorMessage(err),
      })
    }
  },

  /**
   * Fetches distinct dynamic types from backend and merges them with default types.
   */
  fetchTypes: async () => {
    try {
      const types = await entityRepository.findTypes()
      registerEntityTypes(types)
      set({ typeSuggestions: Array.from(new Set(types)).sort() })
    } catch {
      // Fallback gracefully without breaking UI if types endpoint encounters an issue
    }
  },

  /**
   * Deletes an unused entity type from the backend and removes it from suggestions.
   */
  deleteEntityType: async (type: string) => {
    const normalized = type.trim().toLowerCase()
    try {
      await entityRepository.deleteType(normalized)
      unregisterEntityType(normalized)
      const shouldResetFilter = get().filterType === normalized
      set((state) => ({
        typeSuggestions: state.typeSuggestions.filter((t) => t !== normalized),
        filterType: shouldResetFilter ? 'all' : state.filterType,
      }))
      if (shouldResetFilter) {
        void get().fetchEntities()
      }
      return { ok: true }
    } catch (err) {
      return {
        ok: false,
        message: extractErrorMessage(err),
      }
    }
  },

  /**
   * Dispatches entity creation and prepends the newly created entity immutably.
   */
  createEntity: async (payload: EntityInput) => {
    set({ isSubmitting: true, error: null })
    try {
      const created = await entityRepository.create(payload)
      set((state) => ({
        entities: [created, ...state.entities],
        typeSuggestions: mergeSortedTypes(state.typeSuggestions, [created.type]),
        selectedEntity: created,
        isSubmitting: false,
        isFormDialogOpen: false,
        isPickModeActive: false,
      }))
      return true
    } catch (err) {
      set({
        isSubmitting: false,
        error: extractErrorMessage(err),
      })
      return false
    }
  },

  /**
   * Dispatches entity update and replaces the entity in state immutably.
   */
  updateEntity: async (id: string, payload: EntityInput) => {
    set({ isSubmitting: true, error: null })
    try {
      const updated = await entityRepository.update(id, payload)
      set((state) => ({
        entities: state.entities.map((item) => (item.id === id ? updated : item)),
        typeSuggestions: mergeSortedTypes(state.typeSuggestions, [updated.type]),
        selectedEntity: state.selectedEntity?.id === id ? updated : state.selectedEntity,
        editingEntity: null,
        isSubmitting: false,
        isFormDialogOpen: false,
      }))
      return true
    } catch (err) {
      set({
        isSubmitting: false,
        error: extractErrorMessage(err),
      })
      return false
    }
  },

  /**
   * Dispatches entity deletion and removes the item from state immutably.
   */
  deleteEntity: async (id: string) => {
    set({ isSubmitting: true, error: null })
    try {
      await entityRepository.delete(id)
      set((state) => ({
        entities: state.entities.filter((item) => item.id !== id),
        selectedEntity: state.selectedEntity?.id === id ? null : state.selectedEntity,
        isDetailSheetOpen: state.selectedEntity?.id === id ? false : state.isDetailSheetOpen,
        deletingEntity: null,
        isSubmitting: false,
      }))
      return true
    } catch (err) {
      set({
        isSubmitting: false,
        error: extractErrorMessage(err),
      })
      return false
    }
  },

  /** Updates type filter and automatically triggers data refresh */
  setFilterType: (filterType: string) => {
    set({ filterType })
    void get().fetchEntities()
  },

  /** Updates status filter and automatically triggers data refresh */
  setFilterStatus: (filterStatus: string) => {
    set({ filterStatus })
    void get().fetchEntities()
  },

  /** Updates live search query string */
  setSearchQuery: (searchQuery: string) => {
    set({ searchQuery })
  },

  /** Resets all filters back to default values and reloads entities */
  resetFilters: () => {
    set({ filterType: 'all', filterStatus: 'all', searchQuery: '' })
    void get().fetchEntities()
  },

  /** Opens the right detail sheet for a specific entity or closes it when null */
  selectEntityForDetail: (entity: Entity | null) => {
    set({
      selectedEntity: entity,
      isDetailSheetOpen: entity !== null,
    })
  },

  /** Opens the modal form to create a new entity with optional prefilled coordinates */
  openCreateDialog: (coords?: [number, number]) => {
    set((state) => ({
      editingEntity: null,
      pickedCoords: coords ? [...coords] : state.pickedCoords ?? [-6.2088, 106.8456],
      isFormDialogOpen: true,
      error: null,
    }))
  },

  /** Opens the modal form to edit an existing entity */
  openEditDialog: (entity: Entity) => {
    set({
      editingEntity: { ...entity },
      pickedCoords: [entity.latitude, entity.longitude],
      isFormDialogOpen: true,
      error: null,
    })
  },

  /** Closes the entity creation/editing modal dialog */
  closeFormDialog: () => {
    set({
      isFormDialogOpen: false,
      editingEntity: null,
      error: null,
    })
  },

  /** Opens the confirmation modal for deleting an entity */
  openDeleteDialog: (entity: Entity) => {
    set({
      deletingEntity: { ...entity },
      error: null,
    })
  },

  /** Closes the deletion confirmation modal */
  closeDeleteDialog: () => {
    set({
      deletingEntity: null,
      error: null,
    })
  },

  /**
   * Sets picked map coordinates and automatically opens form if pick mode was triggered.
   * Coordinates are rounded to 6 decimal places (approx. 0.1 meter accuracy).
   */
  setPickedCoords: (lat: number, lng: number) => {
    const roundedLat = Number(lat.toFixed(6))
    const roundedLng = Number(lng.toFixed(6))
    set((state) => ({
      pickedCoords: [roundedLat, roundedLng],
      isFormDialogOpen: state.isPickModeActive ? true : state.isFormDialogOpen,
      isPickModeActive: false,
    }))
  },

  /** Toggles or explicitly sets coordinate pick mode */
  togglePickMode: (active?: boolean) => {
    set((state) => ({
      isPickModeActive: active !== undefined ? active : !state.isPickModeActive,
    }))
  },
}))
