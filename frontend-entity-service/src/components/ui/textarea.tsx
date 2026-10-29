/**
 * @file Textarea.tsx
 * @description Shadcn UI Textarea primitive. The `code` variant provides a clean monospace
 * font style matching the standard theme background and border.
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const textareaVariants = cva(
  'flex w-full rounded-lg border border-input px-3 py-2 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-background text-sm text-foreground placeholder:text-muted-foreground',
        code: 'bg-background font-mono text-xs text-foreground placeholder:text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(textareaVariants({ variant }), className)}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'
