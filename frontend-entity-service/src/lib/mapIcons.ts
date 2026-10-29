/**
 * @file mapIcons.ts
 * @description Dynamic Leaflet DivIcon factories with SVG teardrop Map Pins and deterministic color generation.
 * Generates uniform, crisp map markers with dynamic colors per entity type and status dots.
 */

import L from 'leaflet'
import type { EntityStatus } from '@/types/entity'

/**
 * Color palette definition for an entity category.
 */
export interface TypeColorPalette {
  readonly hex: string
  readonly ringRgba: string
}

/**
 * Curated color mappings for standard baseline entity types.
 */
const KNOWN_TYPE_COLORS: Record<string, TypeColorPalette> = {
  vehicle: { hex: '#2563eb', ringRgba: 'rgba(37, 99, 235, 0.35)' },
  iot_sensor: { hex: '#059669', ringRgba: 'rgba(5, 150, 105, 0.35)' },
  iot_device: { hex: '#0891b2', ringRgba: 'rgba(8, 145, 178, 0.35)' },
  facility: { hex: '#7c3aed', ringRgba: 'rgba(124, 58, 237, 0.35)' },
  drone: { hex: '#ea580c', ringRgba: 'rgba(234, 88, 12, 0.35)' },
}

/**
 * Vibrant, high-contrast color palette pool with colors strictly distinct from KNOWN_TYPE_COLORS.
 * Used to assign unique, non-colliding colors to custom entity types created by users.
 */
const DYNAMIC_COLOR_PALETTE: readonly TypeColorPalette[] = [
  { hex: '#e11d48', ringRgba: 'rgba(225, 29, 72, 0.35)' },    // Crimson Rose
  { hex: '#c026d3', ringRgba: 'rgba(192, 38, 211, 0.35)' },   // Fuchsia Magenta
  { hex: '#65a30d', ringRgba: 'rgba(101, 163, 13, 0.35)' },   // Lime Green
  { hex: '#ca8a04', ringRgba: 'rgba(202, 138, 4, 0.35)' },    // Amber Gold
  { hex: '#3730a3', ringRgba: 'rgba(55, 48, 163, 0.35)' },    // Deep Indigo
  { hex: '#db2777', ringRgba: 'rgba(219, 39, 119, 0.35)' },   // Hot Pink
  { hex: '#92400e', ringRgba: 'rgba(146, 64, 14, 0.35)' },    // Warm Bronze
  { hex: '#115e59', ringRgba: 'rgba(17, 94, 89, 0.35)' },     // Deep Forest Teal
  { hex: '#86198f', ringRgba: 'rgba(134, 25, 143, 0.35)' },   // Royal Plum
  { hex: '#3f6212', ringRgba: 'rgba(63, 98, 18, 0.35)' },     // Olive Green
  { hex: '#be123c', ringRgba: 'rgba(190, 18, 60, 0.35)' },    // Ruby Red
  { hex: '#4338ca', ringRgba: 'rgba(67, 56, 202, 0.35)' },    // Cobalt Blue
  { hex: '#a16207', ringRgba: 'rgba(161, 98, 7, 0.35)' },     // Ochre
  { hex: '#0f766e', ringRgba: 'rgba(15, 118, 110, 0.35)' },   // Dark Sea Green
  { hex: '#9d174d', ringRgba: 'rgba(157, 23, 77, 0.35)' },    // Berry
  { hex: '#15803d', ringRgba: 'rgba(21, 128, 61, 0.35)' },    // Kelly Green
]

/**
 * Registry tracking assigned colors for custom entity types so no two types share a color.
 */
const assignedCustomColors = new Map<string, TypeColorPalette>()

/**
 * Set of all lowercase hex colors currently in use (seeded with baseline type colors).
 */
const usedHexSet = new Set<string>(
  Object.values(KNOWN_TYPE_COLORS).map((palette) => palette.hex.toLowerCase())
)

/**
 * Color mapping for operational status indicator dots.
 */
