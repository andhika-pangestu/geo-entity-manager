/**
 * @file PlaceSearchBox.tsx
 * @description Google Maps-style place search using OpenStreetMap Nominatim geocoding:
 * debounced autocomplete, fly-to and coordinate picking. Interactive elements use the
 * Button primitive; colors are theme tokens.
 */

import { useState, useEffect, useRef } from 'react'
import { Search, MapPin, Loader2, X } from 'lucide-react'
import { searchNominatimPlaces, type NominatimPlaceResult } from '@/api/axios'
import { useDebounce } from '@/hooks/useDebounce'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PlaceSearchBoxProps {
  /** Fired when a suggestion is chosen */
  readonly onSelectPlace: (lat: number, lng: number, label: string) => void
}

/** Milliseconds to debounce keystrokes before querying Nominatim */
const DEBOUNCE_DELAY_MS = 350
/** Minimum characters required to initiate an autocomplete request */
const MIN_QUERY_LENGTH = 2
/** Maximum suggestions requested per search */
const MAX_RESULTS = 6

export function PlaceSearchBox({ onSelectPlace }: PlaceSearchBoxProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimPlaceResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(query, DEBOUNCE_DELAY_MS)

  // Fetch autocomplete results when the debounced query updates
  useEffect(() => {
    const trimmed = debouncedQuery.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([])
      setIsOpen(false)
      return
    }

    const controller = new AbortController()

    const runSearch = async () => {
      setIsSearching(true)
      try {
        const data = await searchNominatimPlaces(trimmed, MAX_RESULTS, controller.signal)
        setResults(data)
        setIsOpen(true)
      } catch {
        // Aborted request or network error: keep the previous UI state
      } finally {
        setIsSearching(false)
      }
    }

    void runSearch()
    return () => controller.abort()
  }, [debouncedQuery])

  // Dismiss dropdown when clicking outside the component
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleChooseResult = (item: NominatimPlaceResult) => {
    const lat = parseFloat(item.lat)
    const lng = parseFloat(item.lon)

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      onSelectPlace(lat, lng, item.display_name)
    }

    setQuery(item.display_name.split(',')[0] ?? item.display_name)
    setIsOpen(false)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="pointer-events-auto relative w-72 sm:w-80">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          placeholder="Cari lokasi tempat (misal: Monas, Bandung)..."
          aria-label="Cari lokasi tempat"
          className="pl-9 pr-9 text-xs shadow-md"
        />
        {isSearching ? (
          <Loader2 className="absolute right-3 h-3.5 w-3.5 animate-spin text-primary" />
        ) : (
          query && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-1.5 h-6 w-6"
              onClick={handleClear}
              aria-label="Bersihkan pencarian tempat"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 top-10 z-50 flex max-h-64 flex-col gap-0.5 overflow-y-auto rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl">
          {results.map((item) => {
            const [primaryTitle, ...addressParts] = item.display_name.split(',')
            const secondaryAddress = addressParts.join(',').trim()

            return (
              <Button
                key={item.place_id}
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start gap-2.5 whitespace-normal px-2.5 py-2 text-left"
                onClick={() => handleChooseResult(item)}
              >
                <MapPin className="h-4 w-4 shrink-0 self-start text-primary" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs font-semibold text-foreground">
                    {primaryTitle}
                  </span>
                  {secondaryAddress && (
                    <span className="truncate text-2xs font-normal text-muted-foreground">
                      {secondaryAddress}
                    </span>
                  )}
                </span>
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
