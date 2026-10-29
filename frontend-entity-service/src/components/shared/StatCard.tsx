/**
 * @file StatCard.tsx
 * @description Compact metric block: pure border-only line with zero fill.
 */

import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const statCardVariants = cva(
  'flex flex-col items-center gap-0.5 rounded-lg border bg-transparent px-2 py-1.5 text-center transition-colors',
  {
    variants: {
      tone: {
        neutral: 'border-input text-foreground',
        success: 'border-success text-success',
        warning: 'border-warning text-warning',
        muted: 'border-input text-muted-foreground',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  }
)

interface StatCardProps extends VariantProps<typeof statCardVariants> {
  readonly label: string
  readonly value: number
  readonly className?: string
}

export function StatCard({ label, value, tone, className }: StatCardProps) {
  return (
    <div className={cn(statCardVariants({ tone }), className)}>
      <span className="text-2xs font-medium">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  )
}
