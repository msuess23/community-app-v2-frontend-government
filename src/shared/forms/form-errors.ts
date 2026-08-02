import type { FieldError, FieldErrors, FieldValues } from 'react-hook-form'

import type { FormErrorSummaryItem } from '@/shared/ui/FormErrorSummary'

function isFieldError(value: unknown): value is FieldError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  )
}

function collectNestedErrors(
  value: unknown,
  path: string[],
): FormErrorSummaryItem[] {
  if (isFieldError(value)) {
    return [
      {
        fieldName: path.length > 0 ? path.join('.') : undefined,
        message: value.message,
      },
    ]
  }

  if (typeof value !== 'object' || value === null) {
    return []
  }

  return Object.entries(value).flatMap(([key, nestedValue]) =>
    collectNestedErrors(nestedValue, key === 'root' ? path : [...path, key]),
  )
}

export function getFormErrorSummary<TFieldValues extends FieldValues>(
  errors: FieldErrors<TFieldValues>,
): FormErrorSummaryItem[] {
  return collectNestedErrors(errors, [])
}
