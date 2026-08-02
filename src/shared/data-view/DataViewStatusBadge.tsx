import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

export type DataViewStatusTone =
  | 'danger'
  | 'info'
  | 'neutral'
  | 'success'
  | 'warning'

export interface DataViewStatusBadgeProps {
  children: ReactNode
  className?: string
  tone?: DataViewStatusTone
}

const toneStyles: Record<DataViewStatusTone, string> = {
  danger: 'border-error bg-error-container text-on-error-container',
  info: 'border-primary bg-primary-container text-on-primary-container',
  neutral:
    'border-outline-variant bg-surface-container text-on-surface-variant',
  success:
    'border-tertiary bg-tertiary-container text-on-tertiary-container',
  warning:
    'border-secondary bg-secondary-container text-on-secondary-container',
}

/** Presents a compact status label whose meaning is not conveyed by color alone. */
export function DataViewStatusBadge({
  children,
  className,
  tone = 'neutral',
}: DataViewStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
