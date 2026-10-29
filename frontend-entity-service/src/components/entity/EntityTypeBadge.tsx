/**
 * @file EntityTypeBadge.tsx
 * @description Entity type badge: clean border-only line styling with type-specific color outline (no fill).
 */

import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getTypeColor } from '@/lib/mapIcons'

interface EntityTypeBadgeProps {
  readonly type: string
  readonly size?: BadgeProps['size']
  readonly className?: string
}

export function EntityTypeBadge({ type, size = 'sm', className }: EntityTypeBadgeProps) {
  const { hex } = getTypeColor(type)

  return (
    <Badge
      variant="outline"
      size={size}
      className={cn('font-mono bg-transparent', className)}
      style={{ borderColor: hex, color: hex }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: hex }} />
      {type}
    </Badge>
  )
}
