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

/** Renders the primary page heading, supporting actions and route-focus management. */
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
          <p className="text-primary text-sm font-semibold tracking-wide uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className="text-on-surface text-3xl font-bold tracking-tight sm:text-4xl"
          data-page-heading
          id={headingId}
          tabIndex={-1}
        >
          {title}
        </h1>
        {description ? (
          <div className="text-on-surface-variant max-w-3xl text-base leading-7 sm:text-lg">
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
