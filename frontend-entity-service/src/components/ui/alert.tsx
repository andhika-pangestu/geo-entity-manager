/**
 * @file Alert.tsx
 * @description Shadcn UI Alert primitive. Border-only tones; icon sits in column 1,
 * text in column 2, so no margins are needed for alignment.
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva(
  'grid grid-cols-[1rem_1fr] items-start gap-x-2 gap-y-1 rounded-lg border bg-background p-3 text-xs leading-4 [&>svg]:col-start-1 [&>svg]:row-start-1 [&>svg]:h-4 [&>svg]:w-4',
  {
    variants: {
      variant: {
        default: 'border-input text-foreground [&>svg]:text-muted-foreground',
        destructive: 'border-destructive text-destructive [&>svg]:text-destructive',
        warning: 'border-warning text-foreground [&>svg]:text-warning',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('col-start-2 font-semibold', className)} {...props} />
))
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('col-start-2', className)} {...props} />
))
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }

