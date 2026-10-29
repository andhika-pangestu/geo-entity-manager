/**
 * @file useDebounce.ts
 * @description Custom React hook for debouncing fast-changing values (e.g. search inputs).
 */

import { useEffect, useState } from 'react'

/**
 * Delays updating the returned value until after a specified duration has elapsed
 * since the last time the input value changed.
 *
 * @template T - The type of value being debounced
 * @param value - The input value to debounce
 * @param delay - Milliseconds to wait before updating the debounced value
 * @returns The debounced value
 *
 * @example
 * const debouncedSearch = useDebounce(searchTerm, 300)
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Schedule update to debounced state after the specified delay
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clear timeout on value change or unmount to avoid stale updates
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
