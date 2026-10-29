/**
 * @file EmptyState.tsx
 * @description Centered empty-list placeholder (icon + title + description).
 */

import type { ReactNode } from 'react'

interface EmptyStateProps {
  readonly icon: ReactNode
  readonly title: string
  readonly description: string
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

