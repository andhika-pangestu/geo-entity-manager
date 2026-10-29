/**
 * @file StatusBadge.tsx
 * @description Entity operational status badge with a colored indicator dot and border-only line styling.
 */

import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { EntityStatus } from '@/types/entity'

const STATUS_BADGE_VARIANT: Record<EntityStatus, NonNullable<BadgeProps['variant']>> = {
  active: 'success',
  maintenance: 'warning',
  inactive: 'muted',
}

const STATUS_DOT_CLASS: Record<EntityStatus, string> = {
  active: 'bg-success',
  maintenance: 'bg-warning',
  inactive: 'bg-muted-foreground',
}

const STATUS_LABEL: Record<EntityStatus, string> = {
  active: 'Active',
  maintenance: 'Maintenance',
  inactive: 'Inactive',
}

interface StatusBadgeProps {
  readonly status: EntityStatus
  readonly size?: BadgeProps['size']
}

export function StatusBadge({ status, size }: StatusBadgeProps) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]} size={size} className="bg-transparent">
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT_CLASS[status])} />
      {STATUS_LABEL[status]}
    </Badge>
  )
}
