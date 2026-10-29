/**
 * @file FormField.tsx
 * @description Composed form field: label (+ optional hint) → control → validation error.
 * Spacing is internal via `gap-*`; the parent controls spacing between fields.
 */

import type { ReactNode } from 'react'
import { Label, type LabelProps } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  readonly label: string
  /** id of the control; wires the label for accessibility */
  readonly htmlFor?: string
  readonly error?: string
  /** Content aligned to the right of the label (e.g. a short tip) */
  readonly hint?: ReactNode
  readonly size?: LabelProps['size']
  readonly tone?: LabelProps['tone']
  readonly className?: string
  readonly children: ReactNode
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  size,
  tone,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor} size={size} tone={tone}>
          {label}
        </Label>
        {hint}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