const STATUS_DOT_COLOR: Record<EntityStatus, string> = {
  active: '#22c55e',       // Emerald green
  maintenance: '#f59e0b',  // Amber yellow
  inactive: '#94a3b8',     // Slate gray
}

/**
 * Fast 32-bit integer string hash (djb2-like variation) for deterministic starting slot selection.
 *
 * @param input - The normalized type string
 * @returns 32-bit positive integer hash
 */
function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  }
  return hash
}

/**
 * Converts HSL values into a hex string and rgba ring palette.
 * Used as an infinite fallback via the Golden Angle if all curated palette slots are occupied.
 */
function hslToPalette(h: number, s: number, l: number): TypeColorPalette {
  const sNorm = s / 100
  const lNorm = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sNorm * Math.min(lNorm, 1 - lNorm)
  const f = (n: number) =>
    lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const r = Math.round(255 * f(0))
  const g = Math.round(255 * f(8))
  const b = Math.round(255 * f(4))
  const toHex = (v: number) => v.toString(16).padStart(2, '0')
  return {
    hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
    ringRgba: `rgba(${r}, ${g}, ${b}, 0.35)`,
  }
}

/**
 * Finds the next unused color palette for a normalized custom type without mutating state.
 */
function resolveUnusedPalette(normalized: string): TypeColorPalette {
  const startIndex = hashString(normalized) % DYNAMIC_COLOR_PALETTE.length
  for (let offset = 0; offset < DYNAMIC_COLOR_PALETTE.length; offset += 1) {
    const candidate = DYNAMIC_COLOR_PALETTE[(startIndex + offset) % DYNAMIC_COLOR_PALETTE.length]
    if (!usedHexSet.has(candidate.hex.toLowerCase())) {
      return candidate
    }
  }

  // Fallback: Golden-angle hue stepping guarantees distinct colors beyond palette capacity
  let step = assignedCustomColors.size + 1
  while (step < 1000) {
    const hue = Math.round((hashString(normalized) + step * 137.508) % 360)
    const generated = hslToPalette(hue, 74, 42)
    if (!usedHexSet.has(generated.hex.toLowerCase())) {
      return generated
    }
    step += 1
  }

  return DYNAMIC_COLOR_PALETTE[startIndex]
}

/**
 * Checks whether a type string already has an established color (baseline or committed custom type).
 */
export function isKnownEntityType(type: string): boolean {
  const normalized = type.trim().toLowerCase()
  return Boolean(KNOWN_TYPE_COLORS[normalized]) || assignedCustomColors.has(normalized)
}

/**
 * Previews the color that a type string has or will receive upon creation,
 * without locking/consuming the color slot during intermediate form keystrokes.
 */
export function previewTypeColor(type: string): TypeColorPalette {
  const normalized = type.trim().toLowerCase()
  if (!normalized) {
    return KNOWN_TYPE_COLORS.vehicle
  }
  if (KNOWN_TYPE_COLORS[normalized]) {
    return KNOWN_TYPE_COLORS[normalized]
  }
  const existing = assignedCustomColors.get(normalized)
  if (existing) {
    return existing
  }
  return resolveUnusedPalette(normalized)
}

/**
 * Returns a unique color palette for any entity type string and commits the assignment
 * so no subsequent custom type will ever receive the same color.
 *
 * @param type - Entity type name (e.g. 'vehicle', 'sensor_gempa')
 * @returns Color palette with hex and rgba ring
 */
export function getTypeColor(type: string): TypeColorPalette {
  const normalized = type.trim().toLowerCase()
  if (!normalized) {
    return KNOWN_TYPE_COLORS.vehicle
  }
  if (KNOWN_TYPE_COLORS[normalized]) {
    return KNOWN_TYPE_COLORS[normalized]
  }
  const existing = assignedCustomColors.get(normalized)
  if (existing) {
    return existing
  }

  const chosen = resolveUnusedPalette(normalized)
  assignedCustomColors.set(normalized, chosen)
  usedHexSet.add(chosen.hex.toLowerCase())
  return chosen
}

