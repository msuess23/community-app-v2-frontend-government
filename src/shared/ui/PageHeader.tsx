import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

export interface PageHeaderProps {
  actions?: ReactNode
  className?: string
  description?: ReactNode
  eyebrow?: ReactNode
  headingId?: string
  title: ReactNode
}

export function PageHeader({
  actions,
  className,
  description,
  eyebrow,
  headingId,
  title,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className="text-3xl font-bold tracking-tight text-on-surface sm:text-4xl"
          id={headingId}
        >
          {title}
        </h1>
        {description ? (
          <div className="max-w-3xl text-base leading-7 text-on-surface-variant sm:text-lg">
            {description}
          </div>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
