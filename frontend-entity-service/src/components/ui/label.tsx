/**
 * @file Label.tsx
 * @description Official Shadcn UI Label primitive (@radix-ui/react-label) with
 * semantic size and tone variants so callers never hand-write font sizes/colors.
 */

import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const labelVariants = cva(
  'leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  {
    variants: {
      size: {
        default: 'text-xs font-semibold',
        sm: 'text-2xs font-medium',
      },
      tone: {
        default: 'text-foreground',
        muted: 'text-muted-foreground',
        primary: 'text-primary',
      },
    },
    defaultVariants: {
      size: 'default',
      tone: 'default',
    },
  }
)

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {}

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, size, tone, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants({ size, tone }), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { labelVariants }
