/**
 * @file axios.ts
 * @description Central HTTP client configuration and Entity Repository implementation.
 * Encapsulates Axios requests, error normalization, and repository patterns.
 */

import axios, { AxiosError } from 'axios'
import type {
  ApiResponse,
  Entity,
  EntityFilters,
  EntityInput,
  Repository,
} from '@/types/entity'

/**
 * Fallback backend URL when VITE_API_BASE_URL environment variable is unset.
 */
const DEFAULT_API_BASE_URL = 'http://localhost:8080/api/v1'

/**
 * Pre-configured Axios instance for backend REST API communication.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 10000,
})

/**
 * Normalizes any error thrown by network, Axios, or JavaScript runtime into a user-friendly string.
 * Extracts field-level validation issues from the backend ApiErrorResponse when available.
 *
 * @param err - Unknown error object caught in try-catch
 * @returns Formatted human-readable error description
 */
export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<ApiResponse<unknown>>
    const apiErr = axiosErr.response?.data?.error

    if (apiErr) {
      if (apiErr.details && apiErr.details.length > 0) {
        const detailText = apiErr.details.map((d) => `${d.field}: ${d.issue}`).join('; ')
        return `${apiErr.message} (${detailText})`
      }
      return apiErr.message
    }
    return axiosErr.message || 'Gagal terhubung ke server API'
  }

  if (err instanceof Error) {
    return err.message
  }

  return 'Terjadi kesalahan tidak terduga'
}

/**
 * HTTP implementation of the Entity Repository.
 * Encapsulates Axios requests and enforces immutability.
 */
class HttpEntityRepository implements Repository<Entity, EntityInput, EntityInput, EntityFilters> {
  /**
   * Retrieves all entities filtered by dynamic type, operational status, or search term.
   */
  async findAll(filters?: EntityFilters): Promise<Entity[]> {
    const params: Record<string, string> = {}

    if (filters?.type && filters.type !== 'all') {
      params.type = filters.type
    }
    if (filters?.status && filters.status !== 'all') {
      params.status = filters.status
    }
    if (filters?.search && filters.search.trim() !== '') {
      params.search = filters.search.trim()
    }

    const { data } = await apiClient.get<ApiResponse<Entity[]>>('/entities', { params })
    return data.data ?? []
  }

  /**
   * Creates a new entity on the backend.
   */
  async create(payload: EntityInput): Promise<Entity> {
    const { data } = await apiClient.post<ApiResponse<Entity>>('/entities', payload)
    if (!data.data) {
      throw new Error('Respons server tidak memuat data entitas baru')
    }
    return data.data
  }

  /**
   * Updates an existing entity by ID.
   */
  async update(id: string, payload: EntityInput): Promise<Entity> {
    const { data } = await apiClient.put<ApiResponse<Entity>>(`/entities/${id}`, payload)
    if (!data.data) {
      throw new Error('Respons server tidak memuat data entitas yang diperbarui')
    }
    return data.data
  }

  /**
   * Deletes an entity by ID from the database.
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/entities/${id}`)
  }

  /**
   * Retrieves the list of all distinct dynamic entity types stored in the database.
   */
  async findTypes(): Promise<string[]> {
    const { data } = await apiClient.get<ApiResponse<string[]>>('/entities/types')
    return data.data ?? []
  }

  /**
   * Deletes an unused entity type from the backend suggestion registry.
   */
  async deleteType(type: string): Promise<void> {
    await apiClient.delete(`/entities/types/${encodeURIComponent(type.trim().toLowerCase())}`)
  }
}

/**
 * Singleton repository instance exported for use across the application.
 */
export const entityRepository = new HttpEntityRepository()

/**
 * Location geocoding result returned by the OpenStreetMap Nominatim API.
 */
export interface NominatimPlaceResult {
  readonly place_id: number
  readonly display_name: string
  readonly lat: string
  readonly lon: string
  readonly name?: string
}

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'

/**
 * Queries OpenStreetMap Nominatim for place autocomplete results.
 * Centralizes external HTTP calls inside the API layer as required by architecture rules.
 */
export async function searchNominatimPlaces(
  query: string,
  limit: number,
  signal?: AbortSignal
): Promise<NominatimPlaceResult[]> {
  const { data } = await axios.get<NominatimPlaceResult[]>(NOMINATIM_SEARCH_URL, {
    params: {
      format: 'json',
      q: query,
      limit: String(limit),
      addressdetails: '1',
    },
    headers: {
      'Accept-Language': 'id,en',
    },
    signal,
    timeout: 8000,
  })
  return Array.isArray(data) ? data : []
}
