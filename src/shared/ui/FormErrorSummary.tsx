import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

export interface FormErrorSummaryItem {
  fieldId?: string
  id?: string
  message: ReactNode
}

export interface FormErrorSummaryProps {
  className?: string
  errors: FormErrorSummaryItem[]
  title?: string
}

export function FormErrorSummary({
  className,
  errors,
  title = 'Bitte überprüfe die folgenden Angaben.',
}: FormErrorSummaryProps) {
  if (errors.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'border-error bg-error-container text-on-error-container rounded-xl border p-4',
        className,
      )}
      role="alert"
    >
      <p className="font-semibold">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5">
        {errors.map((error, index) => (
          <li key={error.id ?? error.fieldId ?? index}>
            {error.fieldId ? (
              <a
                className="focus-visible:outline-error font-medium underline decoration-2 underline-offset-2 hover:no-underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                href={`#${error.fieldId}`}
              >
                {error.message}
              </a>
            ) : (
              error.message
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
