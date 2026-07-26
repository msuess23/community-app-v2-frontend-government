import type { HTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

export type FormActionsProps = HTMLAttributes<HTMLDivElement>

export function FormActions({ className, ...props }: FormActionsProps) {
  return (
    <div
      {...props}
      className={cn(
        'flex flex-col gap-3 border-t border-outline-variant pt-5 sm:flex-row sm:items-center sm:justify-end',
        className,
      )}
    />
  )
}
