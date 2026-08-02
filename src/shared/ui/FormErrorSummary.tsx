import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react'

import { useFormFieldIdResolver } from '@/shared/forms/form-field-scope-context'
import { cn } from '@/shared/lib/cn'

export interface FormErrorSummaryItem {
  fieldId?: string
  fieldName?: string
  id?: string
  message: ReactNode
}

export interface FormErrorSummaryProps {
  className?: string
  errors: FormErrorSummaryItem[]
  focusKey?: number | string
  shouldFocus?: boolean
  title?: string
}

/** Summarizes submission errors and optionally receives focus for efficient correction. */
export function FormErrorSummary({
  className,
  errors,
  focusKey,
  shouldFocus = false,
  title = 'Bitte überprüfe die folgenden Angaben.',
}: FormErrorSummaryProps) {
  const resolveFieldId = useFormFieldIdResolver()
  const summaryRef = useRef<HTMLDivElement>(null)
  const previousErrorCountRef = useRef(0)
  const previousFocusKeyRef = useRef(focusKey)

  useEffect(() => {
    const becameVisible =
      previousErrorCountRef.current === 0 && errors.length > 0
    const submissionChanged = previousFocusKeyRef.current !== focusKey
    previousErrorCountRef.current = errors.length
    previousFocusKeyRef.current = focusKey

    if (
      !shouldFocus ||
      errors.length === 0 ||
      (!becameVisible && !submissionChanged)
    ) {
      return
    }

    // Defer focus until validation messages and their target controls are committed.
    const frame = window.requestAnimationFrame(() => {
      summaryRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [errors.length, focusKey, shouldFocus])

  if (errors.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'border-error bg-error-container text-on-error-container rounded-xl border p-4 outline-none',
        'focus-visible:ring-error focus-visible:ring-2 focus-visible:ring-offset-2',
        className,
      )}
      ref={summaryRef}
      role="alert"
      tabIndex={-1}
    >
      <p className="font-semibold">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5">
        {errors.map((error, index) => {
          const fieldId =
            error.fieldId ??
            (error.fieldName ? resolveFieldId(error.fieldName) : undefined)

          return (
            <li key={error.id ?? error.fieldName ?? fieldId ?? index}>
              {fieldId ? (
                <a
                  className="focus-visible:outline-error font-medium underline decoration-2 underline-offset-2 hover:no-underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                  href={`#${fieldId}`}
                  onClick={(event) => focusFormField(event, fieldId)}
                >
                  {error.message}
                </a>
              ) : (
                error.message
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Moves focus to a linked field without creating a hash navigation. */
function focusFormField(
  event: MouseEvent<HTMLAnchorElement>,
  fieldId: string,
): void {
  event.preventDefault()

  const target = document.getElementById(fieldId)
  const focusTarget =
    target instanceof HTMLElement && target.matches(focusableSelector)
      ? target
      : target?.querySelector<HTMLElement>(focusableSelector)

  focusTarget?.focus()
  focusTarget?.scrollIntoView?.({ block: 'center' })
}

const focusableSelector =
  'input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])'
