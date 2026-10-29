/**
 * @file utils.ts
 * @description Shared CSS class name composition utility for Tailwind and Shadcn UI.
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple CSS class values conditionally and resolves Tailwind CSS conflicts.
 * Uses `clsx` for conditional object/array evaluation and `twMerge` to eliminate duplicate classes.
 *
 * @param inputs - List of class names, conditionals, or objects
 * @returns Clean, deduplicated CSS class string
 *
 * @example
 * cn('px-2 py-1 text-sm', isActive && 'bg-blue-600 text-white', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
