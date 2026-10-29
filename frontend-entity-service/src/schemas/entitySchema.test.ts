/**
 * @file entitySchema.test.ts
 * @description Unit test suite for entity validation schema and JSON parser utilities.
 */

jest.mock('leaflet', () => ({
  divIcon: jest.fn(),
}))

import { entityFormSchema, parseMetadataJson } from './entitySchema'
import { getTypeColor, previewTypeColor } from '@/lib/mapIcons'

describe('entityFormSchema Validation Suite', () => {
  it('validates a complete valid geospatial entity payload', () => {
    const validInput = {
      name: 'Armada Truk Logistik A-01',
      type: 'vehicle',
      status: 'active' as const,
      latitude: -6.2087634,
      longitude: 106.845599,
      description: 'Kendaraan operasional rute Jakarta Pusat',
      metadataRaw: '{"speed_kmh": 60, "driver": "Budi"}',
    }

    const result = entityFormSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('accepts custom dynamic entity types', () => {
    const customTypeInput = {
      name: 'Stasiun Radar Cuaca Bandara',
      type: 'weather_radar_unit',
      status: 'maintenance' as const,
      latitude: -6.125556,
      longitude: 106.655833,
    }

    const result = entityFormSchema.safeParse(customTypeInput)
    expect(result.success).toBe(true)
  })

  it('rejects latitude outside WGS 84 [-90, 90] bounds', () => {
    const outOfBoundsLat = {
      name: 'Invalid Lat Entity',
      type: 'drone',
      status: 'active' as const,
      latitude: -95.123,
      longitude: 106.845,
    }

    const result = entityFormSchema.safeParse(outOfBoundsLat)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.latitude).toBeDefined()
    }
  })

  it('rejects longitude outside WGS 84 [-180, 180] bounds', () => {
    const outOfBoundsLng = {
      name: 'Invalid Lng Entity',
      type: 'drone',
      status: 'active' as const,
      latitude: -6.2,
      longitude: 185.0,
    }

    const result = entityFormSchema.safeParse(outOfBoundsLng)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.longitude).toBeDefined()
    }
  })

  it('rejects empty name or overly short type', () => {
    const invalidStrings = {
      name: '   ',
      type: 'a',
      status: 'active' as const,
      latitude: -6.2,
      longitude: 106.8,
    }

    const result = entityFormSchema.safeParse(invalidStrings)
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      expect(errors.name).toBeDefined()
      expect(errors.type).toBeDefined()
    }
  })

  it('rejects malformed JSON or array in metadataRaw', () => {
    const malformedJson = {
      name: 'Sensor IoT',
      type: 'iot_sensor',
      status: 'active' as const,
      latitude: -6.2,
      longitude: 106.8,
      metadataRaw: '[1, 2, 3]',
    }

    const result = entityFormSchema.safeParse(malformedJson)
    expect(result.success).toBe(false)
  })

  it('parses metadata JSON string into an immutable object copy', () => {
    const parsed = parseMetadataJson('{"battery": 95}')
    expect(parsed).toEqual({ battery: 95 })
    expect(parseMetadataJson('')).toEqual({})
  })

  it('assigns a unique new color to every newly added custom type without colliding with existing types', () => {
    const baselineTypes = ['vehicle', 'iot_sensor', 'iot_device', 'facility', 'drone']
    const seenHex = new Set<string>(baselineTypes.map((t) => getTypeColor(t).hex.toLowerCase()))
    expect(seenHex.size).toBe(baselineTypes.length)

    const customTypes = [
      'maritime_vessel',
      'weather_radar',
      'seismic_station',
      'solar_substation',
      'patrol_helicopter',
      'water_gate_sensor',
      'ambulance_unit',
      'fire_truck',
      'telecom_tower',
      'railway_locomotive',
    ]

    for (const customType of customTypes) {
      const previewed = previewTypeColor(customType)
      expect(seenHex.has(previewed.hex.toLowerCase())).toBe(false)

      const assigned = getTypeColor(customType)
      expect(assigned.hex).toBe(previewed.hex)
      expect(seenHex.has(assigned.hex.toLowerCase())).toBe(false)
      seenHex.add(assigned.hex.toLowerCase())

      // Subsequent calls for the same type return the exact same color
      expect(getTypeColor(customType).hex).toBe(assigned.hex)
    }
  })
})
