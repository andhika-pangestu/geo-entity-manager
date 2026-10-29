/**
 * @file entitySchema.ts
 * @description Zod validation schemas and utility parsers for Entity input forms.
 * Enforces coordinate boundaries (WGS 84), character limits, enum options, and JSON metadata parsing.
 */

import { z } from 'zod'

/**
 * Validation boundary constants conforming to WGS 84 geodetic standards.
 */
export const MIN_LATITUDE = -90.0
export const MAX_LATITUDE = 90.0
export const MIN_LONGITUDE = -180.0
export const MAX_LONGITUDE = 180.0

/**
 * Text length limits for entity attributes.
 */
export const MIN_NAME_LENGTH = 1
export const MAX_NAME_LENGTH = 100
export const MIN_TYPE_LENGTH = 2
export const MAX_TYPE_LENGTH = 50
export const MAX_DESC_LENGTH = 500

/**
 * Permitted operational status values.
 */
export const ENTITY_STATUS_OPTIONS = ['active', 'inactive', 'maintenance'] as const

/**
 * Client-side Zod validation schema for entity creation and modification forms.
 */
export const entityFormSchema = z.object({
  /** Name must be non-empty and within 100 characters */
  name: z
    .string()
    .trim()
    .min(MIN_NAME_LENGTH, { message: 'Nama entitas wajib diisi (minimal 1 karakter)' })
    .max(MAX_NAME_LENGTH, { message: 'Nama entitas maksimal 100 karakter' }),

  /** Dynamic entity type (e.g. vehicle, drone, iot_sensor, or custom user type) */
  type: z
    .string()
    .trim()
    .min(MIN_TYPE_LENGTH, { message: 'Tipe entitas minimal 2 karakter' })
    .max(MAX_TYPE_LENGTH, { message: 'Tipe entitas maksimal 50 karakter' }),

  /** Status must match one of the defined lifecycle values */
  status: z.enum(ENTITY_STATUS_OPTIONS, {
    errorMap: () => ({ message: 'Status harus salah satu dari: active, inactive, maintenance' }),
  }),

  /** Latitude must be within valid WGS 84 geodetic range [-90.0 .. 90.0] */
  latitude: z
    .number({ invalid_type_error: 'Latitude wajib berupa angka' })
    .min(MIN_LATITUDE, { message: 'Latitude minimal -90.0' })
    .max(MAX_LATITUDE, { message: 'Latitude maksimal 90.0' }),

  /** Longitude must be within valid WGS 84 geodetic range [-180.0 .. 180.0] */
  longitude: z
    .number({ invalid_type_error: 'Longitude wajib berupa angka' })
    .min(MIN_LONGITUDE, { message: 'Longitude minimal -180.0' })
    .max(MAX_LONGITUDE, { message: 'Longitude maksimal 180.0' }),

  /** Optional descriptive note */
  description: z
    .string()
    .max(MAX_DESC_LENGTH, { message: 'Deskripsi maksimal 500 karakter' })
    .optional()
    .nullable(),

  /** Raw JSON string for extensible domain-specific metadata */
  metadataRaw: z
    .string()
    .optional()
    .refine(
      (val) => {
        // Empty string is valid (will be parsed to empty object)
        if (!val || val.trim() === '') return true
        try {
          const parsed = JSON.parse(val)
          // Must evaluate to an object and not an array or null
          return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        } catch {
          return false
        }
      },
      { message: 'Metadata harus berupa objek JSON yang valid (contoh: {"speed": 50})' }
    ),
})

/**
 * Inferred TypeScript type for entity form data.
 */
export type EntityFormValues = z.infer<typeof entityFormSchema>

/**
 * Safely parses raw JSON string into an immutable key-value object.
 * Returns an empty object `{}` if the input is empty or nullish.
 *
 * @param raw - The raw JSON string from the textarea input
 * @returns Clean, new copy of the parsed key-value record
 */
export function parseMetadataJson(raw?: string): Record<string, unknown> {
  if (!raw || raw.trim() === '') {
    return {}
  }
  const parsed = JSON.parse(raw) as Record<string, unknown>
  return { ...parsed }
}
