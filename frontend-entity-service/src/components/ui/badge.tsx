/**
 * @file Badge.tsx
 * @description Generic Shadcn UI badge primitive. Border-only tones (no tinted fills).
 * Domain-specific badges (entity status/type) are composed in `components/shared/*`.
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border bg-transparent font-medium transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default: 'border-primary text-primary',
        success: 'border-success text-success',
        warning: 'border-warning text-warning',
        destructive: 'border-destructive text-destructive',
        muted: 'border-input text-muted-foreground',
        outline: 'border-border text-foreground',
      },
      size: {
        default: 'px-2 py-0.5 text-xs',
        sm: 'px-1.5 py-0.5 text-2xs',
        xs: 'px-1.5 py-0 text-3xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { badgeVariants }