/**
 * Pre-registers a list of entity types in deterministic sorted order so their unique color
 * assignments remain stable across data fetches and renders.
 */
export function registerEntityTypes(types: readonly string[]): void {
  const sorted = [...types].map((t) => t.trim().toLowerCase()).filter(Boolean).sort()
  for (const t of sorted) {
    getTypeColor(t)
  }
}

/**
 * Releases the custom color assignment for a deleted entity type so its color slot can be reused.
 */
export function unregisterEntityType(type: string): void {
  const normalized = type.trim().toLowerCase()
  const existing = assignedCustomColors.get(normalized)
  if (existing && !KNOWN_TYPE_COLORS[normalized]) {
    assignedCustomColors.delete(normalized)
    usedHexSet.delete(existing.hex.toLowerCase())
  }
}

/**
 * Creates a Leaflet DivIcon representing an entity on the map.
 * Renders an SVG teardrop pin with dynamic type-based fill, white stroke, and an operational status dot badge.
 *
 * @param type - Dynamic entity type name
 * @param status - Operational status (active, maintenance, inactive)
 * @param isSelected - Whether this entity is currently selected in the UI
 * @returns Custom Leaflet DivIcon
 */
export function createEntityMapIcon(
  type: string,
  status: EntityStatus,
  isSelected: boolean
): L.DivIcon {
  const palette = getTypeColor(type)
  const statusColor = STATUS_DOT_COLOR[status] ?? STATUS_DOT_COLOR.inactive
  const scaleTransform = isSelected ? 'scale(1.22) translateY(-3px)' : 'scale(1)'
  const dropShadow = isSelected
    ? `drop-shadow(0 0 8px ${palette.ringRgba}) drop-shadow(0 4px 6px rgba(15, 23, 42, 0.35))`
    : 'drop-shadow(0 3px 5px rgba(15, 23, 42, 0.3))'

  const html = `
    <div style="
      position: relative;
      width: 36px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: ${scaleTransform};
      filter: ${dropShadow};
      transition: transform 0.2s ease, filter 0.2s ease;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44" fill="none">
        <path
          d="M18 1.5C8.887 1.5 1.5 8.887 1.5 18C1.5 29.25 18 42.5 18 42.5C18 42.5 34.5 29.25 34.5 18C34.5 8.887 27.113 1.5 18 1.5Z"
          fill="${palette.hex}"
          stroke="#ffffff"
          stroke-width="2.5"
        />
        <circle cx="18" cy="17.5" r="6.5" fill="#ffffff" />
      </svg>
      <span style="
        position: absolute;
        top: 12px;
        right: 2px;
        width: 11px;
        height: 11px;
        border-radius: 9999px;
        background-color: ${statusColor};
        border: 2px solid #ffffff;
      "></span>
    </div>
  `

  return L.divIcon({
    className: 'custom-div-icon',
    html,
    iconSize: [36, 44],
    iconAnchor: [18, 42],
    popupAnchor: [0, -38],
  })
}

/**
 * Creates a distinct dashed red Leaflet DivIcon for currently picked coordinates.
 * Allows clear visual feedback when a user clicks the map or picks a place from search.
 *
 * @returns Custom Leaflet DivIcon for temporary picked coordinate marker
 */
export function createPickedCoordIcon(): L.DivIcon {
  const html = `
    <div style="
      position: relative;
      width: 34px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 3px 6px rgba(220, 38, 38, 0.4));
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 36 44" fill="none">
        <path
          d="M18 1.5C8.887 1.5 1.5 8.887 1.5 18C1.5 29.25 18 42.5 18 42.5C18 42.5 34.5 29.25 34.5 18C34.5 8.887 27.113 1.5 18 1.5Z"
          fill="#dc2626"
          stroke="#ffffff"
          stroke-width="2.5"
          stroke-dasharray="4 2"
        />
        <circle cx="18" cy="17.5" r="5.5" fill="#ffffff" />
      </svg>
    </div>
  `

  return L.divIcon({
    className: 'custom-div-icon',
    html,
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    popupAnchor: [0, -36],
  })
}
