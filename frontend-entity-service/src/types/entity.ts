/**
 * @file entity.ts
 * @description Domain interfaces, API response envelopes, and repository contracts
 * for the Geo Entity Manager application.
 * All domain models adhere to immutable readonly semantics and strict WGS 84 coordinate order.
 */

/**
 * Operational lifecycle status of an entity.
 * - 'active': Fully functional and operational.
 * - 'inactive': Temporarily or permanently disabled.
 * - 'maintenance': Undergoing technical service or calibration.
 */
export type EntityStatus = 'active' | 'inactive' | 'maintenance'

/**
 * Core domain representation of a geospatial entity in the system.
 * Immutable data structure mapped directly from PostgreSQL `entities` table.
 */
export interface Entity {
  /** Unique UUID v4 identifier */
  readonly id: string
  /** Human-readable display name (1-100 characters) */
  readonly name: string
  /** Dynamic entity classification (e.g. 'vehicle', 'iot_sensor', 'drone', or user-defined) */
  readonly type: string
  /** Operational lifecycle status */
  readonly status: EntityStatus
  /** Latitude coordinate in decimal degrees [-90.0 .. 90.0] (WGS 84) */
  readonly latitude: number
  /** Longitude coordinate in decimal degrees [-180.0 .. 180.0] (WGS 84) */
  readonly longitude: number
  /** Optional descriptive note or operational context */
  readonly description: string | null
  /** Arbitrary domain-specific key-value telemetry/specs (JSONB) */
  readonly metadata: Record<string, unknown>
  /** ISO 8601 creation timestamp */
  readonly created_at: string
  /** ISO 8601 last update timestamp */
  readonly updated_at: string
}

/**
 * Data Transfer Object (DTO) for creating or updating an entity.
 */
export interface EntityInput {
  /** Name of the entity */
  readonly name: string
  /** Dynamic type name */
  readonly type: string
  /** Operational status */
  readonly status: EntityStatus
  /** Decimal latitude [-90.0 .. 90.0] */
  readonly latitude: number
  /** Decimal longitude [-180.0 .. 180.0] */
  readonly longitude: number
  /** Optional description text */
  readonly description?: string | null
  /** Optional JSON metadata object */
  readonly metadata?: Record<string, unknown>
}

/**
 * Filter parameters for querying entities from the backend.
 */
export interface EntityFilters {
  /** Filter by dynamic entity type name (or 'all' for unfiltered) */
  readonly type?: string
  /** Filter by operational status (or 'all' for unfiltered) */
  readonly status?: string
  /** Case-insensitive substring search for name and description */
  readonly search?: string
}

/**
 * Field-level validation error detail returned by backend validator.
 */
export interface ValidationErrorDetail {
  readonly field: string
  readonly issue: string
}

/**
 * Structured API error response payload.
 */
export interface ApiErrorDetail {
  readonly code: string
  readonly message: string
  readonly details: ValidationErrorDetail[]
}

/**
 * Standard generic API response envelope.
 */
export interface ApiResponse<T> {
  readonly success: boolean
  readonly message?: string
  readonly data?: T
  readonly error?: ApiErrorDetail
}

/**
 * Generic Repository abstraction for data access operations.
 * Decouples consumer components and store actions from HTTP transport details.
 */
export interface Repository<T, CreateDto, UpdateDto, Filters = Record<string, unknown>> {
  /** Retrieve all records matching the optional filter criteria */
  findAll(filters?: Filters): Promise<T[]>
  /** Create and persist a new entity record */
  create(data: CreateDto): Promise<T>
  /** Update an existing entity by its ID with partial or full DTO */
  update(id: string, data: UpdateDto): Promise<T>
  /** Permanently or soft-delete an entity by its ID */
  delete(id: string): Promise<void>
}
